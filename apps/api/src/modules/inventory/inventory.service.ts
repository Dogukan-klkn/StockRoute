import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma, TransactionType } from '@prisma/client';
import { InventoryGateway } from '../../api/gateways/inventory.gateway';
import type { AdjustInventoryDto } from '../../application/dto/inventory/adjust-inventory.dto';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { TenantContextService } from '../../infrastructure/tenant/tenant-context.service';

/**
 * `findAll` için opsiyonel liste filtreleri.
 * `branchId` tek şubeye daraltır; `lowStock` true ise yalnızca
 * `quantity <= minThreshold` olan (düşük stok) kayıtlar döner.
 */
export interface FindAllInventoryFilters {
  branchId?: string;
  lowStock?: boolean;
}

/** İlişkili ürün ve şube bilgisiyle birlikte dönen envanter kaydı. */
export type InventoryWithRelations = Prisma.InventoryGetPayload<{
  include: { product: true; branch: true };
}>;

/**
 * Envanter (Inventory) iş kuralları (Application katmanı).
 *
 * Şube bazlı stok görünümünü ve audit trail'li manuel stok düzeltmeyi sağlar
 * (bkz. plan §9.5). Controller iş kuralı içermez; kural ve veri erişimi bu
 * katmandadır (bkz. plan §15 — katman disiplini).
 *
 * NOT (tenant izolasyonu): Bu servisin çağrıldığı tüm endpoint'ler `JwtAuthGuard`
 * ile korunur; yani istek boyunca aktif bir `tenantId` bağlamı vardır. Prisma
 * Client Extension bu bağlamı okuyup sorgulara otomatik `where: { tenantId }`
 * ekler ve `create`/`upsert` sırasında `tenantId`'yi atar. Bu yüzden buradaki
 * sorgulara **manuel `tenantId` verilmez** — yalın yazılır (bkz. plan §6.1,
 * tenant.extension.ts).
 */
@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: InventoryGateway,
    private readonly tenantContext: TenantContextService,
  ) {}

  /**
   * Aktif tenant'ın envanter kayıtlarını ilişkili ürün ve şube bilgisiyle döner.
   * `branchId` tek şubeye daraltır; `lowStock` true ise yalnızca düşük stok
   * (`quantity <= minThreshold`) kayıtları döner — karşılaştırma, Prisma field
   * reference ile veritabanı tarafında kolonlar arası yapılır.
   */
  async findAll(filters: FindAllInventoryFilters = {}): Promise<InventoryWithRelations[]> {
    const where: Prisma.InventoryWhereInput = {};

    if (filters.branchId) {
      where.branchId = filters.branchId;
    }

    if (filters.lowStock) {
      where.quantity = { lte: this.prisma.client.inventory.fields.minThreshold };
    }

    return this.prisma.client.inventory.findMany({
      where,
      include: { product: true, branch: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Envanter kaydının düşük stok eşiğini (`minThreshold`) günceller.
   *
   * Bu bir **ayar** değişikliğidir, stok hareketi değil: `quantity` değişmez ve
   * bilinçli olarak `InventoryLog` yazılmaz (audit trail stok hareketleri
   * içindir — bkz. `adjustInventory`). Kayıt aktif tenant kapsamında aranır;
   * extension `where`'e `tenantId` eklediğinden başka tenant'ın kaydı bulunamaz.
   *
   * @param id           Envanter kaydının kimliği (cuid).
   * @param minThreshold Yeni eşik değeri (negatif olamaz — DTO doğrular).
   */
  async updateThreshold(id: string, minThreshold: number): Promise<InventoryWithRelations> {
    const existing = await this.prisma.client.inventory.findFirst({ where: { id } });

    if (!existing) {
      throw new NotFoundException('Envanter kaydı bulunamadı.');
    }

    return this.prisma.client.inventory.update({
      where: { id },
      data: { minThreshold },
      include: { product: true, branch: true },
    });
  }

  /**
   * Manuel stok düzeltmesi yapar ve audit trail yazar (bkz. plan §9.5).
   *
   * Akış:
   *  1. Şube ve ürün, tenant kapsamında doğrulanır (yoksa 404). Bu kontrol
   *     yalnızca kullanıcı deneyimi için değil, izolasyon için de gereklidir:
   *     başka bir tenant'ın `branchId`/`productId` değeri FK düzeyinde geçerli
   *     olduğundan, doğrulamasız upsert çapraz-tenant envanter kaydı üretebilirdi.
   *  2. Envanter kaydı `upsert` ile bulunur; yoksa 0 stokla oluşturulur.
   *  3. Aynı transaction içinde `Inventory.quantity` güncellenir **ve** bir
   *     `InventoryLog` satırı (`type: MANUAL_ADJUSTMENT`) yazılır — ikisi ya
   *     birlikte başarılı olur ya da birlikte geri alınır.
   *
   * Sonuç stok negatife düşemez (bkz. plan §7.1 — negatif stok engeli) → 400.
   *
   * @param userId İşlemi yapan kullanıcının kimliği (JWT'den, `@CurrentUser()`).
   * @param dto    Düzeltme isteği (`branchId`, `productId`, `quantity`, `reason`).
   */
  async adjustInventory(userId: string, dto: AdjustInventoryDto): Promise<InventoryWithRelations> {
    const [branch, product] = await Promise.all([
      this.prisma.client.branch.findFirst({ where: { id: dto.branchId } }),
      this.prisma.client.product.findFirst({ where: { id: dto.productId } }),
    ]);

    if (!branch) {
      throw new NotFoundException('Şube bulunamadı.');
    }
    if (!product) {
      throw new NotFoundException('Ürün bulunamadı.');
    }

    const adjusted = await this.prisma.client.$transaction(async (tx) => {
      // `tenantId` extension tarafından hem `where`'e hem `create` verisine
      // uygulanır; derleyici bunu bilmediği için create verisini `tenantId`
      // hariç tipleyip öyle veriyoruz (bkz. tenant.extension.ts).
      const createData: Omit<Prisma.InventoryUncheckedCreateInput, 'tenantId'> = {
        branchId: dto.branchId,
        productId: dto.productId,
        quantity: 0,
      };

      const current = await tx.inventory.upsert({
        where: {
          branchId_productId: { branchId: dto.branchId, productId: dto.productId },
        },
        update: {},
        create: createData as Prisma.InventoryUncheckedCreateInput,
      });

      const previousQuantity = current.quantity;
      const newQuantity = previousQuantity + dto.quantity;

      if (newQuantity < 0) {
        throw new BadRequestException(
          `Yetersiz stok: mevcut ${previousQuantity}, istenen değişim ${dto.quantity}. Stok negatife düşürülemez.`,
        );
      }

      const inventory = await tx.inventory.update({
        where: { id: current.id },
        data: { quantity: newQuantity },
        include: { product: true, branch: true },
      });

      const logData: Omit<Prisma.InventoryLogUncheckedCreateInput, 'tenantId'> = {
        branchId: dto.branchId,
        productId: dto.productId,
        userId,
        type: TransactionType.MANUAL_ADJUSTMENT,
        quantityChange: dto.quantity,
        previousQuantity,
        newQuantity,
        reason: dto.reason,
      };

      await tx.inventoryLog.create({
        data: logData as Prisma.InventoryLogUncheckedCreateInput,
      });

      return inventory;
    });

    // Olay, transaction commit edildikten SONRA yayınlanır (rollback'te yanlış
    // olay gitmesin). Yayın "best-effort"tür: hata iş akışını kırmaz, loglanır.
    // `tenantId` payload'a konmaz; yalnızca room yönlendirmesi için kullanılır.
    try {
      const tenantId = this.tenantContext.getTenantId();
      if (tenantId) {
        this.gateway.emitInventoryUpdated(tenantId, {
          branchId: dto.branchId,
          productId: dto.productId,
          quantity: adjusted.quantity,
        });
      } else {
        this.logger.warn('Tenant bağlamı yok; inventory:updated yayınlanmadı.');
      }
    } catch (error) {
      this.logger.warn(
        `inventory:updated yayınlanamadı: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return adjusted;
  }
}

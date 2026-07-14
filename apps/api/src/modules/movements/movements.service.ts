import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MovementStatus, Prisma, TransactionType, UserRole } from '@prisma/client';
import type { CreateMovementDto } from '../../application/dto/movements/create-movement.dto';
import type { GetMovementsFilterDto } from '../../application/dto/movements/get-movements-filter.dto';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

/** Kalemleriyle birlikte dönen stok hareketi. */
export type MovementWithItems = Prisma.StockMovementGetPayload<{
  include: { items: true };
}>;

/** Liste görünümü: kalemler + kaynak/hedef şube bilgisi. */
export type MovementListItem = Prisma.StockMovementGetPayload<{
  include: { items: true; sourceBranch: true; destinationBranch: true };
}>;

/** Detay görünümü: ürünlü kalemler, şubeler ve tüm aktör kullanıcılar. */
export type MovementDetail = Prisma.StockMovementGetPayload<{
  include: {
    items: { include: { product: true } };
    sourceBranch: true;
    destinationBranch: true;
    requestedBy: true;
    approvedBy: true;
    shippedBy: true;
    receivedBy: true;
  };
}>;

/**
 * Şubeler arası transfer (StockMovement) iş akışı — Application katmanı.
 *
 * Durum makinesi (bkz. plan §9.6):
 *
 *   PENDING → APPROVED → IN_TRANSIT → RECEIVED
 *   PENDING → REJECTED
 *   PENDING | APPROVED → CANCELLED
 *
 * Stok, yalnızca `ship` (kaynaktan düşüm, TRANSFER_OUT) ve `receive`
 * (hedefe ekleme, TRANSFER_IN) adımlarında ve tek transaction içinde
 * hareket eder; her stok değişimi `InventoryLog` satırıyla izlenir.
 *
 * NOT (tenant izolasyonu): Bu servisin çağrıldığı tüm endpoint'ler `JwtAuthGuard`
 * ile korunur; Prisma Client Extension sorgulara otomatik `where: { tenantId }`
 * ekler ve create/upsert verisine `tenantId` atar. Bu yüzden buradaki sorgulara
 * **manuel `tenantId` verilmez** (bkz. plan §6.1, tenant.extension.ts).
 */
@Injectable()
export class MovementsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Yeni transfer talebi oluşturur (`PENDING`).
   *
   * İş kuralı: kaynak ve hedef şube aynı olamaz → 400.
   *
   * @param dto    Talep gövdesi (şubeler, not, kalemler).
   * @param userId Talebi oluşturan kullanıcı (JWT'den, `requestedById`).
   */
  async create(dto: CreateMovementDto, userId: string): Promise<MovementWithItems> {
    if (dto.sourceBranchId === dto.destinationBranchId) {
      throw new BadRequestException('Kaynak ve hedef şube aynı olamaz');
    }

    // Çapraz tenant referansını engelle (Gün 12 bulgusu): FK'lar DB seviyesinde
    // yalnızca kaydın varlığını denetler, tenant'ını denetlemez. Şube ve ürünler
    // aktif tenant kapsamında aranır; extension sorgulara `tenantId` eklediğinden
    // başka tenant'ın kaydı "bulunamaz" ve istek 400 ile reddedilir.
    const [sourceBranch, destinationBranch, products] = await Promise.all([
      this.prisma.client.branch.findUnique({ where: { id: dto.sourceBranchId } }),
      this.prisma.client.branch.findUnique({ where: { id: dto.destinationBranchId } }),
      Promise.all(
        dto.items.map((i) => this.prisma.client.product.findUnique({ where: { id: i.productId } })),
      ),
    ]);

    if (!sourceBranch || !destinationBranch || products.some((p) => p === null)) {
      throw new BadRequestException('Kaynak/hedef şube veya ürün bulunamadı');
    }

    // `tenantId` extension tarafından create verisine atanır; derleyici bunu
    // bilmediği için veriyi `tenantId` hariç tipleyip öyle veriyoruz.
    const createData: Omit<Prisma.StockMovementUncheckedCreateInput, 'tenantId'> = {
      sourceBranchId: dto.sourceBranchId,
      destinationBranchId: dto.destinationBranchId,
      note: dto.note,
      status: MovementStatus.PENDING,
      requestedById: userId,
      items: {
        create: dto.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      },
    };

    const movement = await this.prisma.client.stockMovement.create({
      data: createData as Prisma.StockMovementUncheckedCreateInput,
      include: { items: true },
    });

    // TODO(day13): emit 'movement:created' — payload: { movement }

    return movement;
  }

  /**
   * Aktif tenant'ın transfer hareketlerini listeler (en yeni önce).
   * `status` tek duruma daraltır; `branchId` şubenin kaynak **veya** hedef
   * olduğu hareketleri döner.
   */
  async findAll(filter: GetMovementsFilterDto): Promise<MovementListItem[]> {
    const where: Prisma.StockMovementWhereInput = {};

    if (filter.status) {
      where.status = filter.status;
    }

    if (filter.branchId) {
      where.OR = [{ sourceBranchId: filter.branchId }, { destinationBranchId: filter.branchId }];
    }

    return this.prisma.client.stockMovement.findMany({
      where,
      include: { items: true, sourceBranch: true, destinationBranch: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Tek hareketi tüm ilişkileriyle döner; tenant kapsamında yoksa 404. */
  async findOne(id: string): Promise<MovementDetail> {
    const movement = await this.prisma.client.stockMovement.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        sourceBranch: true,
        destinationBranch: true,
        requestedBy: true,
        approvedBy: true,
        shippedBy: true,
        receivedBy: true,
      },
    });

    if (!movement) {
      throw new NotFoundException('Stok hareketi bulunamadı.');
    }

    return movement;
  }

  /**
   * Talebi onaylar: `PENDING → APPROVED`.
   * @param userId Onaylayan yetkili (JWT'den, `approvedById`).
   */
  async approve(id: string, userId: string): Promise<MovementWithItems> {
    const movement = await this.getMovementOrThrow(id);

    if (movement.status !== MovementStatus.PENDING) {
      throw new BadRequestException('Bu durumdaki hareket onaylanamaz');
    }

    const updated = await this.prisma.client.stockMovement.update({
      where: { id },
      data: {
        status: MovementStatus.APPROVED,
        approvedById: userId,
        approvedAt: new Date(),
      },
      include: { items: true },
    });

    // TODO(day13): emit 'movement:statusChanged' — payload: { movementId: id, status: 'APPROVED' }

    return updated;
  }

  /**
   * Talebi reddeder: `PENDING → REJECTED`. Stok değişmez.
   * @param userId Reddeden yetkili (JWT'den, `approvedById` alanına yazılır).
   */
  async reject(id: string, userId: string): Promise<MovementWithItems> {
    const movement = await this.getMovementOrThrow(id);

    if (movement.status !== MovementStatus.PENDING) {
      throw new BadRequestException('Bu durumdaki hareket reddedilemez');
    }

    const updated = await this.prisma.client.stockMovement.update({
      where: { id },
      data: {
        status: MovementStatus.REJECTED,
        approvedById: userId,
        approvedAt: new Date(),
      },
      include: { items: true },
    });

    // TODO(day13): emit 'movement:statusChanged' — payload: { movementId: id, status: 'REJECTED' }

    return updated;
  }

  /**
   * Talebi iptal eder: `PENDING | APPROVED → CANCELLED`. Stok değişmez
   * (stok yalnızca `ship` ile düştüğünden iptal noktasında geri alınacak
   * bir hareket yoktur).
   *
   * Yetki: yalnızca talebi oluşturan kullanıcı veya `FIRM_ADMIN` iptal
   * edebilir → aksi halde 403 (bkz. plan §9.6).
   */
  async cancel(id: string, userId: string, userRole: UserRole): Promise<MovementWithItems> {
    const movement = await this.getMovementOrThrow(id);

    if (movement.status !== MovementStatus.PENDING && movement.status !== MovementStatus.APPROVED) {
      throw new BadRequestException('Bu durumdaki hareket iptal edilemez');
    }

    if (movement.requestedById !== userId && userRole !== UserRole.FIRM_ADMIN) {
      throw new ForbiddenException(
        'Bu hareketi yalnızca talebi oluşturan kullanıcı veya firma yöneticisi iptal edebilir.',
      );
    }

    const updated = await this.prisma.client.stockMovement.update({
      where: { id },
      data: { status: MovementStatus.CANCELLED },
      include: { items: true },
    });

    // TODO(day13): emit 'movement:statusChanged' — payload: { movementId: id, status: 'CANCELLED' }

    return updated;
  }

  /**
   * Sevk eder: `APPROVED → IN_TRANSIT` ve kaynak şubeden stok düşer.
   *
   * KRİTİK: Durum güncellemesi, her kalem için stok düşümü ve `InventoryLog`
   * (TRANSFER_OUT) yazımı tek `$transaction` içindedir — herhangi bir kalemde
   * stok kaydı yoksa ya da stok yetersizse tüm işlem geri alınır; kısmi sevk
   * oluşmaz (bkz. plan §9.6).
   *
   * @param userId Sevk eden kullanıcı (JWT'den, `shippedById`).
   */
  async ship(id: string, userId: string): Promise<MovementWithItems> {
    return this.prisma.client.$transaction(async (tx) => {
      const movement = await tx.stockMovement.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!movement) {
        throw new NotFoundException('Stok hareketi bulunamadı.');
      }
      if (movement.status !== MovementStatus.APPROVED) {
        throw new BadRequestException('Bu durumdaki hareket sevk edilemez');
      }

      const updated = await tx.stockMovement.update({
        where: { id },
        data: {
          status: MovementStatus.IN_TRANSIT,
          shippedById: userId,
          shippedAt: new Date(),
        },
        include: { items: true },
      });

      for (const item of movement.items) {
        const inventory = await tx.inventory.findUnique({
          where: {
            branchId_productId: {
              branchId: movement.sourceBranchId,
              productId: item.productId,
            },
          },
        });

        if (!inventory) {
          throw new BadRequestException(`Kaynak şubede ${item.productId} için stok kaydı yok`);
        }
        if (inventory.quantity < item.quantity) {
          throw new BadRequestException(`Yetersiz stok: ${item.productId}`);
        }

        const previousQuantity = inventory.quantity;
        const newQuantity = previousQuantity - item.quantity;

        await tx.inventory.update({
          where: { id: inventory.id },
          data: { quantity: newQuantity },
        });

        const logData: Omit<Prisma.InventoryLogUncheckedCreateInput, 'tenantId'> = {
          branchId: movement.sourceBranchId,
          productId: item.productId,
          userId,
          type: TransactionType.TRANSFER_OUT,
          quantityChange: -item.quantity,
          previousQuantity,
          newQuantity,
          reason: `Transfer #${movement.id}`,
        };

        await tx.inventoryLog.create({
          data: logData as Prisma.InventoryLogUncheckedCreateInput,
        });

        // TODO(day13): emit 'inventory:updated' — payload: { branchId: movement.sourceBranchId, productId: item.productId, quantity: newQuantity }
      }

      // TODO(day13): emit 'movement:statusChanged' — payload: { movementId: id, status: 'IN_TRANSIT' }

      return updated;
    });
  }

  /**
   * Teslim alır: `IN_TRANSIT → RECEIVED` ve hedef şubeye stok eklenir.
   *
   * KRİTİK: Durum güncellemesi, her kalem için hedef envanterin `upsert`'ü
   * (kayıt yoksa `minThreshold: 0` ile oluşturulur) ve `InventoryLog`
   * (TRANSFER_IN) yazımı tek `$transaction` içindedir — ya tamamı işlenir
   * ya da tamamı geri alınır (bkz. plan §9.6).
   *
   * @param userId Teslim alan kullanıcı (JWT'den, `receivedById`).
   */
  async receive(id: string, userId: string): Promise<MovementWithItems> {
    return this.prisma.client.$transaction(async (tx) => {
      const movement = await tx.stockMovement.findUnique({
        where: { id },
        include: { items: true },
      });

      if (!movement) {
        throw new NotFoundException('Stok hareketi bulunamadı.');
      }
      if (movement.status !== MovementStatus.IN_TRANSIT) {
        throw new BadRequestException('Bu durumdaki hareket teslim alınamaz');
      }

      const updated = await tx.stockMovement.update({
        where: { id },
        data: {
          status: MovementStatus.RECEIVED,
          receivedById: userId,
          receivedAt: new Date(),
        },
        include: { items: true },
      });

      for (const item of movement.items) {
        const existing = await tx.inventory.findUnique({
          where: {
            branchId_productId: {
              branchId: movement.destinationBranchId,
              productId: item.productId,
            },
          },
        });

        const previousQuantity = existing?.quantity ?? 0;
        const newQuantity = previousQuantity + item.quantity;

        const createData: Omit<Prisma.InventoryUncheckedCreateInput, 'tenantId'> = {
          branchId: movement.destinationBranchId,
          productId: item.productId,
          quantity: item.quantity,
          minThreshold: 0,
        };

        await tx.inventory.upsert({
          where: {
            branchId_productId: {
              branchId: movement.destinationBranchId,
              productId: item.productId,
            },
          },
          update: { quantity: { increment: item.quantity } },
          create: createData as Prisma.InventoryUncheckedCreateInput,
        });

        const logData: Omit<Prisma.InventoryLogUncheckedCreateInput, 'tenantId'> = {
          branchId: movement.destinationBranchId,
          productId: item.productId,
          userId,
          type: TransactionType.TRANSFER_IN,
          quantityChange: item.quantity,
          previousQuantity,
          newQuantity,
          reason: `Transfer #${movement.id}`,
        };

        await tx.inventoryLog.create({
          data: logData as Prisma.InventoryLogUncheckedCreateInput,
        });

        // TODO(day13): emit 'inventory:updated' — payload: { branchId: movement.destinationBranchId, productId: item.productId, quantity: newQuantity }
      }

      // TODO(day13): emit 'movement:statusChanged' — payload: { movementId: id, status: 'RECEIVED' }

      return updated;
    });
  }

  /** Hareketi tenant kapsamında getirir; yoksa 404 fırlatır. */
  private async getMovementOrThrow(id: string) {
    const movement = await this.prisma.client.stockMovement.findUnique({ where: { id } });

    if (!movement) {
      throw new NotFoundException('Stok hareketi bulunamadı.');
    }

    return movement;
  }
}

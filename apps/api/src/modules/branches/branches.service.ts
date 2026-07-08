import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type Branch } from '@prisma/client';
import type { CreateBranchDto } from '../../application/dto/branches/create-branch.dto';
import type { UpdateBranchDto } from '../../application/dto/branches/update-branch.dto';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

/**
 * Şube (Branch) iş kuralları (Application katmanı).
 *
 * `Branch` domaini için CRUD operasyonlarını sağlar. Controller iş kuralı
 * içermez; kural ve veri erişimi bu katmandadır (bkz. plan §15 — katman disiplini).
 *
 * NOT (tenant izolasyonu): Bu servisin çağrıldığı tüm endpoint'ler `JwtAuthGuard`
 * ile korunur; yani istek boyunca aktif bir `tenantId` bağlamı vardır. Prisma
 * Client Extension bu bağlamı okuyup sorgulara otomatik `where: { tenantId }`
 * ekler ve `create` sırasında `tenantId`'yi atar. Bu yüzden buradaki sorgulara
 * **manuel `tenantId` verilmez** — yalın yazılır (bkz. plan §6.1, tenant.extension.ts).
 */
@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Yeni şube oluşturur. `tenantId` extension tarafından atanır.
   * Şube kodu tenant içinde benzersizdir; çakışırsa 409 döner
   * (bkz. §7 — `@@unique([tenantId, code])`).
   */
  async create(dto: CreateBranchDto): Promise<Branch> {
    // `tenantId` extension tarafından çalışma zamanında atanır; derleyici bunu
    // bilmediği için zorunlu görür. Bu yüzden create verisini `tenantId` hariç
    // tipleyip öyle veriyoruz (bkz. tenant.extension.ts — injectTenantIntoData).
    const data: Omit<Prisma.BranchUncheckedCreateInput, 'tenantId'> = {
      name: dto.name,
      code: dto.code,
      address: dto.address,
      city: dto.city,
      phone: dto.phone,
      isActive: dto.isActive,
    };

    try {
      return await this.prisma.client.branch.create({
        data: data as Prisma.BranchUncheckedCreateInput,
      });
    } catch (error) {
      throw this.mapKnownErrors(error);
    }
  }

  /**
   * Aktif tenant'a ait tüm şubeleri döner. Extension `tenantId` filtresini
   * otomatik eklediği için `where` verilmez; sadece sıralama uygulanır.
   */
  async findAll(): Promise<Branch[]> {
    return this.prisma.client.branch.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Tek bir şubeyi id ile döner. Extension sorguyu tenant'a kısıtlar; başka bir
   * tenant'ın şubesi (ya da olmayan id) sonuç döndürmez → 404.
   */
  async findOne(id: string): Promise<Branch> {
    const branch = await this.prisma.client.branch.findFirst({
      where: { id },
    });

    if (!branch) {
      throw new NotFoundException('Şube bulunamadı.');
    }

    return branch;
  }

  /**
   * Şubeyi kısmen günceller. Önce varlığı (ve tenant kapsamı) doğrulanır, sonra
   * güncellenir. Kod çakışması olursa 409 döner.
   */
  async update(id: string, dto: UpdateBranchDto): Promise<Branch> {
    // Var olmayan / başka tenant'a ait id için P2025 yerine anlaşılır 404 verelim.
    await this.findOne(id);

    try {
      return await this.prisma.client.branch.update({
        where: { id },
        data: {
          name: dto.name,
          code: dto.code,
          address: dto.address,
          city: dto.city,
          phone: dto.phone,
          isActive: dto.isActive,
        },
      });
    } catch (error) {
      throw this.mapKnownErrors(error);
    }
  }

  /**
   * Şubeyi siler. Önce varlığı (ve tenant kapsamı) doğrulanır.
   */
  async remove(id: string): Promise<Branch> {
    await this.findOne(id);
    return this.prisma.client.branch.delete({
      where: { id },
    });
  }

  /**
   * Bilinen Prisma hatalarını uygun HTTP istisnalarına çevirir.
   * - P2002: benzersizlik ihlali (tenant içi şube kodu) → 409
   * Diğer hatalar olduğu gibi yükseltilir (global exception filter ele alır).
   */
  private mapKnownErrors(error: unknown): Error {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return new ConflictException('Bu şube kodu firmada zaten kullanımda.');
    }
    return error instanceof Error ? error : new Error('Bilinmeyen bir hata oluştu.');
  }
}

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import type { CreateUserDto } from '../../application/dto/users/create-user.dto';
import type { UpdateUserDto } from '../../application/dto/users/update-user.dto';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

/** bcrypt tuz (salt) maliyeti — AuthService ile aynı değer (güvenlik/performans dengesi). */
const BCRYPT_SALT_ROUNDS = 10;

/** Yanıtlarda dönülen, şifre alanı çıkarılmış güvenli kullanıcı görünümü. */
export type SafeUser = Omit<User, 'passwordHash'>;

/**
 * Kullanıcı (User) iş kuralları (Application katmanı).
 *
 * `User` domaini için CRUD operasyonlarını sağlar (§9.3). Controller iş kuralı
 * içermez; kural ve veri erişimi bu katmandadır (bkz. plan §15 — katman disiplini).
 * Yalnızca FIRM_ADMIN bu servisi tetikleyen endpoint'lere erişebilir (bkz. §8).
 *
 * NOT (tenant izolasyonu): Bu servisin çağrıldığı tüm endpoint'ler `JwtAuthGuard`
 * ile korunur; istek boyunca aktif bir `tenantId` bağlamı vardır. Prisma Client
 * Extension bu bağlamı okuyup sorgulara otomatik `where: { tenantId }` ekler ve
 * `create` sırasında `tenantId`'yi atar. Bu yüzden buradaki sorgulara **manuel
 * `tenantId` verilmez** — yalın yazılır (bkz. plan §6.1, tenant.extension.ts).
 *
 * Güvenlik: Şifre bcrypt ile hash'lenir; `passwordHash` asla yanıtta dönmez
 * (`toSafeUser`). Bu, AuthService'teki SafeUser sözleşmesiyle aynıdır (Gün 5).
 */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Yeni kullanıcı oluşturur. `tenantId` extension tarafından atanır. Şifre
   * bcrypt ile hash'lenir. E-posta tenant içinde benzersizdir; çakışırsa 409
   * döner (bkz. §7 — `@@unique([tenantId, email])`).
   */
  async create(dto: CreateUserDto): Promise<SafeUser> {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);

    // `tenantId` extension tarafından çalışma zamanında atanır; derleyici bunu
    // bilmediği için zorunlu görür. Bu yüzden create verisini `tenantId` hariç
    // tipleyip öyle veriyoruz (bkz. tenant.extension.ts — injectTenantIntoData).
    const data: Omit<Prisma.UserUncheckedCreateInput, 'tenantId'> = {
      email: dto.email,
      passwordHash,
      fullName: dto.fullName,
      role: dto.role,
      branchId: dto.branchId,
      isActive: dto.isActive,
    };

    try {
      const user = await this.prisma.client.user.create({
        data: data as Prisma.UserUncheckedCreateInput,
      });
      return this.toSafeUser(user);
    } catch (error) {
      throw this.mapKnownErrors(error);
    }
  }

  /**
   * Aktif tenant'a ait tüm kullanıcıları döner. Extension `tenantId` filtresini
   * otomatik eklediği için `where` verilmez; sadece sıralama uygulanır.
   */
  async findAll(): Promise<SafeUser[]> {
    const users = await this.prisma.client.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return users.map((user) => this.toSafeUser(user));
  }

  /**
   * Tek bir kullanıcıyı id ile döner. Extension sorguyu tenant'a kısıtlar; başka
   * bir tenant'ın kullanıcısı (ya da olmayan id) sonuç döndürmez → 404.
   */
  async findOne(id: string): Promise<SafeUser> {
    const user = await this.findEntity(id);
    return this.toSafeUser(user);
  }

  /**
   * Kullanıcıyı kısmen günceller. Önce varlığı (ve tenant kapsamı) doğrulanır.
   * `password` verilmişse yeniden hash'lenir; verilmemişse mevcut şifre korunur.
   * E-posta çakışması olursa 409 döner.
   */
  async update(id: string, dto: UpdateUserDto): Promise<SafeUser> {
    // Var olmayan / başka tenant'a ait id için P2025 yerine anlaşılır 404 verelim.
    await this.findEntity(id);

    const data: Prisma.UserUncheckedUpdateInput = {
      email: dto.email,
      fullName: dto.fullName,
      role: dto.role,
      branchId: dto.branchId,
      isActive: dto.isActive,
    };

    // Şifre yalnızca gönderildiyse güncellenir (boş bırakılırsa değişmez).
    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, BCRYPT_SALT_ROUNDS);
    }

    try {
      const user = await this.prisma.client.user.update({
        where: { id },
        data,
      });
      return this.toSafeUser(user);
    } catch (error) {
      throw this.mapKnownErrors(error);
    }
  }

  /**
   * Kullanıcıyı siler. Önce kendini silme koruması uygulanır (FIRM_ADMIN kendi
   * hesabını silemez), sonra varlığı (ve tenant kapsamı) doğrulanır.
   */
  async remove(id: string, currentUserId: string): Promise<SafeUser> {
    if (id === currentUserId) {
      throw new BadRequestException('Kendinizi silemezsiniz.');
    }
    await this.findEntity(id);
    const user = await this.prisma.client.user.delete({
      where: { id },
    });
    return this.toSafeUser(user);
  }

  /**
   * Tenant kapsamında ham `User` kaydını getirir; bulunamazsa 404 fırlatır.
   * Dahili kullanım içindir (silme/güncelleme öncesi varlık doğrulaması).
   */
  private async findEntity(id: string): Promise<User> {
    const user = await this.prisma.client.user.findFirst({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı.');
    }

    return user;
  }

  /**
   * Bilinen Prisma hatalarını uygun HTTP istisnalarına çevirir.
   * - P2002: benzersizlik ihlali (tenant içi e-posta) → 409
   * Diğer hatalar olduğu gibi yükseltilir (global exception filter ele alır).
   */
  private mapKnownErrors(error: unknown): Error {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return new ConflictException('Bu e-posta firmada zaten kullanımda.');
    }
    return error instanceof Error ? error : new Error('Bilinmeyen bir hata oluştu.');
  }

  /** `passwordHash`'i çıkararak dışa güvenli kullanıcı görünümü üretir. */
  private toSafeUser(user: User): SafeUser {
    const { passwordHash, ...safe } = user;
    void passwordHash; // bilinçli olarak yanıttan çıkarıldı
    return safe;
  }
}

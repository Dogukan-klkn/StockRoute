import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, UserRole, type User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import type { LoginDto } from '../../application/dto/auth/login.dto';
import type { RegisterTenantDto } from '../../application/dto/auth/register-tenant.dto';
import type { JwtPayload } from '../../application/interfaces/jwt-payload.interface';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

/** bcrypt tuz (salt) maliyeti — güvenlik/performans dengesi için makul varsayılan. */
const BCRYPT_SALT_ROUNDS = 10;

/** Yanıtlarda dönülen, şifre alanı çıkarılmış güvenli kullanıcı görünümü. */
export type SafeUser = Omit<User, 'passwordHash'>;

/** `/auth/me` yanıtında dönen, kullanıcıya atanmış şubenin özet görünümü. */
export interface ProfileBranch {
  id: string;
  name: string;
  code: string;
  city: string | null;
}

/**
 * `/auth/me` profil görünümü: `SafeUser` + atanmış şube özeti.
 *
 * Şube bilgisi yalnızca profile eklenir; `login`/`registerTenant` yanıtlarının
 * `SafeUser` sözleşmesi değişmeden kalır. Bu sayede şube listeleme yetkisi
 * olmayan roller (WAREHOUSE_STAFF, FIELD_STAFF) kendi şubelerini öğrenebilir
 * (bkz. branches.controller.ts — GET /branches yalnızca yönetici rollerine açık).
 */
export interface UserProfile extends SafeUser {
  /** Kullanıcıya şube atanmamışsa (ör. FIRM_ADMIN) `null`. */
  branch: ProfileBranch | null;
}

/**
 * Kimlik doğrulama iş kuralları (Application katmanı).
 *
 * - `registerTenant`: tek bir transaction'da izole `Tenant` + ilk `FIRM_ADMIN`
 *   kullanıcısını oluşturur (şifre bcrypt ile hashlenir).
 * - `login`: e-posta + tenant slug ile kullanıcıyı bulur, şifreyi doğrular ve
 *   `{ accessToken, user }` döner.
 * - `getProfile`: token'dan gelen kullanıcının güncel profilini (şifre hariç) döner.
 *
 * NOT (izolasyon): register/login public'tir; henüz tenant bağlamı yoktur, bu
 * yüzden Prisma extension otomatik `tenantId` filtresi eklemez. Bu katman
 * izolasyonu `tenantId`'yi sorgulara elle vererek sağlar (bkz. plan §6.1).
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Firma (tenant) + ilk Firma Admini kaydını atomik olarak oluşturur.
   * slug veya (tenant içi) e-posta çakışırsa 409 döner.
   */
  async registerTenant(dto: RegisterTenantDto): Promise<{ accessToken: string; user: SafeUser }> {
    const passwordHash = await bcrypt.hash(dto.adminPassword, BCRYPT_SALT_ROUNDS);

    let adminUser: User;
    try {
      adminUser = await this.prisma.client.$transaction(async (tx) => {
        const tenant = await tx.tenant.create({
          data: {
            name: dto.firmName,
            slug: dto.slug,
          },
        });

        // tenant bağlamı olmadığı için tenantId'yi açıkça veriyoruz.
        return tx.user.create({
          data: {
            tenantId: tenant.id,
            email: dto.adminEmail,
            passwordHash,
            fullName: dto.adminFullName,
            role: UserRole.FIRM_ADMIN,
          },
        });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        // Benzersizlik ihlali: slug ya da (tenantId, email).
        throw new ConflictException('Bu firma kodu (slug) veya e-posta zaten kullanımda.');
      }
      throw error;
    }

    const accessToken = this.signToken(adminUser);
    return { accessToken, user: this.toSafeUser(adminUser) };
  }

  /**
   * E-posta + tenant slug ile giriş yapar. Kullanıcı yoksa, pasifse veya şifre
   * hatalıysa aynı 401'i döner (kullanıcı numaralandırmasını engellemek için).
   */
  async login(dto: LoginDto): Promise<{ accessToken: string; user: SafeUser }> {
    const tenant = await this.prisma.client.tenant.findUnique({
      where: { slug: dto.tenantSlug },
    });

    const user =
      tenant && tenant.isActive
        ? await this.prisma.client.user.findFirst({
            where: { tenantId: tenant.id, email: dto.email },
          })
        : null;

    // Zamanlama sızıntısını azaltmak için kullanıcı yoksa bile bir hash karşılaştır.
    const passwordMatches = await bcrypt.compare(
      dto.password,
      user?.passwordHash ?? '$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv',
    );

    if (!user || !user.isActive || !passwordMatches) {
      throw new UnauthorizedException('E-posta, şifre veya firma kodu hatalı.');
    }

    const accessToken = this.signToken(user);
    return { accessToken, user: this.toSafeUser(user) };
  }

  /**
   * Token'dan gelen `userId` + `tenantId` ile kullanıcının güncel profilini döner.
   * Kullanıcı bu arada silinmiş/pasifleşmişse 401 döner.
   *
   * Atanmış şube (varsa) özet olarak yanıta eklenir; şube listeleme yetkisi
   * olmayan roller kendi şubelerini buradan öğrenir (bkz. `UserProfile`).
   */
  async getProfile(userId: string, tenantId: string): Promise<UserProfile> {
    const user = await this.prisma.client.user.findFirst({
      where: { id: userId, tenantId },
      include: { branch: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Kullanıcı bulunamadı veya pasif.');
    }

    const { branch, ...rest } = user;
    return {
      ...this.toSafeUser(rest),
      branch: branch
        ? { id: branch.id, name: branch.name, code: branch.code, city: branch.city }
        : null,
    };
  }

  /** Kullanıcıdan JWT üretir; claim'ler: sub, tenantId, role (bkz. §6.1). */
  private signToken(user: User): string {
    const payload: JwtPayload = {
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role,
    };
    // JWT_SECRET / JWT_EXPIRES_IN JwtModule üzerinden ortamdan gelir (bkz. AuthModule).
    return this.jwtService.sign(payload);
  }

  /** `passwordHash`'i çıkararak dışa güvenli kullanıcı görünümü üretir. */
  private toSafeUser(user: User): SafeUser {
    const { passwordHash, ...safe } = user;
    void passwordHash; // bilinçli olarak yanıttan çıkarıldı
    return safe;
  }
}

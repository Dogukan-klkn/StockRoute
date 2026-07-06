import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '@prisma/client';

/**
 * `@Roles` decorator'ının metadata'yı yazdığı anahtar.
 * `RolesGuard` yetkileri bu anahtar üzerinden `Reflector` ile okur;
 * dışa aktarılır ki guard ile decorator aynı anahtarı paylaşsın (yazım
 * hatası riski olmadan).
 */
export const ROLES_KEY = 'roles';

/**
 * Bir endpoint'e (veya controller'a) erişebilecek rolleri etiketler (§8).
 *
 * Verilen rollerden **herhangi birine** sahip kullanıcı erişebilir (OR mantığı);
 * yetki kontrolünü `RolesGuard` yapar. Decorator yalnızca niyeti (metadata)
 * kaydeder, kararı vermez.
 *
 * Kullanım:
 * ```ts
 * @Roles(UserRole.FIRM_ADMIN, UserRole.BRANCH_MANAGER)
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Get()
 * findAll() { ... }
 * ```
 *
 * NOT: `RolesGuard` her zaman `JwtAuthGuard`'tan **sonra** çalışmalıdır
 * (önce kimlik, sonra yetki); aksi halde `request.user` henüz dolmamış olur.
 */
export const Roles = (...roles: UserRole[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);

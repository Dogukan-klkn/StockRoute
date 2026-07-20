import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

/**
 * Kullanıcı (User) modülü (§9.3).
 *
 * `PrismaService` global `PrismaModule`'den, `TenantContextService` global
 * `TenantModule`'den enjekte edilir; burada tekrar import edilmez. `RolesGuard`
 * `Reflector`'a bağımlıdır (NestJS core sağlar), `JwtAuthGuard` Passport
 * stratejisini kullanır (global `AuthModule` üzerinden kayıtlı) — bu yüzden ek
 * import gerekmez. Şifre hash'leme için `bcrypt` doğrudan servis içinde kullanılır.
 */
@Module({
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}

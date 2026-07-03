import { Module } from '@nestjs/common';
import { JwtModule, type JwtSignOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../../infrastructure/auth/jwt.strategy';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

/**
 * Kimlik doğrulama modülü (§9.1, §6.1).
 *
 * - `JwtModule`: `sign`/`verify` için sır ve süreyi ortamdan (JWT_SECRET,
 *   JWT_EXPIRES_IN) alır. Hem token üretimi (AuthService) hem de middleware'deki
 *   manuel decode (TenantResolverMiddleware) bu servisi kullanır; bu yüzden
 *   `JwtModule` dışa aktarılır.
 * - `PassportModule` + `JwtStrategy`: korumalı endpoint'lerde Bearer token doğrulama.
 *
 * `PrismaService` global `PrismaModule`'den, `TenantContextService` global
 * `TenantModule`'den enjekte edilir; burada tekrar import edilmez.
 */
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      // JWT_EXPIRES_IN "1d", "12h" gibi bir string ya da saniye cinsinden sayı
      // olabilir; jsonwebtoken'ın beklediği tip için daraltıyoruz.
      signOptions: {
        expiresIn: (process.env.JWT_EXPIRES_IN ?? '1d') as JwtSignOptions['expiresIn'],
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}

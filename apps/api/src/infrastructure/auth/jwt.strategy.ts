import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type {
  AuthenticatedUser,
  JwtPayload,
} from '../../application/interfaces/jwt-payload.interface';

/**
 * JWT doğrulama stratejisi (Passport).
 *
 * Token'ı `Authorization: Bearer <token>` header'ından çıkarır ve imzasını
 * `JWT_SECRET` ile doğrular. Geçerliyse, doğrulanmış payload `validate()`'ten
 * dönen değer olarak `request.user`'a yerleştirilir; böylece `JwtAuthGuard`
 * ile korunan endpoint'lerde `@CurrentUser` üzerinden erişilebilir.
 *
 * NOT: Sır (secret) ve süre ortam değişkenlerinden okunur (§14). Secret
 * tanımsızsa uygulama açılışında hata vererek yanlış yapılandırmayı erken
 * yakalarız (güvenli varsayılan yerine "fail fast").
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET ortam değişkeni tanımlı değil. Auth başlatılamaz.');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  /**
   * İmza ve süre doğrulandıktan sonra çağrılır. Dönen nesne `request.user`
   * olur. Beklenen claim'ler eksikse token biçimsel olarak geçersiz sayılır.
   */
  validate(payload: JwtPayload): AuthenticatedUser {
    if (!payload?.sub || !payload?.tenantId || !payload?.role) {
      throw new UnauthorizedException('Token içeriği geçersiz.');
    }

    return {
      userId: payload.sub,
      tenantId: payload.tenantId,
      role: payload.role,
    };
  }
}

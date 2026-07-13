import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { UserRole } from '@prisma/client';
import type { AuthenticatedUser } from '../../application/interfaces/jwt-payload.interface';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Rol bazlı yetkilendirme (RBAC) guard'ı (§8).
 *
 * `@Roles(...)` ile bir endpoint'e (method) veya controller'a (class) atanan
 * izinli rolleri `Reflector` ile okur ve isteği yapan kullanıcının rolünün
 * bunlardan **herhangi biriyle** eşleşip eşleşmediğini kontrol eder.
 *
 * Kurallar:
 *  - `@Roles` hiç kullanılmamışsa (metadata yok) endpoint yalnızca kimlik
 *    doğrulamaya tabidir; guard erişime izin verir (yetki kısıtı yok demektir).
 *  - Kullanıcı bağlamı yoksa (`request.user` boş) veya rolü listede değilse
 *    `ForbiddenException` (403) fırlatır.
 *
 * Sıralama: `@UseGuards(JwtAuthGuard, RolesGuard)` — önce `JwtAuthGuard`
 * `request.user`'ı doldurur, sonra bu guard yetkiyi denetler.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Method-level metadata class-level'i geçersiz kılar (getAllAndOverride).
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // @Roles kullanılmamış: yetki kısıtı yok, erişime izin ver.
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user) {
      // JwtAuthGuard'sız korunmuş bir rotada bu duruma düşülebilir; savunma amaçlı.
      throw new ForbiddenException('Bu işlem için kimlik doğrulaması gerekli.');
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Bu işlem için gerekli yetkiye sahip değilsiniz.');
    }

    return true;
  }
}

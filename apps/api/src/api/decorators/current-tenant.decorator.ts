import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../../application/interfaces/jwt-payload.interface';

/**
 * Mevcut isteğin `tenantId`'sini controller parametresine enjekte eder.
 *
 * Kaynak: `JwtAuthGuard` tarafından doğrulanan `request.user.tenantId`
 * (JWT `tenantId` claim'inden gelir — bkz. §6.1). Böylece controller'lar
 * tenant kimliğini elle `@CurrentUser().tenantId` üzerinden çıkarmak yerine
 * doğrudan ve okunur biçimde alır.
 *
 * Kullanım: `findAll(@CurrentTenant() tenantId: string) { ... }`
 *
 * NOT: Bu decorator yalnızca `@UseGuards(JwtAuthGuard)` ile korunan rotalarda
 * anlamlıdır; guard'sız bir rotada `tenantId` tanımsız olur. Alternatif olarak
 * aynı değer request-scoped `TenantContextService.getTenantId()` üzerinden de
 * okunabilir; ancak param decorator'ları DI kullanamadığından burada doğrulanmış
 * istek nesnesi tercih edildi (tek doğruluk kaynağı: JWT claim'i).
 */
export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    return request.user?.tenantId;
  },
);

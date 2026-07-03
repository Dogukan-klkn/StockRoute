import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../../application/interfaces/jwt-payload.interface';

/**
 * `JwtAuthGuard` tarafından `request.user`'a yerleştirilen doğrulanmış
 * kullanıcıyı controller parametresine enjekte eden decorator.
 *
 * Kullanım: `me(@CurrentUser() user: AuthenticatedUser) { ... }`
 *
 * Guard'sız bir rotada kullanılırsa `user` tanımsız olur; bu decorator yalnızca
 * `@UseGuards(JwtAuthGuard)` ile korunan endpoint'lerde anlamlıdır.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser | undefined => {
    const request = ctx.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    return request.user;
  },
);

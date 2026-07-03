import type { UserRole } from '@prisma/client';

/**
 * JWT access token içine gömülen claim'ler.
 *
 * Multi-tenancy ve RBAC'in temelini bu üç alan taşır (bkz. plan §6.1):
 *  - `sub`: kullanıcı kimliği (userId). JWT standardı gereği "subject".
 *  - `tenantId`: kullanıcının bağlı olduğu firma; tenant izolasyonunu sürer.
 *  - `role`: RBAC yetki kararları için kullanıcının rolü (Gün 6 — RolesGuard).
 */
export interface JwtPayload {
  readonly sub: string;
  readonly tenantId: string;
  readonly role: UserRole;
}

/**
 * `JwtStrategy.validate` sonrası `request.user`'a yerleşen, doğrulanmış
 * kullanıcı bağlamı. Guard'lar ve `@CurrentUser` decorator'ı bunu okur.
 */
export interface AuthenticatedUser {
  readonly userId: string;
  readonly tenantId: string;
  readonly role: UserRole;
}

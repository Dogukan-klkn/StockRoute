import type { UserRole } from '@stockroute/shared-types';

/**
 * Kullanıcı (User) API yanıt tipi — backend'in `SafeUser` sözleşmesi.
 *
 * `passwordHash` yanıtta **asla** dönmez (bkz. apps/api UsersService.toSafeUser),
 * bu yüzden burada da yer almaz. `branchId` şubesi olmayan roller (FIRM_ADMIN)
 * için null'dır. Not: Mockup'ta görünen telefon ve "son giriş" alanları `User`
 * modelinde bulunmadığından bu tipte yoktur.
 */
export interface User {
  id: string;
  tenantId: string;
  email: string;
  fullName: string;
  role: UserRole;
  branchId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

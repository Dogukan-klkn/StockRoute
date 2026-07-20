import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import type { UserRole } from '@stockroute/shared-types';
import { useAuthStore } from '../lib/auth-store';

/**
 * Rol tabanlı rota koruması. Oturumdaki kullanıcının rolü `allowed` listesinde
 * değilse kontrol paneline yönlendirir. Sidebar'da gizlenen sayfalara URL ile
 * doğrudan gidilmesini de engeller (bkz. plan §8 — yetki matrisi).
 *
 * Not: Kimlik doğrulama `ProtectedRoute` tarafından yapılır; bu bileşen yalnızca
 * yetkiyi (rolü) kontrol eder.
 */
interface RoleGuardProps {
  allowed: readonly UserRole[];
  children: ReactNode;
}

export function RoleGuard({ allowed, children }: RoleGuardProps) {
  const role = useAuthStore((state) => state.user?.role);

  if (!role || !allowed.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

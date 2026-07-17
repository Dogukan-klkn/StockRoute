import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserRole } from '@stockroute/shared-types';

/** Oturumdaki kullanıcının istemci tarafında tutulan güvenli görünümü. */
export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  tenantId: string;
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  /** Giriş yapılan firmanın slug'ı — API firma adını dönmediği için topbar'da gösterilir. */
  tenantSlug: string | null;
  setAuth: (token: string, user: AuthUser, tenantSlug: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      user: null,
      tenantSlug: null,
      setAuth: (accessToken, user, tenantSlug) => set({ accessToken, user, tenantSlug }),
      logout: () => set({ accessToken: null, user: null, tenantSlug: null }),
      isAuthenticated: () => get().accessToken !== null,
      // TODO(gün15+): JWT expire kontrolü eklenecek
      // TODO(gün15): firma adı /auth/me veya tenant endpoint'inden alınıp gösterilecek
    }),
    { name: 'stockroute-auth' },
  ),
);

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
  setAuth: (token: string, user: AuthUser) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      user: null,
      setAuth: (accessToken, user) => set({ accessToken, user }),
      logout: () => set({ accessToken: null, user: null }),
      isAuthenticated: () => get().accessToken !== null,
      // TODO(gün15+): JWT expire kontrolü eklenecek
    }),
    { name: 'stockroute-auth' },
  ),
);

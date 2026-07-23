import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';
import type { UserRole } from '@stockroute/shared-types';

/** Kullanıcıya atanmış şube özeti (GET /auth/me → user.branch, Gün 16). */
export interface AuthBranch {
  id: string;
  name: string;
  code: string;
  city: string | null;
}

/** Oturumdaki kullanıcının istemci tarafında tutulan güvenli görünümü. */
export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  tenantId: string;
  /**
   * Kullanıcının şubesi. Login yanıtında gelmeyebilir; GET /auth/me ile
   * doldurulur (FIELD_STAFF gibi şube listeleme yetkisi olmayan roller kendi
   * şubesini buradan öğrenir). Atanmamışsa (ör. FIRM_ADMIN) null.
   */
  branch?: AuthBranch | null;
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  /** Giriş yapılan firmanın slug'ı — API firma adını dönmediği için gösterilir. */
  tenantSlug: string | null;
  /**
   * Persist hydration tamamlandı mı? SecureStore async olduğu için uygulama
   * açılışında auth durumu bir süre bilinmez; rota koruması (app/_layout.tsx)
   * bu bayrak true olana kadar splash gösterip yönlendirme yapmamalıdır.
   */
  hasHydrated: boolean;
  setAuth: (token: string, user: AuthUser, tenantSlug: string) => void;
  /** /auth/me sonrası kullanıcıyı (şube dahil) günceller. */
  setUser: (user: AuthUser) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  setHasHydrated: (value: boolean) => void;
}

/**
 * Zustand persist için SecureStore adapter'ı.
 *
 * Web'de localStorage senkrondur; mobilde SecureStore Promise döner ve token'ı
 * Keychain (iOS) / Keystore (Android) içinde ŞİFRELİ tutar — JWT için AsyncStorage'ın
 * düz metnine göre doğru tercih. Token + user birlikte tek anahtarda saklanıyor;
 * SecureStore değeri ~2KB'ı aşarsa user'ı ayrı (AsyncStorage) tutmaya geçilecek.
 */
const secureStorage: StateStorage = {
  getItem: (name) => SecureStore.getItemAsync(name),
  setItem: (name, value) => SecureStore.setItemAsync(name, value),
  removeItem: (name) => SecureStore.deleteItemAsync(name),
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      user: null,
      tenantSlug: null,
      hasHydrated: false,
      setAuth: (accessToken, user, tenantSlug) => set({ accessToken, user, tenantSlug }),
      setUser: (user) => set({ user }),
      logout: () => set({ accessToken: null, user: null, tenantSlug: null }),
      isAuthenticated: () => get().accessToken !== null,
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: 'stockroute-auth',
      storage: createJSONStorage(() => secureStorage),
      // hasHydrated bir çalışma-zamanı bayrağıdır; saklanmasına gerek yok.
      partialize: ({ accessToken, user, tenantSlug }) => ({ accessToken, user, tenantSlug }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

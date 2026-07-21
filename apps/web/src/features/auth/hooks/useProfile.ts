import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client';
import { useAuthStore, type AuthUser } from '../../../lib/auth-store';

/** `/auth/me` yanıtındaki şube özeti (bkz. apps/api AuthService — ProfileBranch). */
export interface ProfileBranch {
  id: string;
  name: string;
  code: string;
  city: string | null;
}

/** `GET /auth/me` yanıtı: login'deki kullanıcı görünümü + atanmış şube. */
export interface ProfileResponse {
  user: AuthUser & { branchId: string | null; branch: ProfileBranch | null };
  tenantId: string;
}

/** Profil query anahtarı. */
export const PROFILE_QUERY_KEY = ['auth', 'me'] as const;

/**
 * Oturumdaki kullanıcının güncel profilini getirir (`GET /auth/me`).
 *
 * Şube bilgisi login yanıtında yoktur; şube listeleme yetkisi olmayan roller
 * (WAREHOUSE_STAFF, FIELD_STAFF) kendi şubelerini buradan öğrenir. Profil oturum
 * boyunca nadiren değiştiği için uzun süre taze kabul edilir.
 */
export function useProfile() {
  const isAuthenticated = useAuthStore((state) => state.accessToken !== null);

  return useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: async () => {
      const { data } = await apiClient.get<ProfileResponse>('/auth/me');
      return data;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });
}

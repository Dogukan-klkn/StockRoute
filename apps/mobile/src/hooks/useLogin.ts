import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore, type AuthUser } from '@/lib/auth-store';
import type { LoginInput } from '@/lib/schemas';

/** `POST /auth/login` yanıtı (bkz. apps/api AuthService.login). */
interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

/** `GET /auth/me` yanıtı — kullanıcı + atanmış şube (Gün 16). */
interface MeResponse {
  user: AuthUser;
  tenantId: string;
}

/**
 * Login mutation'ı.
 *
 * Başarılı login sonrası token saklanır, ardından GET /auth/me çağrılarak
 * kullanıcının şube bilgisi (login yanıtında gelmeyebilir) doldurulur — mobilde
 * kullanıcı kendi şubesini bu alandan görür. /me başarısız olursa login yine
 * geçerlidir; şube sonradan doldurulur.
 */
export function useLogin() {
  const setAuth = useAuthStore((state) => state.setAuth);
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: async (input: LoginInput) => {
      const { data } = await apiClient.post<LoginResponse>('/auth/login', input);
      return data;
    },
    onSuccess: async (data, variables) => {
      // Önce token + temel kullanıcıyı sakla; sonraki isteklere Bearer eklenir.
      setAuth(data.accessToken, data.user, variables.tenantSlug);
      try {
        const { data: me } = await apiClient.get<MeResponse>('/auth/me');
        setUser(me.user);
      } catch {
        // /me başarısız olsa da login geçerli; şube alanı sonra doldurulabilir.
      }
    },
  });
}

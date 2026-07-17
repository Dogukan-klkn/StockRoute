import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../../../lib/api-client';
import { useAuthStore, type AuthUser } from '../../../lib/auth-store';
import type { LoginInput } from '../schemas';

/** `POST /auth/login` yanıtı (bkz. apps/api AuthService.login). */
interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export function useLogin() {
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation({
    mutationFn: async (input: LoginInput) => {
      const { data } = await apiClient.post<LoginResponse>('/auth/login', input);
      return data;
    },
    onSuccess: (data, variables) => {
      setAuth(data.accessToken, data.user, variables.tenantSlug);
    },
  });
}

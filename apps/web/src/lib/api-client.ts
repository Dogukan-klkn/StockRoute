import axios from 'axios';
import { useAuthStore } from './auth-store';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Oturum varsa her isteğe Bearer token ekle.
apiClient.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// 401 → oturumu düşür ve login'e yönlendir (login isteğinin kendisi hariç).
apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      !error.config?.url?.includes('/auth/login')
    ) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

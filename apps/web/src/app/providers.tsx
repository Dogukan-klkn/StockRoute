import { useState, type ReactNode } from 'react';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { theme } from '../theme';
import { SnackbarProvider } from '../components/SnackbarProvider';
import { SocketProvider } from '../providers/SocketProvider';

/**
 * Yetki hataları tekrar denenmez: 401/403 geçici bir aksaklık değil kalıcı bir
 * karardır; yeniden denemek yalnızca gereksiz istek ve konsol gürültüsü üretir
 * (ör. şube listeleme yetkisi olmayan roller — bkz. Gün 16 bulgusu).
 */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 401 || status === 403 || status === 404) {
      return false;
    }
  }
  return failureCount < 1;
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: shouldRetry },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <SnackbarProvider>
          {/* Socket, SnackbarProvider'ın ALTINDA: real-time katmanı gelen
              `notification` olaylarını bildirim olarak gösterecek (Aşama 2). */}
          <SocketProvider>{children}</SocketProvider>
        </SnackbarProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

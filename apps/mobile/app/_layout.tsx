import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Sunucu durumu için tek QueryClient (TanStack Query). Auth (client state)
// Zustand'da tutulur. Rota koruması + hydration splash Aşama 3'te bu layout'a
// eklenecek; şimdilik login akışının çalışması için provider yeterli.
const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <Stack>
        <Stack.Screen name="(auth)/login" options={{ title: 'Giriş' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </QueryClientProvider>
  );
}

import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/auth-store';
import { theme } from '@/theme';

// Sunucu durumu için tek QueryClient (TanStack Query). Auth (client state)
// Zustand'da tutulur.
const queryClient = new QueryClient();

/**
 * Rota koruması (web'deki ProtectedRoute'un Expo Router karşılığı).
 *
 * SecureStore async olduğundan auth durumu açılışta bir süre bilinmez:
 *   1. hasHydrated=false iken hiçbir yönlendirme YAPMA (splash/loading göster).
 *   2. Hydration bitince, bulunulan segment ile oturum durumu uyuşmuyorsa
 *      router.replace ile doğru gruba yönlendir:
 *        - oturumsuzsa ve (auth) dışındaysa → login
 *        - oturumluysa ve (auth) içindeyse   → (tabs)
 */
function useProtectedRoute() {
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const isAuthenticated = useAuthStore((state) => state.accessToken !== null);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }
    const inAuthGroup = segments[0] === '(auth)';
    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [hasHydrated, isAuthenticated, segments, router]);
}

export default function RootLayout() {
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  useProtectedRoute();

  // Hydration tamamlanana kadar marka renginde loading göster; erken render
  // edilen ekranlar auth durumu belli olmadan yanlış yönlendirmeye yol açmasın.
  if (!hasHydrated) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={theme.colors.surface} />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Stack>
        <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
  },
});

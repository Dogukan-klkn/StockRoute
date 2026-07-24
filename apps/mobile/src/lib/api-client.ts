import axios from 'axios';
import { Platform } from 'react-native';
import { useAuthStore } from './auth-store';

/**
 * API taban adresi.
 *
 * Web'de `localhost:3000` doğrudan çalışıyordu; mobilde `localhost` cihazın
 * kendisidir. Bu yüzden:
 *   - EXPO_PUBLIC_API_URL verilmişse onu kullan (fiziksel cihaz: LAN IP).
 *   - Verilmemişse platform bazlı akıllı varsayılan:
 *       • Android emülatör → 10.0.2.2 (emülatörün host makine aliası;
 *         Docker'daki API host :3000'de yayınlandığında da bu adres çalışır)
 *       • iOS simulator    → localhost
 * bkz. .env.example
 */
function resolveBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv && fromEnv.length > 0) {
    return fromEnv;
  }
  const host = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
  return `http://${host}:3000`;
}

/**
 * İstek zaman aşımı (ms).
 *
 * Varsayılanda axios'ta timeout yoktur: sunucu kapalıyken istek TCP/OS
 * zaman aşımına kadar (pratikte ~50 sn) askıda kalır ve kullanıcı boş bir
 * spinner'a bakar. Mobil ağlarda 10 sn, "yavaş bağlantı" ile "sunucu yok"
 * arasında makul bir üst sınır.
 */
const REQUEST_TIMEOUT_MS = 10_000;

export const apiClient = axios.create({
  baseURL: resolveBaseUrl(),
  timeout: REQUEST_TIMEOUT_MS,
});

/**
 * "Sunucuya ulaşılamadı" hatası mı? (zaman aşımı veya ağ hatası)
 *
 * Ayrım neden yapılmıyor: React Native'in XHR tabanlı ağ katmanı, erişilemeyen
 * bir host'u axios'un timeout sayacı dolmadan `ERR_NETWORK` ("Network Error")
 * ile sonlandırıyor — emülatörde ölçüldü. Yani Android'de saf bir "zaman aşımı"
 * kodu pratikte gelmiyor; `ECONNABORTED` yalnızca sunucu bağlantıyı kabul edip
 * yanıt vermediğinde görülür. Kullanıcı açısından ikisi de aynı şeydir
 * ("sunucuya ulaşamadık"), bu yüzden tek bir dal ve tek bir mesaj kullanıyoruz;
 * ulaşılamayan bir dal bırakmak yanıltıcı olurdu.
 *
 * `timeout` ayarının asıl faydası mesaj değil SÜRE: istek artık askıda kalmıyor.
 */
export function isConnectionError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  return (
    error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' || error.code === 'ERR_NETWORK'
  );
}

// Oturum varsa her isteğe Bearer token ekle.
apiClient.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// 401 → oturumu düşür (login isteğinin KENDİ 401'i hariç).
//
// Web'de Gün 14'te bu tuzağa düşülmüştü: /auth/login'in 401'i de logout
// tetikleyince hatalı şifrede sonsuz döngü oluyordu. Login isteğini hariç
// tutuyoruz; login'in hatası bileşene (react-query error) düşer ve orada
// Türkçe mesaja çevrilir. Yönlendirmeyi interceptor yapmaz — rota koruması
// (Aşama 3, app/_layout.tsx) accessToken=null olunca login'e yönlendirir.
apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      !error.config?.url?.includes('/auth/login')
    ) {
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  },
);

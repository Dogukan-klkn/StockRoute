import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { apiClient } from '@/lib/api-client';
import type { Product } from '@/lib/types';

/**
 * Barkod ile ürün sorgusu (GET /products/barcode/:barcode — plan §9.4).
 *
 * `barcode` boşsa sorgu hiç çalışmaz (`enabled`): tarama yapılmadan istek gitmez.
 *
 * Yeniden deneme politikası: 404 "bu barkod bizde yok" demektir, bir ağ hatası
 * değil — tekrar denemek anlamsız, kullanıcıyı bekletir. Bu yüzden 404'te hiç
 * denenmez; diğer hatalarda (ağ/sunucu) bir kez denenir.
 */
export function useProductByBarcode(barcode: string | null) {
  return useQuery({
    queryKey: ['product', 'barcode', barcode],
    queryFn: async () => {
      const { data } = await apiClient.get<Product>(
        `/products/barcode/${encodeURIComponent(barcode ?? '')}`,
      );
      return data;
    },
    enabled: Boolean(barcode),
    retry: (failureCount, error) => {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return false;
      }
      return failureCount < 1;
    },
    // Aynı barkod tekrar okutulduğunda taze veri gelsin (stok değişmiş olabilir).
    staleTime: 0,
  });
}

/** Hatanın "ürün bulunamadı" (404) olup olmadığını ayırt eder. */
export function isNotFoundError(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 404;
}

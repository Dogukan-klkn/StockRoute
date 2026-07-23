import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { InventoryItem, SelectableBranch } from '@/lib/types';

/**
 * Seçilebilir şubeler (GET /branches/selectable — tüm rollere açık, minimal).
 * Yalnızca şube seçici gösterilen rollerde etkinleştirilir (enabled).
 */
export function useBranches(enabled: boolean) {
  return useQuery({
    queryKey: ['branches', 'selectable'],
    queryFn: async () => {
      const { data } = await apiClient.get<SelectableBranch[]>('/branches/selectable');
      return data;
    },
    enabled,
  });
}

/**
 * Şube stok listesi (GET /inventory?branchId=). branchId boşsa sorgu çalışmaz
 * (şube seçilmeden liste gösterilmez). Ürün arama client-side yapılır (web deseni).
 */
export function useInventory(branchId: string | undefined) {
  return useQuery({
    queryKey: ['inventory', branchId],
    queryFn: async () => {
      const { data } = await apiClient.get<InventoryItem[]>('/inventory', {
        params: { branchId },
      });
      return data;
    },
    enabled: Boolean(branchId),
  });
}

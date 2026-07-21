import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adjustStock, type AdjustStockPayload } from '../api/inventory-api';
import { INVENTORY_QUERY_KEY } from './useInventory';

/**
 * Stok düzeltme mutation'ı. Başarıda tüm `['inventory', ...]` query'lerini
 * invalidate eder (filtre kombinasyonundan bağımsız), böylece düzeltme sonrası
 * liste güncel değeri gösterir. Optimistic update yok — invalidate + refetch.
 * Snackbar bildirimi çağıran bileşende yapılır.
 */
export function useInventoryMutations() {
  const queryClient = useQueryClient();

  const adjustMutation = useMutation({
    mutationFn: (payload: AdjustStockPayload) => adjustStock(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY }),
  });

  return { adjustMutation };
}

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { adjustStock, updateThreshold, type AdjustStockPayload } from '../api/inventory-api';
import { INVENTORY_QUERY_KEY } from './useInventory';

/**
 * Envanter mutation'ları: stok düzeltme ve düşük stok eşiği güncelleme.
 *
 * Her ikisi de başarıda tüm `['inventory', ...]` query'lerini invalidate eder
 * (filtre kombinasyonundan bağımsız), böylece liste güncel değeri gösterir.
 * Optimistic update yok — invalidate + refetch. Snackbar bildirimi çağıran
 * bileşende yapılır.
 */
export function useInventoryMutations() {
  const queryClient = useQueryClient();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY });

  const adjustMutation = useMutation({
    mutationFn: (payload: AdjustStockPayload) => adjustStock(payload),
    onSuccess: invalidate,
  });

  const thresholdMutation = useMutation({
    mutationFn: ({ id, minThreshold }: { id: string; minThreshold: number }) =>
      updateThreshold(id, minThreshold),
    onSuccess: invalidate,
  });

  return { adjustMutation, thresholdMutation };
}

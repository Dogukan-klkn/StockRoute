import { useQuery } from '@tanstack/react-query';
import { fetchInventory } from '../api/inventory-api';
import type { InventoryFilters } from '../types';

/** Envanter query anahtarı kökü — mutation'lar bu önekle invalidate eder. */
export const INVENTORY_QUERY_KEY = ['inventory'] as const;

/**
 * Seçili şubenin envanterini getirir (`GET /inventory`). Filtreler query
 * anahtarının parçasıdır; şube veya düşük stok filtresi değişince TanStack Query
 * otomatik yeniden çeker (bkz. plan §5.4 — sunucu durumu yalnızca Query'de).
 *
 * `enabled` ile çağıran ekran isteğin ne zaman atılacağını belirler: şube seçici
 * kullanılabilen rollerde şube seçilene kadar beklenir, seçici olmayan rollerde
 * (bkz. InventoryPage — GET /branches yetkisi olmayanlar) filtresiz tüm tenant
 * envanteri çekilir.
 */
export function useInventory(filters: InventoryFilters, enabled = true) {
  return useQuery({
    queryKey: [...INVENTORY_QUERY_KEY, filters.branchId ?? null, filters.lowStock ?? false],
    queryFn: () => fetchInventory(filters),
    enabled,
  });
}

import { useQuery } from '@tanstack/react-query';
import { fetchMovements } from '../api/movements-api';
import type { MovementFilters } from '../types';

/** Transfer query anahtarı kökü — mutation'lar bu önekle invalidate eder. */
export const MOVEMENTS_QUERY_KEY = ['movements'] as const;

/**
 * Transfer listesini getirir (`GET /movements`).
 *
 * Not: Durum filtresi bilinçli olarak **istemci tarafında** uygulanır (bkz.
 * MovementsPage); bu hook filtresiz tüm listeyi çeker; böylece mockup'taki
 * durum sayaçları tek istekle hesaplanabilir.
 */
export function useMovements(filters: MovementFilters = {}) {
  return useQuery({
    queryKey: [...MOVEMENTS_QUERY_KEY, filters.status ?? null, filters.branchId ?? null],
    queryFn: () => fetchMovements(filters),
  });
}

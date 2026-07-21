import { useQuery } from '@tanstack/react-query';
import { fetchMovement } from '../api/movements-api';
import { MOVEMENTS_QUERY_KEY } from './useMovements';

/** Tek transferin detay query anahtarı. */
export const movementDetailKey = (id: string) => [...MOVEMENTS_QUERY_KEY, 'detail', id] as const;

/**
 * Tek transferin detayını getirir (`GET /movements/:id`).
 *
 * Liste yanıtındaki kalemlerde ürün bilgisi yoktur; ürün adları ve aktörler
 * yalnızca bu detay çağrısıyla gelir. `id` yoksa (modal kapalı) istek atılmaz.
 */
export function useMovement(id: string | null) {
  return useQuery({
    queryKey: movementDetailKey(id ?? ''),
    queryFn: () => fetchMovement(id as string),
    enabled: id !== null,
  });
}

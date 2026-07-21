import { useMutation, useQueryClient } from '@tanstack/react-query';
import { runMovementAction } from '../api/movements-api';
import type { MovementAction } from '../types';
import { MOVEMENTS_QUERY_KEY } from './useMovements';

/**
 * Durum geçişi mutation'ı (approve/reject/ship/receive/cancel).
 *
 * Başarıda tüm `['movements', ...]` query'lerini invalidate eder — hem liste hem
 * açık detay yeniden çekilir, böylece durum chip'i her iki yerde de güncellenir.
 * Optimistic update yok. Snackbar bildirimi çağıran bileşende yapılır.
 */
export function useMovementActions() {
  const queryClient = useQueryClient();

  const actionMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: MovementAction }) =>
      runMovementAction(id, action),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MOVEMENTS_QUERY_KEY }),
  });

  return { actionMutation };
}

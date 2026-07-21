import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createMovement, type CreateMovementPayload } from '../api/movements-api';
import { MOVEMENTS_QUERY_KEY } from './useMovements';

/**
 * Transfer talebi oluşturma mutation'ı. Başarıda `['movements', ...]`
 * query'lerini invalidate eder; yeni talep listede PENDING olarak görünür.
 * Optimistic update yok. Snackbar bildirimi çağıran bileşende yapılır.
 */
export function useMovementMutations() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (payload: CreateMovementPayload) => createMovement(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MOVEMENTS_QUERY_KEY }),
  });

  return { createMutation };
}

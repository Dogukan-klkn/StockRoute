import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createUser, deleteUser, updateUser } from '../api/users-api';
import type { UserFormValues } from '../schemas';
import { USERS_QUERY_KEY } from './useUsers';

/**
 * Kullanıcı create/update/delete mutation'ları. Her biri başarıda `['users']`
 * query'sini invalidate eder ve refetch bekler (optimistic update yok).
 * Snackbar bildirimi çağıran bileşende yapılır.
 */
export function useUserMutations() {
  const queryClient = useQueryClient();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY });

  const createMutation = useMutation({
    mutationFn: (values: UserFormValues) => createUser(values),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: UserFormValues }) => updateUser(id, values),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: invalidate,
  });

  return { createMutation, updateMutation, deleteMutation };
}

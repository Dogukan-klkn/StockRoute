import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createBranch, deleteBranch, updateBranch } from '../api/branches-api';
import type { BranchFormValues } from '../schemas';
import { BRANCHES_QUERY_KEY } from './useBranches';

/**
 * Şube create/update/delete mutation'ları. Her biri başarıda `['branches']`
 * query'sini invalidate eder ve refetch bekler (optimistic update yok —
 * bkz. plan; basit ve güvenli). Snackbar bildirimi çağıran bileşende yapılır.
 */
export function useBranchMutations() {
  const queryClient = useQueryClient();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: BRANCHES_QUERY_KEY });

  const createMutation = useMutation({
    mutationFn: (values: BranchFormValues) => createBranch(values),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: BranchFormValues }) =>
      updateBranch(id, values),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBranch(id),
    onSuccess: invalidate,
  });

  return { createMutation, updateMutation, deleteMutation };
}

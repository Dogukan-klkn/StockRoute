import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MovementStatus } from '@stockroute/shared-types';
import { apiClient } from '@/lib/api-client';
import type { Movement } from '@/lib/types';

/**
 * Bu şubeye gelen, teslim bekleyen transferler (plan §12.2).
 *
 * `GET /movements?status=IN_TRANSIT&branchId=` çağrılır. Backend `branchId`
 * filtresini destekler ancak şubenin **kaynak VEYA hedef** olduğu hareketleri
 * döndürür (movements.service.ts — `where.OR`). "Gelen" kutusu için yalnızca
 * hedef tarafı istediğimizden, sunucudan gelen küme ayrıca client-side
 * `destinationBranchId` ile daraltılır. Böylece bu şubeden ÇIKAN sevkiyatlar
 * teslim alma listesinde görünmez.
 */
export function useIncomingTransfers(branchId: string | undefined) {
  return useQuery({
    queryKey: ['movements', 'incoming', branchId],
    queryFn: async () => {
      const { data } = await apiClient.get<Movement[]>('/movements', {
        params: { status: MovementStatus.IN_TRANSIT, branchId },
      });
      return data.filter((movement) => movement.destinationBranchId === branchId);
    },
    enabled: Boolean(branchId),
  });
}

/**
 * Transferi teslim alır (`POST /movements/:id/receive`).
 *
 * Başarıda hem transfer listesi hem envanter geçersizleştirilir: teslim alma
 * hedef şubenin stoğunu artırdığından Stok sekmesi de tazelenmeli.
 */
export function useReceiveTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (movementId: string) => {
      const { data } = await apiClient.post<Movement>(`/movements/${movementId}/receive`);
      return data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['movements'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory'] }),
      ]);
    },
  });
}

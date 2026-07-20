import { apiClient } from '../../../lib/api-client';
import type { BranchFormValues } from '../schemas';
import type { Branch } from '../types';

/**
 * Şube (Branch) HTTP çağrıları (§9.2). Her fonksiyon tek bir uç noktayı sarar;
 * TanStack Query hook'ları (useBranches / useBranchMutations) bunları tüketir.
 * `tenantId` istemciden gönderilmez — sunucu JWT bağlamından çözer.
 */

/** `GET /branches` — aktif firmanın tüm şubeleri. */
export async function fetchBranches(): Promise<Branch[]> {
  const { data } = await apiClient.get<Branch[]>('/branches');
  return data;
}

/** `POST /branches` — yeni şube oluşturur. */
export async function createBranch(values: BranchFormValues): Promise<Branch> {
  const { data } = await apiClient.post<Branch>('/branches', values);
  return data;
}

/** `PATCH /branches/:id` — mevcut şubeyi günceller. */
export async function updateBranch(id: string, values: BranchFormValues): Promise<Branch> {
  const { data } = await apiClient.patch<Branch>(`/branches/${id}`, values);
  return data;
}

/** `DELETE /branches/:id` — şubeyi siler. */
export async function deleteBranch(id: string): Promise<void> {
  await apiClient.delete(`/branches/${id}`);
}

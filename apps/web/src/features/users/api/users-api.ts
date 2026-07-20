import { apiClient } from '../../../lib/api-client';
import type { UserFormValues } from '../schemas';
import type { User } from '../types';

/**
 * Kullanıcı (User) HTTP çağrıları (§9.3). Tüm uç noktalar yalnızca FIRM_ADMIN'e
 * açıktır. `tenantId` istemciden gönderilmez — sunucu JWT bağlamından çözer.
 */

/**
 * Form değerlerini API gövdesine çevirir:
 * - boş `branchId` → alan hiç gönderilmez (şube atanmadı)
 * - boş `password` → alan hiç gönderilmez (düzenlemede şifre değişmez)
 */
function toPayload(values: UserFormValues): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    fullName: values.fullName,
    email: values.email,
    role: values.role,
    isActive: values.isActive,
  };
  if (values.branchId) {
    payload.branchId = values.branchId;
  }
  if (values.password) {
    payload.password = values.password;
  }
  return payload;
}

/** `GET /users` — aktif firmanın tüm kullanıcıları (şifre hariç). */
export async function fetchUsers(): Promise<User[]> {
  const { data } = await apiClient.get<User[]>('/users');
  return data;
}

/** `POST /users` — yeni kullanıcı oluşturur (şifre zorunlu). */
export async function createUser(values: UserFormValues): Promise<User> {
  const { data } = await apiClient.post<User>('/users', toPayload(values));
  return data;
}

/** `PATCH /users/:id` — kullanıcıyı günceller (şifre boşsa değişmez). */
export async function updateUser(id: string, values: UserFormValues): Promise<User> {
  const { data } = await apiClient.patch<User>(`/users/${id}`, toPayload(values));
  return data;
}

/** `DELETE /users/:id` — kullanıcıyı siler (kendi hesabı silinemez → 400). */
export async function deleteUser(id: string): Promise<void> {
  await apiClient.delete(`/users/${id}`);
}

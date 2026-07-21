import { apiClient } from '../../../lib/api-client';
import type { Movement, MovementAction, MovementDetail, MovementFilters } from '../types';

/**
 * Transfer (StockMovement) HTTP çağrıları (§9.6). Her fonksiyon tek bir uç
 * noktayı sarar; TanStack Query hook'ları bunları tüketir. `tenantId` istemciden
 * gönderilmez — sunucu JWT bağlamından çözer.
 */

/** `POST /movements` gövdesi — çoklu ürün kalemi. */
export interface CreateMovementPayload {
  sourceBranchId: string;
  destinationBranchId: string;
  note?: string;
  items: { productId: string; quantity: number }[];
}

/** `GET /movements?status=&branchId=` — en yeni önce, kalem ve şube bilgisiyle. */
export async function fetchMovements(filters: MovementFilters): Promise<Movement[]> {
  const { data } = await apiClient.get<Movement[]>('/movements', {
    params: { status: filters.status, branchId: filters.branchId },
  });
  return data;
}

/** `GET /movements/:id` — ürünlü kalemler, şubeler ve aktörlerle detay. */
export async function fetchMovement(id: string): Promise<MovementDetail> {
  const { data } = await apiClient.get<MovementDetail>(`/movements/${id}`);
  return data;
}

/** `POST /movements` — yeni transfer talebi (PENDING). */
export async function createMovement(payload: CreateMovementPayload): Promise<Movement> {
  const { data } = await apiClient.post<Movement>('/movements', payload);
  return data;
}

/**
 * `POST /movements/:id/<action>` — durum geçişi.
 *
 * Beş aksiyon da aynı şekli paylaşır (gövdesiz POST, güncel hareketi döner);
 * bu yüzden tek fonksiyonla ifade edilir. Geçişin o durumda geçerli olup
 * olmadığını backend'deki durum makinesi denetler.
 */
export async function runMovementAction(id: string, action: MovementAction): Promise<Movement> {
  const { data } = await apiClient.post<Movement>(`/movements/${id}/${action}`);
  return data;
}

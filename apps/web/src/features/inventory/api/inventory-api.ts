import { apiClient } from '../../../lib/api-client';
import type { InventoryFilters, InventoryItem } from '../types';

/**
 * Envanter (Inventory) HTTP çağrıları (§9.5). Her fonksiyon tek bir uç noktayı
 * sarar; TanStack Query hook'ları (useInventory / useInventoryMutations) bunları
 * tüketir. `tenantId` istemciden gönderilmez — sunucu JWT bağlamından çözer.
 */

/** `POST /inventory/adjust` gövdesi. `quantity` delta'dır (bkz. schemas.ts). */
export interface AdjustStockPayload {
  branchId: string;
  productId: string;
  quantity: number;
  reason: string;
}

/** `GET /inventory?branchId=&lowStock=` — ürün ve şube ilişkileriyle stok kayıtları. */
export async function fetchInventory(filters: InventoryFilters): Promise<InventoryItem[]> {
  const { data } = await apiClient.get<InventoryItem[]>('/inventory', {
    // `lowStock` yalnızca true iken gönderilir; false göndermek gereksiz parametre üretir.
    params: {
      branchId: filters.branchId,
      ...(filters.lowStock ? { lowStock: true } : {}),
    },
  });
  return data;
}

/** `POST /inventory/adjust` — stok düzeltir ve InventoryLog audit satırı yazar. */
export async function adjustStock(payload: AdjustStockPayload): Promise<InventoryItem> {
  const { data } = await apiClient.post<InventoryItem>('/inventory/adjust', payload);
  return data;
}

/**
 * `PATCH /inventory/:id/threshold` — düşük stok eşiğini günceller.
 * Ayar değişikliğidir: stok miktarı değişmez, audit kaydı yazılmaz.
 */
export async function updateThreshold(id: string, minThreshold: number): Promise<InventoryItem> {
  const { data } = await apiClient.patch<InventoryItem>(`/inventory/${id}/threshold`, {
    minThreshold,
  });
  return data;
}

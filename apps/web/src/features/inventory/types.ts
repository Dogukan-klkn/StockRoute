import type { Branch } from '../branches/types';
import type { Product } from '../products/types';

/**
 * Envanter (Inventory) API yanıt tipi.
 *
 * Backend `InventoryWithRelations` şeklini yansıtır: `GET /inventory` kayıtları
 * ilişkili `product` ve `branch` ile birlikte döner (bkz. inventory.service.ts).
 * Düşük stok eşiği ürün üzerinde değil bu kayıttadır (`minThreshold`), çünkü eşik
 * şube bazlıdır (schema.prisma — Inventory).
 */
export interface InventoryItem {
  id: string;
  tenantId: string;
  branchId: string;
  productId: string;
  quantity: number;
  minThreshold: number;
  updatedAt: string;
  product: Product;
  branch: Branch;
}

/** `GET /inventory` query parametreleri (§9.5). */
export interface InventoryFilters {
  branchId?: string;
  /** true ise yalnızca `quantity <= minThreshold` kayıtları döner. */
  lowStock?: boolean;
}

/** Bir envanter kaydının düşük stokta olup olmadığını belirler (backend ile aynı kural). */
export function isLowStock(item: InventoryItem): boolean {
  return item.quantity <= item.minThreshold;
}

import type { ProductUnit } from '@stockroute/shared-types';

/** Seçilebilir şube (GET /branches/selectable — minimal liste). */
export interface SelectableBranch {
  id: string;
  name: string;
  code: string;
}

/** Ürün (GET /inventory içindeki product ilişkisi). */
export interface Product {
  id: string;
  tenantId: string;
  name: string;
  sku: string;
  barcode: string | null;
  unit: ProductUnit;
  category: string | null;
  description: string | null;
  isActive: boolean;
}

/**
 * Envanter kaydı (GET /inventory — product + branch ilişkileriyle).
 * Backend `InventoryWithRelations` şeklini yansıtır (bkz. apps/api inventory.service).
 * Düşük stok eşiği şube bazlıdır: kayıt üzerindeki `minThreshold`.
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
  branch: { id: string; name: string; code: string };
}

/** Düşük stok kuralı — backend ile birebir (`quantity <= minThreshold`). */
export function isLowStock(item: InventoryItem): boolean {
  return item.quantity <= item.minThreshold;
}

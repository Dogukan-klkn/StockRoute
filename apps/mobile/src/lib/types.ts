import type { MovementStatus, ProductUnit } from '@stockroute/shared-types';

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

/** Transfer kalemi (GET /movements → items; liste görünümünde ürün ilişkisi yok). */
export interface MovementItem {
  id: string;
  movementId: string;
  productId: string;
  quantity: number;
}

/**
 * Stok hareketi / transfer (GET /movements — items + kaynak/hedef şube ile).
 * Backend `MovementListItem` şeklini yansıtır (movements.service.ts).
 *
 * NOT: Liste yanıtındaki `items` ürün ilişkisi İÇERMEZ (yalnızca productId).
 * Bu yüzden mobil kartta ürün adı değil, kalem sayısı ve toplam adet gösterilir.
 */
export interface Movement {
  id: string;
  tenantId: string;
  sourceBranchId: string;
  destinationBranchId: string;
  status: MovementStatus;
  note: string | null;
  createdAt: string;
  shippedAt: string | null;
  receivedAt: string | null;
  items: MovementItem[];
  sourceBranch: { id: string; name: string; code: string };
  destinationBranch: { id: string; name: string; code: string };
}

/**
 * Transfer numarası: cuid okunaksız olduğundan son 6 karakter gösterilir.
 * Web ile birebir aynı biçim (apps/web/.../movement-format.ts) — iki platform
 * aynı transferi aynı numarayla göstersin. Yalnızca görüntü amaçlıdır;
 * API çağrılarında her zaman tam `id` kullanılır.
 */
export function shortMovementId(id: string): string {
  return `#${id.slice(-6).toLocaleUpperCase('tr')}`;
}

/** Tarih biçimi — web ile aynı ("30 Haz 2026, 14:20"). */
export function formatMovementDate(iso: string): string {
  return new Date(iso).toLocaleString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

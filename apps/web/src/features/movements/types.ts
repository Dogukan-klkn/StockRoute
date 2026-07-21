import type { MovementStatus } from '@stockroute/shared-types';
import type { Branch } from '../branches/types';
import type { Product } from '../products/types';

/**
 * Transfer kalemi (StockMovementItem).
 *
 * `product` yalnızca **detay** yanıtında (`GET /movements/:id`) gelir; liste
 * yanıtında kalemler ürün ilişkisi olmadan döner (bkz. movements.service.ts —
 * MovementListItem vs MovementDetail).
 */
export interface MovementItem {
  id: string;
  movementId: string;
  productId: string;
  quantity: number;
}

/** Detay yanıtındaki, ürün bilgisi çözümlenmiş kalem. */
export interface MovementItemWithProduct extends MovementItem {
  product: Product;
}

/** Transfer aktörü (talep eden / onaylayan / sevk eden / teslim alan) özeti. */
export interface MovementActor {
  id: string;
  fullName: string;
  email: string;
}

/**
 * Transfer (StockMovement) ortak alanları — backend Prisma modelini yansıtır
 * (bkz. schema.prisma — StockMovement). Tarih alanları ISO string olarak gelir.
 */
interface MovementBase {
  id: string;
  tenantId: string;
  sourceBranchId: string;
  destinationBranchId: string;
  status: MovementStatus;
  note: string | null;
  requestedById: string;
  approvedById: string | null;
  shippedById: string | null;
  receivedById: string | null;
  createdAt: string;
  approvedAt: string | null;
  shippedAt: string | null;
  receivedAt: string | null;
  updatedAt: string;
}

/** `GET /movements` liste öğesi: kalemler + kaynak/hedef şube. */
export interface Movement extends MovementBase {
  items: MovementItem[];
  sourceBranch: Branch;
  destinationBranch: Branch;
}

/** `GET /movements/:id` detayı: ürünlü kalemler + şubeler + tüm aktörler. */
export interface MovementDetail extends MovementBase {
  items: MovementItemWithProduct[];
  sourceBranch: Branch;
  destinationBranch: Branch;
  requestedBy: MovementActor;
  approvedBy: MovementActor | null;
  shippedBy: MovementActor | null;
  receivedBy: MovementActor | null;
}

/** `GET /movements` query parametreleri (§9.6). */
export interface MovementFilters {
  status?: MovementStatus;
  /** Şubenin kaynak **veya** hedef olduğu hareketleri getirir. */
  branchId?: string;
}

/** Durum geçişi aksiyonları — `POST /movements/:id/<action>`. */
export type MovementAction = 'approve' | 'reject' | 'ship' | 'receive' | 'cancel';

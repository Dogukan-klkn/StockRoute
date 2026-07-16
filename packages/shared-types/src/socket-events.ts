/**
 * Gerçek zamanlı olay kataloğu (bkz. implementation_plan.md §10).
 *
 * Sunucu → istemci Socket.io olaylarının adları ve payload tipleri burada
 * tanımlanır; `api`, `web` ve `mobile` bu sabitleri import eder. Olay adı
 * hiçbir yerde hardcode string olarak yazılmaz — tek doğruluk kaynağı burasıdır.
 *
 * Not: `tenantId` payload'lara KONMAZ; tenant izolasyonu sunucu tarafında
 * `tenant_{id}` room yönlendirmesiyle sağlanır (plan §2.2, §6.1).
 */

export const SOCKET_EVENTS = {
  INVENTORY_UPDATED: 'inventory:updated',
  MOVEMENT_CREATED: 'movement:created',
  MOVEMENT_STATUS_CHANGED: 'movement:statusChanged',
  NOTIFICATION: 'notification',
} as const;

/** Katalogdaki olay adlarının birleşim tipi (örn. 'inventory:updated'). */
export type SocketEventName = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

/** `inventory:updated` — stok düzeltme / transfer sevk-teslim sonrası yeni miktar. */
export interface InventoryUpdatedPayload {
  branchId: string;
  productId: string;
  quantity: number;
}

/** `movement:created` — yeni transfer talebi oluşturulduğunda. */
export interface MovementCreatedPayload {
  movement: {
    id: string;
    sourceBranchId: string;
    destinationBranchId: string;
    status: string;
    // Not: Prisma tipi burada import edilmez; yalnızca istemcinin ihtiyaç
    // duyduğu alanlar listelenir (paket framework-bağımsız kalır).
  };
}

/** `movement:statusChanged` — onay/sevk/teslim/red gibi durum geçişlerinde. */
export interface MovementStatusChangedPayload {
  movementId: string;
  status: string;
  /** İlgili şubeler: [sourceBranchId, destinationBranchId]. */
  branchIds: string[];
}

export type NotificationLevel = 'info' | 'warning' | 'error' | 'success';

/** `notification` — genel bilgilendirme (örn. düşük stok uyarısı). */
export interface NotificationPayload {
  type: string;
  title: string;
  message: string;
  level: NotificationLevel;
}

import { MovementStatus } from '@stockroute/shared-types';

/**
 * Transfer durumlarının Türkçe etiketleri — chip, filtre ve detay için tek kaynak.
 * Renkler `@stockroute/ui-tokens`'taki `statusColors`'tan gelir (bkz. theme/index.ts);
 * burada yeniden tanımlanmaz.
 */
export const MOVEMENT_STATUS_LABELS: Record<MovementStatus, string> = {
  [MovementStatus.PENDING]: 'Beklemede',
  [MovementStatus.APPROVED]: 'Onaylandı',
  [MovementStatus.IN_TRANSIT]: 'Yolda',
  [MovementStatus.RECEIVED]: 'Teslim Alındı',
  [MovementStatus.REJECTED]: 'Reddedildi',
  [MovementStatus.CANCELLED]: 'İptal',
};

/**
 * Filtre çubuğunda gösterilecek durumlar ve sıraları (mockup: web-transferler).
 * Mockup'ta "İptal" chip'i yoktur; durum makinesinde var olduğu için listeye
 * eklenir, aksi halde iptal edilen transferler yalnızca "Tümü"nde görünürdü.
 */
export const MOVEMENT_STATUS_ORDER: readonly MovementStatus[] = [
  MovementStatus.PENDING,
  MovementStatus.APPROVED,
  MovementStatus.IN_TRANSIT,
  MovementStatus.RECEIVED,
  MovementStatus.REJECTED,
  MovementStatus.CANCELLED,
];

/**
 * Terminal durumlar: bu durumlarda hiçbir durum geçişi aksiyonu yapılamaz
 * (bkz. movements.service.ts — durum makinesi).
 */
export const TERMINAL_STATUSES: readonly MovementStatus[] = [
  MovementStatus.RECEIVED,
  MovementStatus.REJECTED,
  MovementStatus.CANCELLED,
];

/** Bir transferin terminal (aksiyon alınamaz) durumda olup olmadığını söyler. */
export function isTerminalStatus(status: MovementStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}

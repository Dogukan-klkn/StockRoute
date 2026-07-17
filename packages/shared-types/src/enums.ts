/**
 * Ortak enum'lar — Prisma şemasındaki (apps/api/prisma/schema.prisma) enum'larla
 * birebir aynı değerleri taşır; web/mobil istemciler Prisma client'a bağımlı
 * olmadan bu tipleri tüketir (bkz. implementation_plan.md §5.5).
 */

/** Kullanıcı rolleri (plan §9.2 rol matrisi). */
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  FIRM_ADMIN = 'FIRM_ADMIN',
  BRANCH_MANAGER = 'BRANCH_MANAGER',
  WAREHOUSE_STAFF = 'WAREHOUSE_STAFF',
  FIELD_STAFF = 'FIELD_STAFF',
}

/** Transfer (StockMovement) yaşam döngüsü durumları (plan §8). */
export enum MovementStatus {
  /** Talep oluşturuldu */
  PENDING = 'PENDING',
  /** Yetkili onayladı */
  APPROVED = 'APPROVED',
  /** Sevk edildi (kaynaktan düşüldü) */
  IN_TRANSIT = 'IN_TRANSIT',
  /** Teslim alındı (hedefe eklendi) */
  RECEIVED = 'RECEIVED',
  /** Reddedildi */
  REJECTED = 'REJECTED',
  /** Talep eden iptal etti */
  CANCELLED = 'CANCELLED',
}

/** Ürün birimi. */
export enum ProductUnit {
  PIECE = 'PIECE',
  KG = 'KG',
  LITER = 'LITER',
  BOX = 'BOX',
  PACK = 'PACK',
}

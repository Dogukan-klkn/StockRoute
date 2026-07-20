import { UserRole } from '@stockroute/shared-types';

/**
 * Rol etiketleri ve renkleri — tek doğruluk kaynağı.
 *
 * Gün 14'te `UserBadge` içinde tanımlanan kurallar buraya taşındı; hem topbar
 * rozeti hem Kullanıcılar tablosundaki rol chip'i aynı değerleri kullanır
 * (bkz. plan §11 — tasarım tutarlılığı).
 */
export const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: 'Süper Admin',
  [UserRole.FIRM_ADMIN]: 'Firma Yöneticisi',
  [UserRole.BRANCH_MANAGER]: 'Şube Müdürü',
  [UserRole.WAREHOUSE_STAFF]: 'Depo Personeli',
  [UserRole.FIELD_STAFF]: 'Saha Personeli',
};

/** Rol etiketinin rengi — sx renk yolu olarak (theme paletinden çözülür). */
export const ROLE_COLORS: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: 'primary.dark',
  [UserRole.FIRM_ADMIN]: 'primary.main',
  [UserRole.BRANCH_MANAGER]: 'info.main',
  [UserRole.WAREHOUSE_STAFF]: 'warning.main',
  [UserRole.FIELD_STAFF]: 'text.secondary',
};

/**
 * Rol chip'i için MUI `Chip` renk adı. `ROLE_COLORS` sx yolu verirken bu,
 * hazır MUI palet rolüne eşler (Kullanıcılar tablosundaki renkli chip'ler).
 */
export const ROLE_CHIP_COLORS: Record<UserRole, 'primary' | 'info' | 'warning' | 'default'> = {
  [UserRole.SUPER_ADMIN]: 'primary',
  [UserRole.FIRM_ADMIN]: 'primary',
  [UserRole.BRANCH_MANAGER]: 'info',
  [UserRole.WAREHOUSE_STAFF]: 'warning',
  [UserRole.FIELD_STAFF]: 'default',
};

/**
 * Kullanıcı formunda seçilebilecek roller. `SUPER_ADMIN` tenant üstü bir roldür;
 * firma yöneticisi tarafından atanamaz, bu yüzden listelenmez (bkz. plan §8).
 */
export const ASSIGNABLE_ROLES: UserRole[] = [
  UserRole.FIRM_ADMIN,
  UserRole.BRANCH_MANAGER,
  UserRole.WAREHOUSE_STAFF,
  UserRole.FIELD_STAFF,
];

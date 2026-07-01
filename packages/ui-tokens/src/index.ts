/**
 * @stockroute/ui-tokens — StockRoute tasarım token'ları.
 *
 * Kaynak: implementation_plan.md §11 (Tasarım Sistemi & Marka).
 * Bu token'lar web (MUI teması) ve mobil (RN teması) tarafından tüketilir;
 * böylece her iki istemci tek bir görsel dile uyar.
 */

/* ------------------------------------------------------------------ */
/* 11.1 Renk Paleti                                                    */
/* ------------------------------------------------------------------ */

/**
 * Ana renk paleti (§11.1). Her renk rolü, plandaki HEX değeriyle birebir.
 */
export const colors = {
  /** Ana aksiyon, vurgular, marka — Blue 600 */
  primary: '#2563EB',
  /** Hover, başlık — Blue 800 */
  primaryDark: '#1E40AF',
  /** Stok girişi, teslim alındı — Green 600 */
  success: '#16A34A',
  /** Beklemede / yolda — Amber 500 */
  warning: '#F59E0B',
  /** Reddedildi / düşük stok — Red 600 */
  danger: '#DC2626',
  /** Sayfa arka planı — Slate 50 */
  background: '#F8FAFC',
  /** Kart, tablo — White */
  surface: '#FFFFFF',
  /** Çizgi, kenarlık — Slate 200 */
  border: '#E2E8F0',
  /** Ana metin — Slate 900 */
  textPrimary: '#0F172A',
  /** İkincil metin — Slate 500 */
  textSecondary: '#64748B',
} as const;

/**
 * Transfer durum renkleri (§11.1 — "Durum renkleri (transfer)").
 * MovementStatus değerleriyle hizalıdır (bkz. shared-types enums).
 *
 * PENDING → Amber, APPROVED → Blue, IN_TRANSIT → Mavi-mor,
 * RECEIVED → Green, REJECTED/CANCELLED → Red/Gri.
 */
export const statusColors = {
  PENDING: colors.warning,
  APPROVED: colors.primary,
  /** Yolda — mavi-mor */
  IN_TRANSIT: '#6366F1',
  RECEIVED: colors.success,
  REJECTED: colors.danger,
  /** İptal — gri */
  CANCELLED: colors.textSecondary,
} as const;

/* ------------------------------------------------------------------ */
/* 11.2 Tipografi                                                      */
/* ------------------------------------------------------------------ */

/**
 * Tipografi token'ları (§11.2).
 * - Ana font: Inter (web + mobil). Başlıklar 600/700, gövde 400/500.
 * - Kod/SKU/barkod: monospace (Roboto Mono).
 * - Ölçek: 12 / 14 / 16 / 20 / 24 / 32 px.
 */
export const typography = {
  fontFamily: {
    /** Ana font (web + mobil) */
    base: "'Inter', sans-serif",
    /** Kod / SKU / barkod */
    mono: "'Roboto Mono', monospace",
  },
  fontWeight: {
    /** Gövde metni (normal) */
    regular: 400,
    /** Gövde metni (vurgulu) */
    medium: 500,
    /** Başlık (yarı-kalın) */
    semibold: 600,
    /** Başlık (kalın) */
    bold: 700,
  },
  /** Font boyutu ölçeği (px) */
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
  },
} as const;

/* ------------------------------------------------------------------ */
/* 11.3 Spacing & Şekil                                                */
/* ------------------------------------------------------------------ */

/**
 * Spacing skalası (§11.3): 4 / 8 / 12 / 16 / 24 / 32 (px).
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

/**
 * Köşe yarıçapı (§11.3).
 * - 8px → kart / buton
 * - 4px → chip / input
 * - 22px → app icon (1:1)
 */
export const radius = {
  /** Chip / input */
  sm: 4,
  /** Kart / buton */
  md: 8,
  /** App icon (1:1) */
  appIcon: 22,
} as const;

/**
 * Gölge token'ları (§11.3): hafif gölge.
 */
export const shadows = {
  sm: '0 1px 3px rgba(0,0,0,0.08)',
} as const;

/* ------------------------------------------------------------------ */
/* Toplu tema nesnesi                                                  */
/* ------------------------------------------------------------------ */

/**
 * Tüm token'ları tek bir tema nesnesinde toplar.
 * MUI `createTheme` ve RN tema fabrikaları buradan beslenir.
 */
export const tokens = {
  colors,
  statusColors,
  typography,
  spacing,
  radius,
  shadows,
} as const;

/* ------------------------------------------------------------------ */
/* Tip yardımcıları                                                    */
/* ------------------------------------------------------------------ */

export type Colors = typeof colors;
export type ColorToken = keyof Colors;
export type StatusColors = typeof statusColors;
export type Typography = typeof typography;
export type Spacing = typeof spacing;
export type SpacingToken = keyof Spacing;
export type Radius = typeof radius;
export type Shadows = typeof shadows;
export type Tokens = typeof tokens;

export default tokens;

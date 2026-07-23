/**
 * Mobil tema — @stockroute/ui-tokens'tan beslenir.
 *
 * Web (MUI) ve mobil (React Native) tek bir görsel dilden gelir: renkler,
 * spacing, radius, tipografi ölçeği aynı token kaynağından (implementation_plan.md §11).
 * React Native'de MUI yoktur; token'lar düz bir tema nesnesi olarak export edilir
 * ve `StyleSheet` içinde tüketilir. Hardcoded HEX kullanılmaz.
 */
import { colors, radius, spacing, statusColors, typography } from '@stockroute/ui-tokens';

/**
 * RN tema nesnesi. ui-tokens'ın alt kümesini mobil kullanıma uygun biçimde
 * yeniden paketler. `statusColors` Gün 20 transfer chip'leri için hazırdır.
 */
export const theme = {
  colors,
  statusColors,
  spacing,
  radius,
  /** Modal/overlay arka plan karartması (ui-tokens'ta karşılığı yok; mobil-özel). */
  overlay: 'rgba(0, 0, 0, 0.4)',
  /**
   * RN font ölçeği — ui-tokens.typography.fontSize'ı sayısal olarak taşır.
   * (Web'deki string font-family MUI içindir; RN sistem fontunu kullanır,
   * özel font yüklenene dek fontFamily belirtilmez.)
   */
  fontSize: typography.fontSize,
  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;

export type Theme = typeof theme;

export { colors, statusColors, spacing, radius };

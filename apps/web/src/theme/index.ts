import { createTheme } from '@mui/material/styles';
import { colors, radius, shadows, statusColors, typography } from '@stockroute/ui-tokens';

/**
 * StockRoute MUI teması — plan §11 tasarım sistemini uygular.
 * Tüm değerler @stockroute/ui-tokens paketinden gelir; hardcoded HEX yok.
 */
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: colors.primary,
      dark: colors.primaryDark,
      contrastText: colors.surface,
    },
    success: { main: colors.success },
    warning: { main: colors.warning },
    error: { main: colors.danger },
    background: { default: colors.background, paper: colors.surface },
    divider: colors.border,
    text: { primary: colors.textPrimary, secondary: colors.textSecondary },
  },
  typography: {
    fontFamily: typography.fontFamily.base,
    h1: { fontWeight: typography.fontWeight.bold },
    h2: { fontWeight: typography.fontWeight.bold },
    h3: { fontWeight: typography.fontWeight.semibold, fontSize: typography.fontSize.xxl },
    h4: { fontWeight: typography.fontWeight.semibold },
    h5: { fontWeight: typography.fontWeight.semibold },
    h6: { fontWeight: typography.fontWeight.semibold },
    body1: { fontWeight: typography.fontWeight.regular },
    body2: { fontWeight: typography.fontWeight.regular },
    button: { fontWeight: typography.fontWeight.medium, textTransform: 'none' },
  },
  shape: { borderRadius: radius.md },
  components: {
    MuiButton: {
      styleOverrides: { root: { borderRadius: radius.md, boxShadow: 'none' } },
    },
    MuiPaper: {
      styleOverrides: { root: { boxShadow: shadows.sm } },
    },
    MuiChip: {
      styleOverrides: { root: { borderRadius: radius.sm } },
    },
    MuiOutlinedInput: {
      styleOverrides: { root: { borderRadius: radius.sm } },
    },
  },
});

/** Transfer durum chip renkleri (Gün 15+ tüketecek). */
export { statusColors };

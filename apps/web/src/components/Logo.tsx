import { Box } from '@mui/material';
import { colors } from '@stockroute/ui-tokens';

interface LogoProps {
  variant: 'small' | 'large';
}

/** Varyant başına logo yüksekliği (px) — plan §11.4 referans SVG oranı 240x48. */
const LOGO_HEIGHT: Record<LogoProps['variant'], number> = {
  small: 32,
  large: 48,
};

/**
 * StockRoute yatay wordmark logosu (plan §11.4 referans SVG).
 * docs/brand/ altında SVG bulunmadığından referans SVG inline kullanılır.
 */
export function Logo({ variant }: LogoProps) {
  const height = LOGO_HEIGHT[variant];
  return (
    <Box
      component="svg"
      role="img"
      aria-label="StockRoute"
      viewBox="0 0 240 48"
      sx={{ height, width: 'auto', display: 'block' }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 32 C 26 12, 44 12, 56 28"
        stroke={colors.primary}
        strokeWidth={3}
        fill="none"
        strokeLinecap="round"
        strokeDasharray="2 6"
      />
      <rect x={4} y={28} width={14} height={14} rx={3} fill={colors.primaryDark} />
      <path
        d="M56 12 a8 8 0 0 1 8 8 c0 6 -8 14 -8 14 s-8 -8 -8 -14 a8 8 0 0 1 8 -8 z"
        fill={colors.primary}
      />
      <circle cx={56} cy={20} r={3} fill={colors.surface} />
      <text x={78} y={33} fontFamily="Inter, sans-serif" fontSize={22} fontWeight={700}>
        <tspan fill={colors.textPrimary}>Stock</tspan>
        <tspan fill={colors.primary}>Route</tspan>
      </text>
    </Box>
  );
}

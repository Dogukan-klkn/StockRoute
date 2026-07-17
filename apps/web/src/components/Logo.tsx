import { Box } from '@mui/material';

interface LogoProps {
  variant: 'small' | 'large';
}

/** Varyant başına logo yüksekliği (px). */
const LOGO_HEIGHT: Record<LogoProps['variant'], number> = {
  small: 32,
  large: 48,
};

/** StockRoute yatay marka logosu (docs/brand kaynaklı, kenarları kırpılmış kopya). */
export function Logo({ variant }: LogoProps) {
  return (
    <Box
      component="img"
      src="/stockroute-logo.png"
      alt="StockRoute"
      sx={{ height: LOGO_HEIGHT[variant], width: 'auto', display: 'block' }}
    />
  );
}

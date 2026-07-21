import { Chip } from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { MovementStatus } from '@stockroute/shared-types';
import { statusColors } from '../../theme';
import { MOVEMENT_STATUS_LABELS } from './movement-status';

/**
 * Transfer durumu chip'i (mockup: web-transferler — noktalı, soft arka planlı).
 *
 * Renk `@stockroute/ui-tokens`'taki `statusColors`'tan gelir; bileşen kendi
 * paletini tanımlamaz (bkz. plan §11 — hardcoded HEX yok).
 */
interface MovementStatusChipProps {
  status: MovementStatus;
  size?: 'small' | 'medium';
}

export function MovementStatusChip({ status, size = 'small' }: MovementStatusChipProps) {
  const color = statusColors[status];

  return (
    <Chip
      size={size}
      label={MOVEMENT_STATUS_LABELS[status]}
      // Mockup'taki nokta göstergesi: chip'in kendi renginde küçük bir daire.
      icon={
        <span
          aria-hidden
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: color,
            marginLeft: 8,
            marginRight: -2,
          }}
        />
      }
      sx={{
        color,
        backgroundColor: alpha(color, 0.12),
        fontWeight: 500,
        border: 'none',
      }}
    />
  );
}

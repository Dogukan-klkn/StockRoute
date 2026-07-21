import { Button, Stack } from '@mui/material';
import type { MovementAction } from './types';
import { MOVEMENT_ACTION_RULES } from './movement-actions';

/** Aksiyon başına buton görünümü (mockup: web-transferler satır aksiyonları). */
const ACTION_STYLE: Record<
  MovementAction,
  { color: 'success' | 'error' | 'primary' | 'inherit'; variant: 'contained' | 'outlined' }
> = {
  approve: { color: 'success', variant: 'contained' },
  reject: { color: 'error', variant: 'outlined' },
  ship: { color: 'primary', variant: 'contained' },
  receive: { color: 'success', variant: 'contained' },
  cancel: { color: 'inherit', variant: 'outlined' },
};

/**
 * Durum geçişi butonları — hem liste satırında hem detay modalında kullanılır.
 *
 * Hangi aksiyonların görüneceğine bu bileşen karar vermez; `actions` dışarıdan
 * (movement-actions.ts kuralları ile) hesaplanmış olarak gelir.
 */
interface MovementActionButtonsProps {
  actions: readonly MovementAction[];
  size?: 'small' | 'medium';
  disabled?: boolean;
  onAction: (action: MovementAction) => void;
}

export function MovementActionButtons({
  actions,
  size = 'small',
  disabled = false,
  onAction,
}: MovementActionButtonsProps) {
  if (actions.length === 0) {
    return null;
  }

  return (
    <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
      {actions.map((action) => {
        const style = ACTION_STYLE[action];
        return (
          <Button
            key={action}
            size={size}
            color={style.color}
            variant={style.variant}
            disabled={disabled}
            onClick={(event) => {
              // Liste satırında buton tıklaması satırın detay modalını açmasın.
              event.stopPropagation();
              onAction(action);
            }}
          >
            {MOVEMENT_ACTION_RULES[action].label}
          </Button>
        );
      })}
    </Stack>
  );
}

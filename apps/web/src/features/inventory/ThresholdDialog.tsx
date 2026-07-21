import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { PRODUCT_UNIT_LABELS } from '../products/schemas';
import { thresholdSchema, type ThresholdFormInput, type ThresholdFormValues } from './schemas';
import type { InventoryItem } from './types';

/**
 * Düşük stok eşiği düzenleme modalı.
 *
 * Stok düzeltmeden ayrı tutulur: eşik bir **ayardır** (stok miktarını değiştirmez,
 * audit kaydı yazmaz), stok düzeltme ise bir harekettir. Bu ayrım backend'de de
 * korunur (PATCH /inventory/:id/threshold vs POST /inventory/adjust).
 */
interface ThresholdDialogProps {
  open: boolean;
  /** Eşiği düzenlenecek envanter kaydı; modal kapalıyken `null`. */
  item: InventoryItem | null;
  submitting: boolean;
  onSubmit: (values: ThresholdFormValues) => void;
  onClose: () => void;
}

export function ThresholdDialog({
  open,
  item,
  submitting,
  onSubmit,
  onClose,
}: ThresholdDialogProps) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ThresholdFormInput, unknown, ThresholdFormValues>({
    resolver: zodResolver(thresholdSchema),
    defaultValues: { minThreshold: 0 },
  });

  // Modal açıldığında mevcut eşik değerini yükle.
  useEffect(() => {
    if (open && item) {
      reset({ minThreshold: item.minThreshold });
    }
  }, [open, item, reset]);

  const unitLabel = item ? PRODUCT_UNIT_LABELS[item.product.unit].toLocaleLowerCase('tr') : '';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle
        sx={{
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        Düşük Stok Eşiği
        <IconButton onClick={onClose} size="small" aria-label="Kapat">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            {item ? (
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {item.product.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {item.product.sku} · Mevcut stok: {item.quantity} {unitLabel}
                </Typography>
              </Box>
            ) : null}

            <Controller
              name="minThreshold"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  type="number"
                  label="Min. Eşik"
                  required
                  fullWidth
                  error={Boolean(errors.minThreshold)}
                  helperText={
                    errors.minThreshold?.message ??
                    'Stok bu değerin altına inince "Düşük Stok" olarak işaretlenir'
                  }
                />
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={onClose} color="inherit" disabled={submitting}>
            İptal
          </Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            Kaydet
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

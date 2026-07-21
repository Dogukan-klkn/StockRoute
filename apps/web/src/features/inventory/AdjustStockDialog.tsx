import { useEffect } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
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
import {
  adjustStockSchema,
  type AdjustStockFormInput,
  type AdjustStockFormValues,
} from './schemas';
import type { InventoryItem } from './types';

/**
 * Stok düzeltme modalı (mockup: web-envanter — "Stok Düzelt").
 *
 * Backend `quantity` alanını **delta** olarak yorumlar (mevcut + değişim = yeni),
 * bu yüzden form tek bir "Miktar Değişimi" alanı sunar ve karışıklığı önlemek
 * için mevcut miktarı ile hesaplanan yeni miktarı canlı gösterir.
 */
interface AdjustStockDialogProps {
  open: boolean;
  /** Düzeltilecek envanter kaydı; modal kapalıyken `null`. */
  item: InventoryItem | null;
  submitting: boolean;
  onSubmit: (values: AdjustStockFormValues) => void;
  onClose: () => void;
}

// Sayısal alan boş başlar; zod `coerce` doğrulamada sayıya çevirir.
const EMPTY_VALUES: AdjustStockFormInput = {
  quantity: '',
  reason: '',
};

export function AdjustStockDialog({
  open,
  item,
  submitting,
  onSubmit,
  onClose,
}: AdjustStockDialogProps) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AdjustStockFormInput, unknown, AdjustStockFormValues>({
    resolver: zodResolver(adjustStockSchema),
    defaultValues: EMPTY_VALUES,
  });

  // Modal her açıldığında formu sıfırla (önceki kaydın değerleri taşınmasın).
  useEffect(() => {
    if (open) {
      reset(EMPTY_VALUES);
    }
  }, [open, reset]);

  const quantityInput = useWatch({ control, name: 'quantity' });
  const delta = Number(quantityInput);
  const hasValidDelta = quantityInput !== '' && Number.isFinite(delta);
  const newQuantity = item && hasValidDelta ? item.quantity + delta : null;
  const unitLabel = item ? PRODUCT_UNIT_LABELS[item.product.unit] : '';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        Stok Düzelt
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
                  {item.product.sku} · {item.branch.name}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Mevcut: <strong>{item.quantity}</strong> {unitLabel.toLowerCase()}
                </Typography>
              </Box>
            ) : null}

            <Controller
              name="quantity"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  type="number"
                  label="Miktar Değişimi"
                  placeholder="Örn: 50 veya -10"
                  required
                  fullWidth
                  error={Boolean(errors.quantity)}
                  helperText={
                    errors.quantity?.message ??
                    'Eklemek için pozitif, düşmek için negatif değer girin'
                  }
                />
              )}
            />

            {newQuantity !== null ? (
              <Alert severity={newQuantity < 0 ? 'error' : 'info'} variant="outlined">
                {newQuantity < 0
                  ? `Yeni miktar negatif olamaz (${newQuantity}). Stok negatife düşürülemez.`
                  : `Yeni miktar: ${newQuantity} ${unitLabel.toLowerCase()}`}
              </Alert>
            ) : null}

            <Controller
              name="reason"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Düzeltme Nedeni"
                  placeholder="Örn: Sayım farkı — raf sayımında 5 adet eksik"
                  required
                  fullWidth
                  multiline
                  minRows={2}
                  error={Boolean(errors.reason)}
                  helperText={errors.reason?.message ?? 'Düzeltme kaydı denetim izine yazılır'}
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

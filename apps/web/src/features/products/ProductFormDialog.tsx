import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { ProductUnit } from '@stockroute/shared-types';
import { PRODUCT_UNIT_LABELS, productFormSchema, type ProductFormValues } from './schemas';
import type { Product } from './types';

/**
 * Ürün oluşturma/düzenleme modalı (mockup: web-yeni_urun). `product` verilirse
 * düzenleme modunda açılır ve alanlar mevcut değerlerle doldurulur; verilmezse
 * oluşturma modudur. Gönderim `onSubmit`'e delege edilir (mutation çağıran sayfa
 * ele alır); `submitting` sırasında butonlar devre dışı kalır.
 */
interface ProductFormDialogProps {
  open: boolean;
  /** Düzenlenecek ürün; oluşturma modunda `null`. */
  product: Product | null;
  submitting: boolean;
  onSubmit: (values: ProductFormValues) => void;
  onClose: () => void;
}

const EMPTY_VALUES: ProductFormValues = {
  name: '',
  sku: '',
  barcode: '',
  unit: ProductUnit.PIECE,
  category: '',
  description: '',
};

export function ProductFormDialog({
  open,
  product,
  submitting,
  onSubmit,
  onClose,
}: ProductFormDialogProps) {
  const isEdit = product !== null;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: EMPTY_VALUES,
  });

  // Modal her açıldığında formu ilgili değerlerle senkronize et (create/edit).
  useEffect(() => {
    if (!open) {
      return;
    }
    reset(
      product
        ? {
            name: product.name,
            sku: product.sku,
            barcode: product.barcode ?? '',
            unit: product.unit,
            category: product.category ?? '',
            description: product.description ?? '',
          }
        : EMPTY_VALUES,
    );
  }, [open, product, reset]);

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
        {isEdit ? 'Ürünü Düzenle' : 'Yeni Ürün'}
        <IconButton onClick={onClose} size="small" aria-label="Kapat">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Ürün Adı"
                  placeholder="Örn: Çay 1kg"
                  required
                  fullWidth
                  error={Boolean(errors.name)}
                  helperText={errors.name?.message}
                />
              )}
            />
            <Controller
              name="sku"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="SKU"
                  placeholder="Örn: CY-0012"
                  required
                  fullWidth
                  error={Boolean(errors.sku)}
                  helperText={errors.sku?.message ?? 'Firma içinde benzersiz'}
                />
              )}
            />
            <Controller
              name="barcode"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Barkod"
                  placeholder="Örn: 8690000000123"
                  fullWidth
                  error={Boolean(errors.barcode)}
                  helperText={errors.barcode?.message ?? 'Mobilde kameradan okutulacak kod'}
                />
              )}
            />
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Kategori"
                  placeholder="Örn: İçecek, Gıda, Temizlik"
                  fullWidth
                  error={Boolean(errors.category)}
                  helperText={errors.category?.message}
                />
              )}
            />
            <Controller
              name="unit"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Birim"
                  required
                  fullWidth
                  error={Boolean(errors.unit)}
                  helperText={errors.unit?.message}
                >
                  {Object.values(ProductUnit).map((unit) => (
                    <MenuItem key={unit} value={unit}>
                      {PRODUCT_UNIT_LABELS[unit]}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Açıklama"
                  placeholder="Ürün hakkında kısa açıklama..."
                  fullWidth
                  multiline
                  minRows={2}
                  error={Boolean(errors.description)}
                  helperText={errors.description?.message}
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

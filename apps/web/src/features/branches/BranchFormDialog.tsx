import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Stack,
  Switch,
  TextField,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { branchFormSchema, type BranchFormValues } from './schemas';
import type { Branch } from './types';

/**
 * Şube oluşturma/düzenleme modalı (mockup: web_yeni_sube). `branch` verilirse
 * düzenleme modunda açılır ve alanlar mevcut değerlerle doldurulur; verilmezse
 * oluşturma modudur. Gönderim `onSubmit`'e delege edilir (mutation çağıran sayfa
 * ele alır); `submitting` sırasında butonlar devre dışı kalır.
 *
 * Not: Mockup şehir için Select gösterir; ancak backend `city` serbest metindir
 * (String?), bu yüzden uydurma bir şehir listesi yerine TextField kullanılır.
 */
interface BranchFormDialogProps {
  open: boolean;
  /** Düzenlenecek şube; oluşturma modunda `null`. */
  branch: Branch | null;
  submitting: boolean;
  onSubmit: (values: BranchFormValues) => void;
  onClose: () => void;
}

const EMPTY_VALUES: BranchFormValues = {
  name: '',
  code: '',
  city: '',
  address: '',
  phone: '',
  isActive: true,
};

export function BranchFormDialog({
  open,
  branch,
  submitting,
  onSubmit,
  onClose,
}: BranchFormDialogProps) {
  const isEdit = branch !== null;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BranchFormValues>({
    resolver: zodResolver(branchFormSchema),
    defaultValues: EMPTY_VALUES,
  });

  // Modal her açıldığında formu ilgili değerlerle senkronize et (create/edit).
  useEffect(() => {
    if (!open) {
      return;
    }
    reset(
      branch
        ? {
            name: branch.name,
            code: branch.code,
            city: branch.city ?? '',
            address: branch.address ?? '',
            phone: branch.phone ?? '',
            isActive: branch.isActive,
          }
        : EMPTY_VALUES,
    );
  }, [open, branch, reset]);

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
        {isEdit ? 'Şubeyi Düzenle' : 'Yeni Şube'}
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
                  label="Şube Adı"
                  placeholder="Örn: Kadıköy Şube"
                  required
                  fullWidth
                  error={Boolean(errors.name)}
                  helperText={errors.name?.message}
                />
              )}
            />
            <Controller
              name="code"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Şube Kodu"
                  placeholder="Örn: SB-KDK"
                  required
                  fullWidth
                  error={Boolean(errors.code)}
                  helperText={errors.code?.message ?? 'Firma içinde benzersiz olmalıdır'}
                />
              )}
            />
            <Controller
              name="city"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Şehir"
                  placeholder="Örn: İstanbul"
                  required
                  fullWidth
                  error={Boolean(errors.city)}
                  helperText={errors.city?.message}
                />
              )}
            />
            <Controller
              name="address"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Adres"
                  placeholder="Tam adres bilgisi..."
                  fullWidth
                  multiline
                  minRows={2}
                  error={Boolean(errors.address)}
                  helperText={errors.address?.message}
                />
              )}
            />
            <Controller
              name="phone"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Telefon"
                  placeholder="Örn: 0212 555 0100"
                  fullWidth
                  error={Boolean(errors.phone)}
                  helperText={errors.phone?.message}
                />
              )}
            />
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={<Switch checked={field.value} onChange={field.onChange} />}
                  label="Aktif"
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

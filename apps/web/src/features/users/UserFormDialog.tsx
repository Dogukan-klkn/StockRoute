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
  MenuItem,
  Stack,
  Switch,
  TextField,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { UserRole } from '@stockroute/shared-types';
import { ASSIGNABLE_ROLES, ROLE_LABELS } from '../../lib/role-labels';
import { useBranches } from '../branches/hooks/useBranches';
import { createUserFormSchema, editUserFormSchema, type UserFormValues } from './schemas';
import type { User } from './types';

/**
 * Kullanıcı oluşturma/düzenleme modalı (mockup: web_yeni_kullanici).
 *
 * Davranış kuralları:
 *  - **Şifre**: oluşturmada zorunlu, düzenlemede opsiyonel ("boş bırakırsanız
 *    değişmez"). Bu yüzden mod'a göre farklı zod şeması kullanılır.
 *  - **Şube**: FIRM_ADMIN'in şubesi olmaz; bu rol seçiliyken şube alanı gizlenir
 *    ve değer temizlenir. Diğer roller için şube listesi `useBranches`'ten gelir.
 *  - `SUPER_ADMIN` atanabilir roller arasında yoktur (tenant üstü rol).
 */
interface UserFormDialogProps {
  open: boolean;
  /** Düzenlenecek kullanıcı; oluşturma modunda `null`. */
  user: User | null;
  submitting: boolean;
  onSubmit: (values: UserFormValues) => void;
  onClose: () => void;
}

const EMPTY_VALUES: UserFormValues = {
  fullName: '',
  email: '',
  password: '',
  role: UserRole.BRANCH_MANAGER,
  branchId: '',
  isActive: true,
};

export function UserFormDialog({ open, user, submitting, onSubmit, onClose }: UserFormDialogProps) {
  const isEdit = user !== null;
  const { data: branches } = useBranches();

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(isEdit ? editUserFormSchema : createUserFormSchema),
    defaultValues: EMPTY_VALUES,
  });

  const selectedRole = watch('role');
  // Firma yöneticisinin şubesi olmaz — alan gizlenir (bkz. mockup yardım metni).
  const showBranchField = selectedRole !== UserRole.FIRM_ADMIN;

  // Modal her açıldığında formu ilgili değerlerle senkronize et (create/edit).
  useEffect(() => {
    if (!open) {
      return;
    }
    reset(
      user
        ? {
            fullName: user.fullName,
            email: user.email,
            password: '',
            role: user.role,
            branchId: user.branchId ?? '',
            isActive: user.isActive,
          }
        : EMPTY_VALUES,
    );
  }, [open, user, reset]);

  // FIRM_ADMIN seçilirse şube ataması anlamsızdır; değeri temizle.
  useEffect(() => {
    if (!showBranchField) {
      setValue('branchId', '');
    }
  }, [showBranchField, setValue]);

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
        {isEdit ? 'Kullanıcıyı Düzenle' : 'Yeni Kullanıcı'}
        <IconButton onClick={onClose} size="small" aria-label="Kapat">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent dividers>
          <Stack spacing={2.5}>
            <Controller
              name="fullName"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Ad Soyad"
                  placeholder="Örn: Ahmet Yılmaz"
                  required
                  fullWidth
                  error={Boolean(errors.fullName)}
                  helperText={errors.fullName?.message}
                />
              )}
            />
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="E-posta"
                  type="email"
                  placeholder="ornek@firma.com"
                  required
                  fullWidth
                  error={Boolean(errors.email)}
                  helperText={errors.email?.message ?? 'Giriş için kullanılacak benzersiz adres'}
                />
              )}
            />
            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Şifre"
                  type="password"
                  placeholder={isEdit ? 'Boş bırakırsanız değişmez' : '••••••••'}
                  required={!isEdit}
                  fullWidth
                  error={Boolean(errors.password)}
                  helperText={
                    errors.password?.message ??
                    (isEdit ? 'Boş bırakırsanız mevcut şifre korunur' : 'En az 8 karakter')
                  }
                />
              )}
            />
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  select
                  label="Rol"
                  required
                  fullWidth
                  error={Boolean(errors.role)}
                  helperText={errors.role?.message}
                >
                  {ASSIGNABLE_ROLES.map((role) => (
                    <MenuItem key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            {showBranchField ? (
              <Controller
                name="branchId"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="Şube Ataması"
                    fullWidth
                    error={Boolean(errors.branchId)}
                    helperText={errors.branchId?.message ?? 'Boş bırakılabilir'}
                  >
                    <MenuItem value="">— Boş bırakıldı —</MenuItem>
                    {branches?.map((branch) => (
                      <MenuItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            ) : null}
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

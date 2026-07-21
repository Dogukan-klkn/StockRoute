import { useEffect, useMemo } from 'react';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormHelperText,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { useBranches } from '../branches/hooks/useBranches';
import { useInventory } from '../inventory/hooks/useInventory';
import { useProducts } from '../products/hooks/useProducts';
import { PRODUCT_UNIT_LABELS } from '../products/schemas';
import { movementFormSchema, type MovementFormInput, type MovementFormValues } from './schemas';

/**
 * Transfer oluşturma modalı (mockup: web-transfer-olustur).
 *
 * Mockup tek ürünlük bir form gösterir; backend `items[]` ile çoklu kalem
 * desteklediği için form `useFieldArray` ile dinamik satırlara genişletilmiştir
 * (bkz. plan §12.1 — header/line deseni).
 *
 * Kaynak şube seçilince o şubenin envanteri çekilir ve ürün seçicide mevcut stok
 * gösterilir (mockup'taki "CY-0012 · 120 adet" bilgisi).
 */
interface MovementFormDialogProps {
  open: boolean;
  submitting: boolean;
  onSubmit: (values: MovementFormValues) => void;
  onClose: () => void;
}

const EMPTY_VALUES: MovementFormInput = {
  sourceBranchId: '',
  destinationBranchId: '',
  note: '',
  items: [{ productId: '', quantity: 1 }],
};

export function MovementFormDialog({
  open,
  submitting,
  onSubmit,
  onClose,
}: MovementFormDialogProps) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MovementFormInput, unknown, MovementFormValues>({
    resolver: zodResolver(movementFormSchema),
    defaultValues: EMPTY_VALUES,
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  useEffect(() => {
    if (open) {
      reset(EMPTY_VALUES);
    }
  }, [open, reset]);

  // Şube listesi yalnızca FIRM_ADMIN ve BRANCH_MANAGER'a açıktır (§9.2). Diğer
  // roller `POST /movements` çağırabilse de şube seçemez; bu durumda form yerine
  // açıklayıcı bir uyarı gösterilir (bkz. Gün 16 bulgusu).
  const { data: branches, isError: branchesUnavailable } = useBranches();
  const { data: products } = useProducts('', '');

  // Kaynak şube seçilince o şubenin stok seviyeleri ürün seçicide gösterilir.
  const sourceBranchId = useWatch({ control, name: 'sourceBranchId' });
  const { data: sourceInventory } = useInventory(
    { branchId: sourceBranchId || undefined },
    Boolean(sourceBranchId),
  );

  /** productId → mevcut miktar (kaynak şubede). */
  const stockByProduct = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of sourceInventory ?? []) {
      map.set(item.productId, item.quantity);
    }
    return map;
  }, [sourceInventory]);

  const productOptions = products ?? [];

  /** Ürün seçicide sağda gösterilen ikincil bilgi: SKU + (varsa) mevcut stok. */
  const optionMeta = (productId: string, unit: keyof typeof PRODUCT_UNIT_LABELS) => {
    const stock = stockByProduct.get(productId);
    const unitLabel = PRODUCT_UNIT_LABELS[unit].toLocaleLowerCase('tr');
    return stock === undefined ? null : `${stock} ${unitLabel}`;
  };

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
        Transfer Oluştur
        <IconButton onClick={onClose} size="small" aria-label="Kapat">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      {branchesUnavailable ? (
        <>
          <DialogContent dividers>
            <Alert severity="warning">
              Şube listesine erişim yetkiniz olmadığı için transfer talebi oluşturamıyorsunuz.
              Lütfen yöneticinizle görüşün.
            </Alert>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={onClose} color="inherit">
              Kapat
            </Button>
          </DialogActions>
        </>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <DialogContent dividers>
            <Stack spacing={2.5}>
              <Controller
                name="sourceBranchId"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="Kaynak Şube"
                    required
                    fullWidth
                    error={Boolean(errors.sourceBranchId)}
                    helperText={errors.sourceBranchId?.message}
                  >
                    {branches?.length ? (
                      branches.map((branch) => (
                        <MenuItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </MenuItem>
                      ))
                    ) : (
                      <MenuItem value="" disabled>
                        Şube bulunamadı
                      </MenuItem>
                    )}
                  </TextField>
                )}
              />

              <Controller
                name="destinationBranchId"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    select
                    label="Hedef Şube"
                    required
                    fullWidth
                    error={Boolean(errors.destinationBranchId)}
                    helperText={errors.destinationBranchId?.message}
                  >
                    {branches?.length ? (
                      branches.map((branch) => (
                        <MenuItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </MenuItem>
                      ))
                    ) : (
                      <MenuItem value="" disabled>
                        Şube bulunamadı
                      </MenuItem>
                    )}
                  </TextField>
                )}
              />

              <Divider />

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
                  Ürünler
                </Typography>

                <Stack spacing={2}>
                  {fields.map((fieldItem, index) => (
                    <Stack
                      key={fieldItem.id}
                      direction="row"
                      spacing={1}
                      sx={{ alignItems: 'flex-start' }}
                    >
                      <Controller
                        name={`items.${index}.productId`}
                        control={control}
                        render={({ field }) => (
                          <Autocomplete
                            sx={{ flexGrow: 1 }}
                            options={productOptions}
                            getOptionLabel={(option) => option.name}
                            value={productOptions.find((p) => p.id === field.value) ?? null}
                            onChange={(_event, option) => field.onChange(option?.id ?? '')}
                            isOptionEqualToValue={(option, value) => option.id === value.id}
                            noOptionsText="Ürün bulunamadı"
                            renderOption={(props, option) => {
                              const meta = optionMeta(option.id, option.unit);
                              return (
                                <Box
                                  component="li"
                                  {...props}
                                  key={option.id}
                                  sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}
                                >
                                  <span>{option.name}</span>
                                  <Typography variant="caption" color="text.secondary">
                                    {option.sku}
                                    {meta ? ` · ${meta}` : ''}
                                  </Typography>
                                </Box>
                              );
                            }}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                label={`Ürün ${index + 1}`}
                                required
                                error={Boolean(errors.items?.[index]?.productId)}
                                helperText={errors.items?.[index]?.productId?.message}
                              />
                            )}
                          />
                        )}
                      />

                      <Controller
                        name={`items.${index}.quantity`}
                        control={control}
                        render={({ field }) => (
                          <TextField
                            {...field}
                            type="number"
                            label="Miktar"
                            required
                            sx={{ width: 120, flexShrink: 0 }}
                            error={Boolean(errors.items?.[index]?.quantity)}
                            helperText={errors.items?.[index]?.quantity?.message}
                          />
                        )}
                      />

                      {/* Son kalem silinemez: en az bir kalem zorunlu (backend ArrayMinSize). */}
                      <Tooltip
                        title={fields.length === 1 ? 'En az bir ürün gerekli' : 'Satırı sil'}
                      >
                        <span>
                          <IconButton
                            onClick={() => remove(index)}
                            disabled={fields.length === 1}
                            sx={{ mt: 1 }}
                            aria-label={`${index + 1}. ürün satırını sil`}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Stack>
                  ))}
                </Stack>

                {/* Dizi düzeyi hatalar (en az bir kalem / aynı ürün tekrarı). */}
                {errors.items?.message ? (
                  <FormHelperText error sx={{ mt: 1 }}>
                    {errors.items.message}
                  </FormHelperText>
                ) : null}

                <Button
                  startIcon={<AddIcon />}
                  onClick={() => append({ productId: '', quantity: 1 })}
                  sx={{ mt: 1.5 }}
                >
                  Ürün Ekle
                </Button>
              </Box>

              <Divider />

              <Controller
                name="note"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Not"
                    placeholder="Opsiyonel not..."
                    fullWidth
                    multiline
                    minRows={2}
                    error={Boolean(errors.note)}
                    helperText={errors.note?.message}
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
              Talep Oluştur
            </Button>
          </DialogActions>
        </form>
      )}
    </Dialog>
  );
}

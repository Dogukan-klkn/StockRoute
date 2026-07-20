import { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  IconButton,
  InputAdornment,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import { UserRole } from '@stockroute/shared-types';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState } from '../../components/EmptyState';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { DataTableSkeleton } from '../../components/DataTableSkeleton';
import { useSnackbar } from '../../components/SnackbarProvider';
import { useAuthStore } from '../../lib/auth-store';
import { getApiErrorMessage } from '../../lib/api-error';
import { useDebouncedValue } from '../../lib/useDebouncedValue';
import { ProductFormDialog } from './ProductFormDialog';
import { useProducts } from './hooks/useProducts';
import { useProductMutations } from './hooks/useProductMutations';
import { PRODUCT_UNIT_LABELS, type ProductFormValues } from './schemas';
import type { Product } from './types';

/** Ürünler yönetim ekranı — liste + arama + CRUD (mockup: web_urunler). */
export function ProductsPage() {
  const role = useAuthStore((state) => state.user?.role);
  // Ürünleri yalnızca FIRM_ADMIN ve BRANCH_MANAGER yönetebilir (§8).
  const canManage = role === UserRole.FIRM_ADMIN || role === UserRole.BRANCH_MANAGER;
  const { showSuccess, showError } = useSnackbar();

  // Arama: input anlık, sorgu 500ms debounce'lu.
  const [searchInput, setSearchInput] = useState('');
  const search = useDebouncedValue(searchInput, 500);
  const { data: products, isLoading, isError } = useProducts(search, '');
  const { createMutation, updateMutation, deleteMutation } = useProductMutations();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Product | null>(null);

  const COLUMN_COUNT = canManage ? 6 : 5;

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  const handleSubmit = (values: ProductFormValues) => {
    if (editing) {
      updateMutation.mutate(
        { id: editing.id, values },
        {
          onSuccess: () => {
            showSuccess('Ürün güncellendi.');
            closeForm();
          },
          onError: (error) => showError(getApiErrorMessage(error, 'Ürün güncellenemedi.')),
        },
      );
    } else {
      createMutation.mutate(values, {
        onSuccess: () => {
          showSuccess('Ürün eklendi.');
          closeForm();
        },
        onError: (error) => showError(getApiErrorMessage(error, 'Ürün eklenemedi.')),
      });
    }
  };

  const confirmDelete = () => {
    if (!pendingDelete) {
      return;
    }
    deleteMutation.mutate(pendingDelete.id, {
      onSuccess: () => {
        showSuccess('Ürün silindi.');
        setPendingDelete(null);
      },
      onError: (error) => {
        showError(getApiErrorMessage(error, 'Ürün silinemedi.'));
        setPendingDelete(null);
      },
    });
  };

  const addButton = canManage ? (
    <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
      Yeni Ürün
    </Button>
  ) : null;

  const submitting = createMutation.isPending || updateMutation.isPending;
  const hasProducts = Boolean(products && products.length > 0);
  const isSearching = search.trim().length > 0;

  return (
    <Box>
      <PageHeader
        title="Ürünler"
        description="Tüm ürün tanımlarını görüntüleyin ve yönetin"
        action={addButton}
      />

      <Box sx={{ mb: 3, maxWidth: 360 }}>
        <TextField
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Ürün ara..."
          fullWidth
          size="small"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
      </Box>

      {isError ? (
        <Paper>
          <EmptyState
            icon={<Inventory2OutlinedIcon fontSize="inherit" />}
            title="Ürünler yüklenemedi"
            description="Bir hata oluştu. Lütfen sayfayı yenileyip tekrar deneyin."
          />
        </Paper>
      ) : !isLoading && !hasProducts ? (
        <Paper>
          <EmptyState
            icon={<Inventory2OutlinedIcon fontSize="inherit" />}
            title={isSearching ? 'Sonuç bulunamadı' : 'Henüz ürün eklenmemiş'}
            description={
              isSearching
                ? `"${search}" için eşleşen ürün yok. Farklı bir arama deneyin.`
                : canManage
                  ? 'Sağ üstten yeni ürün ekleyebilirsiniz.'
                  : 'Firmanıza henüz bir ürün tanımlanmamış.'
            }
            action={isSearching ? undefined : addButton}
          />
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>AD</TableCell>
                <TableCell>SKU</TableCell>
                <TableCell>BARKOD</TableCell>
                <TableCell>KATEGORİ</TableCell>
                <TableCell>BİRİM</TableCell>
                {canManage ? <TableCell align="right">AKSİYON</TableCell> : null}
              </TableRow>
            </TableHead>
            {isLoading ? (
              <DataTableSkeleton columns={COLUMN_COUNT} />
            ) : (
              <TableBody>
                {products?.map((product) => (
                  <TableRow key={product.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{product.name}</TableCell>
                    <TableCell>
                      <Chip label={product.sku} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{product.barcode ?? '—'}</TableCell>
                    <TableCell>{product.category ?? '—'}</TableCell>
                    <TableCell>
                      <Chip
                        label={PRODUCT_UNIT_LABELS[product.unit]}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    {canManage ? (
                      <TableCell align="right">
                        <Tooltip title="Düzenle">
                          <IconButton size="small" onClick={() => openEdit(product)}>
                            <EditOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Sil">
                          <IconButton size="small" onClick={() => setPendingDelete(product)}>
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            )}
          </Table>
        </TableContainer>
      )}

      {canManage ? (
        <>
          <ProductFormDialog
            open={formOpen}
            product={editing}
            submitting={submitting}
            onSubmit={handleSubmit}
            onClose={closeForm}
          />
          <ConfirmDialog
            open={pendingDelete !== null}
            title="Ürünü sil"
            message={`"${pendingDelete?.name ?? ''}" ürününü silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`}
            loading={deleteMutation.isPending}
            onConfirm={confirmDelete}
            onCancel={() => setPendingDelete(null)}
          />
        </>
      ) : null}
    </Box>
  );
}

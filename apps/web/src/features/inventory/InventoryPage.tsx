import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  FormControlLabel,
  InputAdornment,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import WarehouseOutlinedIcon from '@mui/icons-material/WarehouseOutlined';
import { UserRole } from '@stockroute/shared-types';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState } from '../../components/EmptyState';
import { DataTableSkeleton } from '../../components/DataTableSkeleton';
import { useSnackbar } from '../../components/SnackbarProvider';
import { useAuthStore } from '../../lib/auth-store';
import { getApiErrorMessage } from '../../lib/api-error';
import { useDebouncedValue } from '../../lib/useDebouncedValue';
import { useProfile } from '../auth/hooks/useProfile';
import { useBranches } from '../branches/hooks/useBranches';
import { PRODUCT_UNIT_LABELS } from '../products/schemas';
import { AdjustStockDialog } from './AdjustStockDialog';
import { ThresholdDialog } from './ThresholdDialog';
import { useInventory } from './hooks/useInventory';
import { useInventoryMutations } from './hooks/useInventoryMutations';
import type { AdjustStockFormValues, ThresholdFormValues } from './schemas';
import { isLowStock, type InventoryItem } from './types';

/** Stok düzeltme yetkisine sahip roller (inventory.controller.ts — POST /inventory/adjust). */
const ADJUST_ROLES: readonly UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.FIRM_ADMIN,
  UserRole.BRANCH_MANAGER,
  UserRole.WAREHOUSE_STAFF,
];

/**
 * `GET /branches` yetkisine sahip roller (branches.controller.ts).
 *
 * Bu liste envanter yetkisinden dardır: WAREHOUSE_STAFF ve FIELD_STAFF envanteri
 * görebilir ama şube listesini çekemez (403). Bu rollerde şube seçici yerine
 * kullanıcının kendi şubesi (`/auth/me` → `user.branch`) kullanılır.
 */
const BRANCH_LIST_ROLES: readonly UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.FIRM_ADMIN,
  UserRole.BRANCH_MANAGER,
];

/**
 * Düşük stok eşiğini belirleyebilen roller
 * (inventory.controller.ts — PATCH /inventory/:id/threshold).
 * Eşik belirlemek yönetim kararıdır; WAREHOUSE_STAFF stok düzeltir ama eşik belirlemez.
 */
const THRESHOLD_ROLES: readonly UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.FIRM_ADMIN,
  UserRole.BRANCH_MANAGER,
];

const ROWS_PER_PAGE = 10;

/**
 * Envanter ekranı — şube bazlı stok görünümü + manuel stok düzeltme
 * (mockup: web-envanter).
 *
 * Backend sayfalama ve ürün araması sunmadığından ikisi de istemci tarafında
 * yapılır: liste tek istekte gelir, arama ve sayfalama bellekte uygulanır.
 * Mockup'taki "Dışa Aktar" eylemi karşılık gelen bir uç nokta olmadığı için yok.
 *
 * Şube kapsamı role göre belirlenir: şube listeleyebilen roller seçiciden şube
 * seçer; diğerleri (WAREHOUSE_STAFF, FIELD_STAFF) kendi atanmış şubelerini görür.
 */
export function InventoryPage() {
  const role = useAuthStore((state) => state.user?.role);
  const canAdjust = role !== undefined && ADJUST_ROLES.includes(role);
  const canEditThreshold = role !== undefined && THRESHOLD_ROLES.includes(role);
  const { showSuccess, showError } = useSnackbar();

  const [branchId, setBranchId] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(0);
  const search = useDebouncedValue(searchInput, 500);

  // Şube seçici yalnızca /branches çağırabilen rollerde gösterilir; diğer roller
  // kendi atanmış şubeleriyle (profil) sınırlıdır.
  const canListBranches = role !== undefined && BRANCH_LIST_ROLES.includes(role);
  const { data: branches, isLoading: branchesLoading } = useBranches(canListBranches);
  const { data: profile, isLoading: profileLoading } = useProfile();

  // Etkin şube: seçiciden gelen değer ya da kullanıcının kendi şubesi.
  const ownBranch = profile?.user.branch ?? null;
  const effectiveBranchId = canListBranches ? branchId : (ownBranch?.id ?? '');
  // Şubesi olmayan (ve seçici de göremeyen) kullanıcı envanter göremez.
  const missingOwnBranch = !canListBranches && !profileLoading && ownBranch === null;

  const {
    data: inventory,
    isLoading: inventoryLoading,
    isError,
  } = useInventory(
    { branchId: effectiveBranchId || undefined, lowStock: lowStockOnly },
    Boolean(effectiveBranchId),
  );
  // Profil beklenirken envanter sorgusu henüz açılmamıştır; bu aralıkta "kayıt yok"
  // boş durumunun görünmemesi için yükleme durumu birleştirilir.
  const isLoading = inventoryLoading || (!canListBranches && profileLoading);
  const { adjustMutation, thresholdMutation } = useInventoryMutations();

  const [adjusting, setAdjusting] = useState<InventoryItem | null>(null);
  const [editingThreshold, setEditingThreshold] = useState<InventoryItem | null>(null);

  const COLUMN_COUNT = canAdjust ? 6 : 5;

  // İstemci tarafı arama: ürün adı veya SKU üzerinden.
  const visibleItems = useMemo(() => {
    if (!inventory) {
      return [];
    }
    const term = search.trim().toLocaleLowerCase('tr');
    if (!term) {
      return inventory;
    }
    return inventory.filter(
      (item) =>
        item.product.name.toLocaleLowerCase('tr').includes(term) ||
        item.product.sku.toLocaleLowerCase('tr').includes(term),
    );
  }, [inventory, search]);

  const lowStockCount = useMemo(() => visibleItems.filter(isLowStock).length, [visibleItems]);

  // Filtre değişimlerinde sayfa başa döner; aksi halde boş sayfada kalınabilir.
  const pageStart = page * ROWS_PER_PAGE;
  const pagedItems = visibleItems.slice(pageStart, pageStart + ROWS_PER_PAGE);
  const resetPage = () => setPage(0);

  const handleAdjust = (values: AdjustStockFormValues) => {
    if (!adjusting) {
      return;
    }
    adjustMutation.mutate(
      {
        branchId: adjusting.branchId,
        productId: adjusting.productId,
        quantity: values.quantity,
        reason: values.reason,
      },
      {
        onSuccess: () => {
          showSuccess('Stok güncellendi.');
          setAdjusting(null);
        },
        onError: (error) => showError(getApiErrorMessage(error, 'Stok güncellenemedi.')),
      },
    );
  };

  const handleThreshold = (values: ThresholdFormValues) => {
    if (!editingThreshold) {
      return;
    }
    thresholdMutation.mutate(
      { id: editingThreshold.id, minThreshold: values.minThreshold },
      {
        onSuccess: () => {
          showSuccess('Düşük stok eşiği güncellendi.');
          setEditingThreshold(null);
        },
        onError: (error) => showError(getApiErrorMessage(error, 'Eşik güncellenemedi.')),
      },
    );
  };

  const branchLabel = canListBranches
    ? (branches?.find((branch) => branch.id === branchId)?.name ?? '')
    : (ownBranch?.name ?? '');

  return (
    <Box>
      <PageHeader
        title="Envanter"
        description="Şube bazında stok seviyelerini görüntüleyin ve düzeltin"
      />

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        sx={{ mb: 2, alignItems: { md: 'center' } }}
      >
        {canListBranches ? (
          <TextField
            select
            label="Şube"
            value={branchId}
            onChange={(event) => {
              setBranchId(event.target.value);
              resetPage();
            }}
            disabled={branchesLoading}
            sx={{ minWidth: 220 }}
          >
            {/* Yükleme sırasında en az bir çocuk gerekir (MUI Select uyarısı). */}
            {branches?.length ? (
              branches.map((branch) => (
                <MenuItem key={branch.id} value={branch.id}>
                  {branch.name}
                </MenuItem>
              ))
            ) : (
              <MenuItem value="" disabled>
                {branchesLoading ? 'Yükleniyor...' : 'Şube bulunamadı'}
              </MenuItem>
            )}
          </TextField>
        ) : ownBranch ? (
          // Şube seçemeyen roller kendi şubeleriyle sınırlıdır; kapsam yine de görünür olmalı.
          <Chip
            icon={<WarehouseOutlinedIcon fontSize="small" />}
            label={ownBranch.name}
            variant="outlined"
          />
        ) : null}

        <FormControlLabel
          control={
            <Checkbox
              checked={lowStockOnly}
              onChange={(event) => {
                setLowStockOnly(event.target.checked);
                resetPage();
              }}
            />
          }
          label="Sadece düşük stok"
        />

        <Box sx={{ flexGrow: 1 }} />

        <TextField
          value={searchInput}
          onChange={(event) => {
            setSearchInput(event.target.value);
            resetPage();
          }}
          placeholder="Ürün ara..."
          disabled={!effectiveBranchId}
          sx={{ minWidth: 260 }}
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
      </Stack>

      {missingOwnBranch ? (
        <Paper>
          <EmptyState
            icon={<WarehouseOutlinedIcon fontSize="inherit" />}
            title="Hesabınıza şube atanmamış"
            description="Envanteri görüntülemek için hesabınıza bir şube atanmalı. Lütfen yöneticinizle görüşün."
          />
        </Paper>
      ) : canListBranches && !branchId ? (
        <Paper>
          <EmptyState
            icon={<WarehouseOutlinedIcon fontSize="inherit" />}
            title="Şube seçin"
            description="Envanteri görüntülemek için yukarıdan bir şube seçin."
          />
        </Paper>
      ) : isError ? (
        <Paper>
          <EmptyState
            icon={<Inventory2OutlinedIcon fontSize="inherit" />}
            title="Envanter yüklenemedi"
            description="Bir hata oluştu. Lütfen sayfayı yenileyip tekrar deneyin."
          />
        </Paper>
      ) : !isLoading && visibleItems.length === 0 ? (
        <Paper>
          <EmptyState
            icon={<Inventory2OutlinedIcon fontSize="inherit" />}
            title={search ? 'Sonuç bulunamadı' : 'Stok kaydı yok'}
            description={
              search
                ? 'Farklı bir arama terimi deneyin.'
                : lowStockOnly
                  ? 'Düşük stokta ürün bulunmuyor.'
                  : 'Henüz envanter kaydı oluşturulmamış.'
            }
          />
        </Paper>
      ) : (
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ÜRÜN</TableCell>
                  <TableCell>KATEGORİ</TableCell>
                  <TableCell align="right">MEVCUT MİKTAR</TableCell>
                  <TableCell align="right">MİN EŞİK</TableCell>
                  <TableCell>DURUM</TableCell>
                  {canAdjust ? <TableCell align="right">AKSİYON</TableCell> : null}
                </TableRow>
              </TableHead>
              {isLoading ? (
                <DataTableSkeleton columns={COLUMN_COUNT} />
              ) : (
                <TableBody>
                  {pagedItems.map((item) => {
                    const low = isLowStock(item);
                    return (
                      <TableRow
                        key={item.id}
                        hover
                        // Düşük stok satırı kırmızı vurgulanır (mockup: web-envanter).
                        // Renk tema paletinden alfa ile türetilir; hardcoded HEX yok (§11).
                        sx={
                          low
                            ? {
                                backgroundColor: (theme) => alpha(theme.palette.error.main, 0.08),
                                '&:hover': {
                                  backgroundColor: (theme) =>
                                    `${alpha(theme.palette.error.main, 0.12)} !important`,
                                },
                              }
                            : undefined
                        }
                      >
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {item.product.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.product.sku}
                          </Typography>
                        </TableCell>
                        <TableCell>{item.product.category ?? '—'}</TableCell>
                        <TableCell align="right">
                          <Typography
                            component="span"
                            variant="body2"
                            sx={{ fontWeight: 700, color: low ? 'error.main' : 'text.primary' }}
                          >
                            {item.quantity}
                          </Typography>{' '}
                          <Typography component="span" variant="caption" color="text.secondary">
                            {PRODUCT_UNIT_LABELS[item.product.unit].toLocaleLowerCase('tr')}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          {canEditThreshold ? (
                            <Tooltip title="Eşiği düzenle">
                              <Button
                                size="small"
                                color="inherit"
                                onClick={() => setEditingThreshold(item)}
                                sx={{ minWidth: 0, px: 1, fontWeight: 400 }}
                              >
                                {item.minThreshold}
                                <TuneOutlinedIcon sx={{ fontSize: 14, ml: 0.5, opacity: 0.6 }} />
                              </Button>
                            </Tooltip>
                          ) : (
                            item.minThreshold
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={low ? 'Düşük Stok' : 'Yeterli'}
                            color={low ? 'error' : 'success'}
                            variant="outlined"
                          />
                        </TableCell>
                        {canAdjust ? (
                          <TableCell align="right">
                            <Button
                              size="small"
                              variant={low ? 'contained' : 'outlined'}
                              startIcon={<EditOutlinedIcon fontSize="small" />}
                              onClick={() => setAdjusting(item)}
                            >
                              Stok Düzelt
                            </Button>
                          </TableCell>
                        ) : null}
                      </TableRow>
                    );
                  })}
                </TableBody>
              )}
            </Table>
          </TableContainer>

          {!isLoading ? (
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              sx={{
                px: 2,
                py: 1,
                alignItems: { sm: 'center' },
                justifyContent: 'space-between',
              }}
            >
              <Typography variant="body2" color="text.secondary">
                {branchLabel} · {visibleItems.length} ürün · {lowStockCount} düşük stok
              </Typography>
              <TablePagination
                component="div"
                count={visibleItems.length}
                page={page}
                onPageChange={(_event, nextPage) => setPage(nextPage)}
                rowsPerPage={ROWS_PER_PAGE}
                rowsPerPageOptions={[ROWS_PER_PAGE]}
                labelDisplayedRows={({ from, to, count }) => `${from}–${to} / ${count}`}
              />
            </Stack>
          ) : null}
        </Paper>
      )}

      {canAdjust ? (
        <AdjustStockDialog
          open={adjusting !== null}
          item={adjusting}
          submitting={adjustMutation.isPending}
          onSubmit={handleAdjust}
          onClose={() => setAdjusting(null)}
        />
      ) : null}

      {canEditThreshold ? (
        <ThresholdDialog
          open={editingThreshold !== null}
          item={editingThreshold}
          submitting={thresholdMutation.isPending}
          onSubmit={handleThreshold}
          onClose={() => setEditingThreshold(null)}
        />
      ) : null}
    </Box>
  );
}

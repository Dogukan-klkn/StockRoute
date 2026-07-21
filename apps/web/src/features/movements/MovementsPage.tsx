import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  InputAdornment,
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
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import SwapHorizOutlinedIcon from '@mui/icons-material/SwapHorizOutlined';
import type { MovementStatus } from '@stockroute/shared-types';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState } from '../../components/EmptyState';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { DataTableSkeleton } from '../../components/DataTableSkeleton';
import { useSnackbar } from '../../components/SnackbarProvider';
import { useAuthStore } from '../../lib/auth-store';
import { getApiErrorMessage } from '../../lib/api-error';
import { useDebouncedValue } from '../../lib/useDebouncedValue';
import { MovementActionButtons } from './MovementActionButtons';
import { MovementDetailDialog } from './MovementDetailDialog';
import { MovementFormDialog } from './MovementFormDialog';
import { MovementStatusChip } from './MovementStatusChip';
import { useMovement } from './hooks/useMovement';
import { useMovementActions } from './hooks/useMovementActions';
import { useMovementMutations } from './hooks/useMovementMutations';
import { useMovements } from './hooks/useMovements';
import { availableActions, MOVEMENT_ACTION_RULES } from './movement-actions';
import { MOVEMENT_STATUS_LABELS, MOVEMENT_STATUS_ORDER } from './movement-status';
import { formatMovementDate, shortMovementId } from './movement-format';
import type { MovementFormValues } from './schemas';
import type { Movement, MovementAction } from './types';

const ROWS_PER_PAGE = 10;

/** Filtre çubuğundaki "Tümü" seçeneğinin değeri. */
const ALL = 'ALL' as const;
type StatusFilter = MovementStatus | typeof ALL;

/**
 * Transferler ekranı — durum filtreli liste + detay modalı
 * (mockup: web-transferler).
 *
 * Liste tek istekte filtresiz çekilir; durum filtresi, arama ve sayfalama
 * istemci tarafında uygulanır. Böylece mockup'taki durum sayaçları (her durumda
 * kaç transfer olduğu) filtre seçiminden bağımsız doğru kalır ve tek istekle
 * hesaplanır. Liste büyürse sunucu tarafı filtreye dönülebilir (`?status=`
 * parametresi API'de hazır).
 */
export function MovementsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(ALL);
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(0);
  const search = useDebouncedValue(searchInput, 500);

  const role = useAuthStore((state) => state.user?.role);
  const userId = useAuthStore((state) => state.user?.id);
  const { showSuccess, showError } = useSnackbar();

  const { data: movements, isLoading, isError } = useMovements();

  const [detailId, setDetailId] = useState<string | null>(null);
  const { data: detail, isLoading: detailLoading } = useMovement(detailId);

  const [formOpen, setFormOpen] = useState(false);
  const { createMutation } = useMovementMutations();
  const { actionMutation } = useMovementActions();

  // Onay bekleyen aksiyon: hangi transfer üzerinde hangi geçiş yapılacak.
  const [pendingAction, setPendingAction] = useState<{
    movementId: string;
    action: MovementAction;
  } | null>(null);

  /** Bir transferde bu kullanıcıya görünecek aksiyonlar (durum + rol + sahiplik). */
  const actionsFor = (movement: { status: MovementStatus; requestedById: string }) =>
    availableActions({
      status: movement.status,
      role,
      userId,
      requestedById: movement.requestedById,
    });

  const handleCreate = (values: MovementFormValues) => {
    createMutation.mutate(
      {
        sourceBranchId: values.sourceBranchId,
        destinationBranchId: values.destinationBranchId,
        // Boş not gönderilmez; backend alanı opsiyonel kabul eder.
        note: values.note?.trim() ? values.note.trim() : undefined,
        items: values.items,
      },
      {
        onSuccess: () => {
          showSuccess('Transfer talebi oluşturuldu.');
          setFormOpen(false);
        },
        onError: (error) => showError(getApiErrorMessage(error, 'Transfer talebi oluşturulamadı.')),
      },
    );
  };

  const confirmAction = () => {
    if (!pendingAction) {
      return;
    }
    const { movementId, action } = pendingAction;
    actionMutation.mutate(
      { id: movementId, action },
      {
        onSuccess: () => {
          showSuccess(MOVEMENT_ACTION_RULES[action].successMessage);
          setPendingAction(null);
        },
        onError: (error) => {
          showError(getApiErrorMessage(error, 'İşlem tamamlanamadı.'));
          setPendingAction(null);
        },
      },
    );
  };

  // Durum sayaçları filtreden bağımsız, tüm liste üzerinden hesaplanır.
  const statusCounts = useMemo(() => {
    const counts = new Map<MovementStatus, number>();
    for (const movement of movements ?? []) {
      counts.set(movement.status, (counts.get(movement.status) ?? 0) + 1);
    }
    return counts;
  }, [movements]);

  // Durum + arama filtresi (arama: şube adları ve transfer no üzerinden).
  const visibleMovements = useMemo(() => {
    let result = movements ?? [];
    if (statusFilter !== ALL) {
      result = result.filter((movement) => movement.status === statusFilter);
    }
    const term = search.trim().toLocaleLowerCase('tr');
    if (term) {
      result = result.filter(
        (movement) =>
          movement.sourceBranch.name.toLocaleLowerCase('tr').includes(term) ||
          movement.destinationBranch.name.toLocaleLowerCase('tr').includes(term) ||
          shortMovementId(movement.id).toLocaleLowerCase('tr').includes(term),
      );
    }
    return result;
  }, [movements, statusFilter, search]);

  const pageStart = page * ROWS_PER_PAGE;
  const pagedMovements = visibleMovements.slice(pageStart, pageStart + ROWS_PER_PAGE);

  const selectFilter = (next: StatusFilter) => {
    setStatusFilter(next);
    setPage(0);
  };

  /** Kalem özeti: tek kalemse adet, çoklu ise "N kalem". */
  const itemsSummary = (movement: Movement) =>
    movement.items.length === 1
      ? `${movement.items[0].quantity} adet`
      : `${movement.items.length} kalem`;

  return (
    <Box>
      <PageHeader
        title="Transferler"
        description="Şubeler arası stok transferlerini yönetin"
        action={
          // Transfer talebi tüm rollere açıktır (movements.controller.ts — POST /movements).
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormOpen(true)}>
            Yeni Transfer
          </Button>
        }
      />

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        sx={{ mb: 2, alignItems: { md: 'center' } }}
      >
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          <Chip
            label={`Tümü (${movements?.length ?? 0})`}
            onClick={() => selectFilter(ALL)}
            color={statusFilter === ALL ? 'primary' : 'default'}
            variant={statusFilter === ALL ? 'filled' : 'outlined'}
          />
          {MOVEMENT_STATUS_ORDER.map((status) => (
            <Chip
              key={status}
              label={`${MOVEMENT_STATUS_LABELS[status]} (${statusCounts.get(status) ?? 0})`}
              onClick={() => selectFilter(status)}
              color={statusFilter === status ? 'primary' : 'default'}
              variant={statusFilter === status ? 'filled' : 'outlined'}
            />
          ))}
        </Stack>

        <Box sx={{ flexGrow: 1 }} />

        <TextField
          value={searchInput}
          onChange={(event) => {
            setSearchInput(event.target.value);
            setPage(0);
          }}
          placeholder="Transfer ara..."
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

      {isError ? (
        <Paper>
          <EmptyState
            icon={<SwapHorizOutlinedIcon fontSize="inherit" />}
            title="Transferler yüklenemedi"
            description="Bir hata oluştu. Lütfen sayfayı yenileyip tekrar deneyin."
          />
        </Paper>
      ) : !isLoading && visibleMovements.length === 0 ? (
        <Paper>
          <EmptyState
            icon={<SwapHorizOutlinedIcon fontSize="inherit" />}
            title={
              search || statusFilter !== ALL ? 'Sonuç bulunamadı' : 'Henüz transfer oluşturulmamış'
            }
            description={
              search || statusFilter !== ALL
                ? 'Farklı bir filtre veya arama terimi deneyin.'
                : 'Şubeler arası ilk transfer talebini oluşturarak başlayın.'
            }
          />
        </Paper>
      ) : (
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>TRANSFER NO</TableCell>
                  <TableCell>KAYNAK → HEDEF ŞUBE</TableCell>
                  <TableCell align="right">İÇERİK</TableCell>
                  <TableCell>DURUM</TableCell>
                  <TableCell>TARİH</TableCell>
                  <TableCell align="right">AKSİYON</TableCell>
                </TableRow>
              </TableHead>
              {isLoading ? (
                <DataTableSkeleton columns={6} />
              ) : (
                <TableBody>
                  {pagedMovements.map((movement) => (
                    <TableRow
                      key={movement.id}
                      hover
                      onClick={() => setDetailId(movement.id)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell sx={{ fontWeight: 600 }}>{shortMovementId(movement.id)}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            {movement.sourceBranch.name}
                          </Typography>
                          <ArrowForwardIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {movement.destinationBranch.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">{itemsSummary(movement)}</TableCell>
                      <TableCell>
                        <MovementStatusChip status={movement.status} />
                      </TableCell>
                      <TableCell>{formatMovementDate(movement.createdAt)}</TableCell>
                      <TableCell align="right">
                        {/* Terminal durumlarda ve yetkisiz rollerde tire gösterilir (mockup). */}
                        {actionsFor(movement).length > 0 ? (
                          <MovementActionButtons
                            actions={actionsFor(movement)}
                            disabled={actionMutation.isPending}
                            onAction={(action) =>
                              setPendingAction({ movementId: movement.id, action })
                            }
                          />
                        ) : (
                          <Typography component="span" color="text.secondary">
                            —
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
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
                Toplam {visibleMovements.length} transfer
              </Typography>
              <TablePagination
                component="div"
                count={visibleMovements.length}
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

      <MovementDetailDialog
        open={detailId !== null}
        movement={detail}
        loading={detailLoading}
        actions={
          detail ? (
            <MovementActionButtons
              actions={actionsFor(detail)}
              size="medium"
              disabled={actionMutation.isPending}
              onAction={(action) => setPendingAction({ movementId: detail.id, action })}
            />
          ) : null
        }
        onClose={() => setDetailId(null)}
      />

      <MovementFormDialog
        open={formOpen}
        submitting={createMutation.isPending}
        onSubmit={handleCreate}
        onClose={() => setFormOpen(false)}
      />

      <ConfirmDialog
        open={pendingAction !== null}
        title={pendingAction ? MOVEMENT_ACTION_RULES[pendingAction.action].label : ''}
        message={pendingAction ? MOVEMENT_ACTION_RULES[pendingAction.action].confirmMessage : ''}
        confirmLabel={pendingAction ? MOVEMENT_ACTION_RULES[pendingAction.action].label : ''}
        // Stok düşüren/ekleyen ve reddeden aksiyonlar dışında birincil renk.
        confirmColor={
          pendingAction && ['reject', 'cancel'].includes(pendingAction.action) ? 'error' : 'primary'
        }
        loading={actionMutation.isPending}
        onConfirm={confirmAction}
        onCancel={() => setPendingAction(null)}
      />
    </Box>
  );
}

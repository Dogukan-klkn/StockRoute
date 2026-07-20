import { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import { UserRole } from '@stockroute/shared-types';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState } from '../../components/EmptyState';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { DataTableSkeleton } from '../../components/DataTableSkeleton';
import { useSnackbar } from '../../components/SnackbarProvider';
import { useAuthStore } from '../../lib/auth-store';
import { getApiErrorMessage } from '../../lib/api-error';
import { BranchFormDialog } from './BranchFormDialog';
import { useBranches } from './hooks/useBranches';
import { useBranchMutations } from './hooks/useBranchMutations';
import type { BranchFormValues } from './schemas';
import type { Branch } from './types';

/** Şubeler yönetim ekranı — liste + CRUD (mockup: web_subeler). */
export function BranchesPage() {
  const role = useAuthStore((state) => state.user?.role);
  const canManage = role === UserRole.FIRM_ADMIN;
  const { showSuccess, showError } = useSnackbar();

  const { data: branches, isLoading, isError } = useBranches();
  const { createMutation, updateMutation, deleteMutation } = useBranchMutations();

  // Form modalı durumu: kapalı | oluşturma (branch=null) | düzenleme (branch=...).
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  // Silme onayı için bekleyen şube.
  const [pendingDelete, setPendingDelete] = useState<Branch | null>(null);

  const COLUMN_COUNT = canManage ? 5 : 4;

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (branch: Branch) => {
    setEditing(branch);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  const handleSubmit = (values: BranchFormValues) => {
    if (editing) {
      updateMutation.mutate(
        { id: editing.id, values },
        {
          onSuccess: () => {
            showSuccess('Şube güncellendi.');
            closeForm();
          },
          onError: (error) => showError(getApiErrorMessage(error, 'Şube güncellenemedi.')),
        },
      );
    } else {
      createMutation.mutate(values, {
        onSuccess: () => {
          showSuccess('Şube eklendi.');
          closeForm();
        },
        onError: (error) => showError(getApiErrorMessage(error, 'Şube eklenemedi.')),
      });
    }
  };

  const confirmDelete = () => {
    if (!pendingDelete) {
      return;
    }
    deleteMutation.mutate(pendingDelete.id, {
      onSuccess: () => {
        showSuccess('Şube silindi.');
        setPendingDelete(null);
      },
      onError: (error) => {
        showError(getApiErrorMessage(error, 'Şube silinemedi.'));
        setPendingDelete(null);
      },
    });
  };

  const addButton = canManage ? (
    <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
      Yeni Şube
    </Button>
  ) : null;

  const submitting = createMutation.isPending || updateMutation.isPending;
  const hasBranches = Boolean(branches && branches.length > 0);

  return (
    <Box>
      <PageHeader
        title="Şubeler"
        description="Firmaya ait tüm depo ve satış noktalarını yönetin"
        action={addButton}
      />

      {isError ? (
        <Paper>
          <EmptyState
            icon={<StorefrontOutlinedIcon fontSize="inherit" />}
            title="Şubeler yüklenemedi"
            description="Bir hata oluştu. Lütfen sayfayı yenileyip tekrar deneyin."
          />
        </Paper>
      ) : !isLoading && !hasBranches ? (
        <Paper>
          <EmptyState
            icon={<StorefrontOutlinedIcon fontSize="inherit" />}
            title="Henüz şube eklenmemiş"
            description={
              canManage
                ? 'Sağ üstten yeni şube ekleyebilirsiniz.'
                : 'Firmanıza henüz bir şube tanımlanmamış.'
            }
            action={addButton}
          />
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>AD</TableCell>
                <TableCell>KOD</TableCell>
                <TableCell>ŞEHİR</TableCell>
                <TableCell>DURUM</TableCell>
                {canManage ? <TableCell align="right">AKSİYON</TableCell> : null}
              </TableRow>
            </TableHead>
            {isLoading ? (
              <DataTableSkeleton columns={COLUMN_COUNT} />
            ) : (
              <TableBody>
                {branches?.map((branch) => (
                  <TableRow key={branch.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{branch.name}</TableCell>
                    <TableCell>
                      <Chip label={branch.code} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>{branch.city ?? '—'}</TableCell>
                    <TableCell>
                      <Chip
                        label={branch.isActive ? 'Aktif' : 'Pasif'}
                        size="small"
                        color={branch.isActive ? 'success' : 'default'}
                        variant={branch.isActive ? 'filled' : 'outlined'}
                      />
                    </TableCell>
                    {canManage ? (
                      <TableCell align="right">
                        <Tooltip title="Düzenle">
                          <IconButton size="small" onClick={() => openEdit(branch)}>
                            <EditOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Sil">
                          <IconButton size="small" onClick={() => setPendingDelete(branch)}>
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
          <BranchFormDialog
            open={formOpen}
            branch={editing}
            submitting={submitting}
            onSubmit={handleSubmit}
            onClose={closeForm}
          />
          <ConfirmDialog
            open={pendingDelete !== null}
            title="Şubeyi sil"
            message={`"${pendingDelete?.name ?? ''}" şubesini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`}
            loading={deleteMutation.isPending}
            onConfirm={confirmDelete}
            onCancel={() => setPendingDelete(null)}
          />
        </>
      ) : null}
    </Box>
  );
}

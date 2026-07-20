import { useMemo, useState } from 'react';
import {
  Avatar,
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
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutlined';
import { PageHeader } from '../../components/PageHeader';
import { EmptyState } from '../../components/EmptyState';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { DataTableSkeleton } from '../../components/DataTableSkeleton';
import { useSnackbar } from '../../components/SnackbarProvider';
import { useAuthStore } from '../../lib/auth-store';
import { getApiErrorMessage } from '../../lib/api-error';
import { ROLE_CHIP_COLORS, ROLE_LABELS } from '../../lib/role-labels';
import { useBranches } from '../branches/hooks/useBranches';
import { UserFormDialog } from './UserFormDialog';
import { useUsers } from './hooks/useUsers';
import { useUserMutations } from './hooks/useUserMutations';
import type { UserFormValues } from './schemas';
import type { User } from './types';

/** "Ayşe Yılmaz" → "AY" gibi en fazla iki baş harf üretir. */
function initialsOf(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase('tr-TR') ?? '')
    .join('');
}

/**
 * Kullanıcılar yönetim ekranı — liste + CRUD, rol ve şube ataması
 * (mockup: web_kullanicilarr). Sayfaya erişim router seviyesinde yalnızca
 * FIRM_ADMIN'e açıktır (bkz. RoleGuard), bu yüzden burada ayrıca rol kontrolü
 * yapılmaz; yalnızca kendi hesabını silme engellenir (backend de 400 döner).
 */
export function UsersPage() {
  const currentUserId = useAuthStore((state) => state.user?.id);
  const { showSuccess, showError } = useSnackbar();

  const { data: users, isLoading, isError } = useUsers();
  const { data: branches } = useBranches();
  const { createMutation, updateMutation, deleteMutation } = useUserMutations();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [pendingDelete, setPendingDelete] = useState<User | null>(null);

  // branchId → şube adı çözümlemesi (tabloda ŞUBE sütunu için).
  const branchNameById = useMemo(() => {
    const map = new Map<string, string>();
    branches?.forEach((branch) => map.set(branch.id, branch.name));
    return map;
  }, [branches]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (user: User) => {
    setEditing(user);
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditing(null);
  };

  const handleSubmit = (values: UserFormValues) => {
    if (editing) {
      updateMutation.mutate(
        { id: editing.id, values },
        {
          onSuccess: () => {
            showSuccess('Kullanıcı güncellendi.');
            closeForm();
          },
          onError: (error) => showError(getApiErrorMessage(error, 'Kullanıcı güncellenemedi.')),
        },
      );
    } else {
      createMutation.mutate(values, {
        onSuccess: () => {
          showSuccess('Kullanıcı eklendi.');
          closeForm();
        },
        onError: (error) => showError(getApiErrorMessage(error, 'Kullanıcı eklenemedi.')),
      });
    }
  };

  const confirmDelete = () => {
    if (!pendingDelete) {
      return;
    }
    deleteMutation.mutate(pendingDelete.id, {
      onSuccess: () => {
        showSuccess('Kullanıcı silindi.');
        setPendingDelete(null);
      },
      onError: (error) => {
        showError(getApiErrorMessage(error, 'Kullanıcı silinemedi.'));
        setPendingDelete(null);
      },
    });
  };

  const addButton = (
    <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
      Yeni Kullanıcı
    </Button>
  );

  const submitting = createMutation.isPending || updateMutation.isPending;
  const hasUsers = Boolean(users && users.length > 0);

  return (
    <Box>
      <PageHeader
        title="Kullanıcılar"
        description="Firma kullanıcılarını ve rollerini yönetin"
        action={addButton}
      />

      {isError ? (
        <Paper>
          <EmptyState
            icon={<PeopleOutlineIcon fontSize="inherit" />}
            title="Kullanıcılar yüklenemedi"
            description="Bir hata oluştu. Lütfen sayfayı yenileyip tekrar deneyin."
          />
        </Paper>
      ) : !isLoading && !hasUsers ? (
        <Paper>
          <EmptyState
            icon={<PeopleOutlineIcon fontSize="inherit" />}
            title="Henüz kullanıcı eklenmemiş"
            description="Sağ üstten yeni kullanıcı ekleyebilirsiniz."
            action={addButton}
          />
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>AD SOYAD</TableCell>
                <TableCell>E-POSTA</TableCell>
                <TableCell>ROL</TableCell>
                <TableCell>ŞUBE</TableCell>
                <TableCell>DURUM</TableCell>
                <TableCell align="right">AKSİYON</TableCell>
              </TableRow>
            </TableHead>
            {isLoading ? (
              <DataTableSkeleton columns={6} />
            ) : (
              <TableBody>
                {users?.map((user) => {
                  const isSelf = user.id === currentUserId;
                  return (
                    <TableRow key={user.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ width: 32, height: 32, fontSize: 13 }}>
                            {initialsOf(user.fullName)}
                          </Avatar>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {user.fullName}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Chip
                          label={ROLE_LABELS[user.role]}
                          size="small"
                          color={ROLE_CHIP_COLORS[user.role]}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {user.branchId ? (branchNameById.get(user.branchId) ?? '—') : '—'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.isActive ? 'Aktif' : 'Pasif'}
                          size="small"
                          color={user.isActive ? 'success' : 'default'}
                          variant={user.isActive ? 'filled' : 'outlined'}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Düzenle">
                          <IconButton size="small" onClick={() => openEdit(user)}>
                            <EditOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        {/* Kendi hesabını silmek backend'de de engellidir (400). */}
                        <Tooltip title={isSelf ? 'Kendinizi silemezsiniz' : 'Sil'}>
                          <span>
                            <IconButton
                              size="small"
                              disabled={isSelf}
                              onClick={() => setPendingDelete(user)}
                            >
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            )}
          </Table>
        </TableContainer>
      )}

      <UserFormDialog
        open={formOpen}
        user={editing}
        submitting={submitting}
        onSubmit={handleSubmit}
        onClose={closeForm}
      />
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Kullanıcıyı sil"
        message={`"${pendingDelete?.fullName ?? ''}" adlı kullanıcıyı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`}
        loading={deleteMutation.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </Box>
  );
}

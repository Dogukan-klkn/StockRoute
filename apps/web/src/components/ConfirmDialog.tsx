import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';

/**
 * Yıkıcı işlemler (özellikle silme) için onay diyaloğu. Doğrudan silme yoktur;
 * her `DELETE` akışı bu diyalogdan geçer (bkz. plan §12 — güvenli aksiyonlar).
 * `loading` sırasında onay butonu devre dışı kalır (çift tetiklemeyi önler).
 */
interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  /** Onay butonu metni (varsayılan: "Sil"). */
  confirmLabel?: string;
  /** Onay butonu rengi (varsayılan: "error" — silme için). */
  confirmColor?: 'error' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Sil',
  confirmColor = 'error',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel} color="inherit" disabled={loading}>
          İptal
        </Button>
        <Button onClick={onConfirm} color={confirmColor} variant="contained" disabled={loading}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

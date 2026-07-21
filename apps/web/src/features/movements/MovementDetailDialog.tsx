import type { ReactNode } from 'react';
import {
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { PRODUCT_UNIT_LABELS } from '../products/schemas';
import { MovementStatusChip } from './MovementStatusChip';
import { formatMovementDate, shortMovementId } from './movement-format';
import type { MovementDetail } from './types';

/**
 * Transfer detay modalı — çoklu kalem burada listelenir (liste tablosu tek
 * satırda tüm kalemleri gösteremez).
 *
 * Durum geçişi aksiyonları `actions` ile dışarıdan verilir; modal hangi
 * butonların görüneceğini bilmez (RBAC + durum makinesi kararı sayfada verilir).
 */
interface MovementDetailDialogProps {
  open: boolean;
  movement: MovementDetail | undefined;
  loading: boolean;
  /** Durum ve role göre hesaplanmış aksiyon butonları. */
  actions?: ReactNode;
  onClose: () => void;
}

/** Etiket + değer satırı (detay üst bilgisi). */
function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'baseline' }}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 108, flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography variant="body2" component="div">
        {value}
      </Typography>
    </Box>
  );
}

export function MovementDetailDialog({
  open,
  movement,
  loading,
  actions,
  onClose,
}: MovementDetailDialogProps) {
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
        Transfer Detayı
        <IconButton onClick={onClose} size="small" aria-label="Kapat">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {loading || !movement ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={2.5}>
            <Stack spacing={1.25}>
              <InfoRow label="Transfer No" value={shortMovementId(movement.id)} />
              <InfoRow
                label="Güzergah"
                value={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {movement.sourceBranch.name}
                    <ArrowForwardIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    <strong>{movement.destinationBranch.name}</strong>
                  </Box>
                }
              />
              <InfoRow label="Durum" value={<MovementStatusChip status={movement.status} />} />
              <InfoRow label="Tarih" value={formatMovementDate(movement.createdAt)} />
              <InfoRow label="Talep Eden" value={movement.requestedBy.fullName} />
              {movement.approvedBy ? (
                <InfoRow label="Onaylayan" value={movement.approvedBy.fullName} />
              ) : null}
              {movement.shippedBy ? (
                <InfoRow label="Sevk Eden" value={movement.shippedBy.fullName} />
              ) : null}
              {movement.receivedBy ? (
                <InfoRow label="Teslim Alan" value={movement.receivedBy.fullName} />
              ) : null}
              {movement.note ? <InfoRow label="Not" value={movement.note} /> : null}
            </Stack>

            <Divider />

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Ürünler ({movement.items.length} kalem)
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>ÜRÜN</TableCell>
                    <TableCell align="right">MİKTAR</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {movement.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {item.product.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.product.sku}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <strong>{item.quantity}</strong>{' '}
                        <Typography component="span" variant="caption" color="text.secondary">
                          {PRODUCT_UNIT_LABELS[item.product.unit].toLocaleLowerCase('tr')}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>

            {actions ? (
              <>
                <Divider />
                <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                  {actions}
                </Stack>
              </>
            ) : null}
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}

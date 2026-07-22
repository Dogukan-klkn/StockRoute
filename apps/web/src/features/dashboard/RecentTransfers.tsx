import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Link,
  Paper,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { MovementStatusChip } from '../movements/MovementStatusChip';
import { formatMovementDate, shortMovementId } from '../movements/movement-format';
import type { Movement } from '../movements/types';

interface RecentTransfersProps {
  movements: Movement[];
  isLoading: boolean;
}

/**
 * Toplam kalem adedi — mockup tek bir "miktar" sütunu gösterir.
 *
 * Mockup transferi tek ürünlü varsayar; backend'de bir transfer **çok kalemli**
 * olabilir (`items[]`). Bu yüzden miktar olarak kalemlerin toplamı gösterilir;
 * kalem sayısı 1'den fazlaysa içerik sütununda "N kalem" olarak belirtilir
 * (Transferler ekranındaki gösterimle aynı mantık).
 */
function totalQuantity(movement: Movement): number {
  return movement.items.reduce((sum, item) => sum + item.quantity, 0);
}

/** Kalem özeti: tek kalemse adet, çoksa kalem sayısı. */
function itemSummary(movement: Movement): string {
  return movement.items.length > 1
    ? `${movement.items.length} kalem`
    : `${totalQuantity(movement)} adet`;
}

/**
 * "Son Transferler" bölümü (mockup: web-dashboard).
 *
 * Not: Liste yanıtındaki kalemlerde ürün bilgisi yoktur (yalnızca detay
 * yanıtında gelir — bkz. movements/types.ts). Bu yüzden mockup'taki "ÜRÜN"
 * sütunu yerine transfer numarası ve kalem özeti gösterilir; ürün adı için
 * ekstra N istek atmak yerine transfer detayına yönlendirilir.
 */
export function RecentTransfers({ movements, isLoading }: RecentTransfersProps) {
  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="h6">Son Transferler</Typography>
        <Link component={RouterLink} to="/movements" variant="body2" underline="hover">
          Tümünü gör
        </Link>
      </Box>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Transfer No</TableCell>
              <TableCell>Kaynak → Hedef</TableCell>
              <TableCell align="right">İçerik</TableCell>
              <TableCell>Durum</TableCell>
              <TableCell>Tarih</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell colSpan={5}>
                    <Skeleton variant="text" height={32} />
                  </TableCell>
                </TableRow>
              ))
            ) : movements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4, border: 0 }}>
                  <Typography variant="body2" color="text.secondary">
                    Henüz transfer yok
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              movements.map((movement) => (
                <TableRow key={movement.id} hover>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {shortMovementId(movement.id)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="primary.main">
                      {movement.sourceBranch.name} → {movement.destinationBranch.name}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">{itemSummary(movement)}</TableCell>
                  <TableCell>
                    <MovementStatusChip status={movement.status} />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {formatMovementDate(movement.createdAt)}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}

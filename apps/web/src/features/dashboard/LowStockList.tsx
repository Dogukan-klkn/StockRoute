import { Link as RouterLink } from 'react-router-dom';
import { Box, Chip, Link, Paper, Skeleton, Stack, Typography } from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import type { InventoryItem } from '../inventory/types';

interface LowStockListProps {
  items: InventoryItem[];
  /** Toplam düşük stok sayısı (başlıktaki rozet); listede ilk N gösterilir. */
  totalCount: number | null;
  isLoading: boolean;
}

/**
 * "Düşük Stok" bölümü (mockup: web-dashboard).
 *
 * Her satır: ürün adı + şube adı, sağda mevcut miktar ve eşik. Miktar rengi
 * kritikliğe göre değişir (eşiğin yarısının altı `error`, üstü `warning`) —
 * mockup'taki kırmızı/turuncu ayrımı. Renkler tema paletinden gelir.
 */
export function LowStockList({ items, totalCount, isLoading }: LowStockListProps) {
  return (
    <Paper sx={{ p: 3, height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">Düşük Stok</Typography>
        {!isLoading && totalCount !== null && totalCount > 0 ? (
          <Chip label={`${totalCount} ürün`} size="small" color="error" variant="outlined" />
        ) : null}
      </Box>

      {isLoading ? (
        <Stack spacing={2}>
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} variant="rectangular" height={48} />
          ))}
        </Stack>
      ) : items.length === 0 ? (
        <Box sx={{ py: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Düşük stok uyarısı yok
          </Typography>
        </Box>
      ) : (
        <Stack spacing={2}>
          {items.map((item) => {
            // Eşiğin yarısının altındaki stok "kritik" kabul edilir.
            const critical = item.quantity * 2 <= item.minThreshold;
            const color = critical ? 'error' : 'warning';

            return (
              <Box key={item.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: 'text.secondary',
                    bgcolor: (theme: Theme) => alpha(theme.palette.text.primary, 0.06),
                  }}
                >
                  <Inventory2Icon fontSize="small" />
                </Box>
                <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                  <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
                    {item.product.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap component="div">
                    {item.branch.name}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right', flexShrink: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: `${color}.main` }}>
                    {item.quantity}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    / {item.minThreshold} eşik
                  </Typography>
                </Box>
              </Box>
            );
          })}
          <Link
            component={RouterLink}
            to="/inventory"
            variant="body2"
            underline="hover"
            sx={{ alignSelf: 'flex-start' }}
          >
            Envantere git
          </Link>
        </Stack>
      )}
    </Paper>
  );
}

import { useNavigate } from 'react-router-dom';
import { Box, Button, Grid, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import StoreIcon from '@mui/icons-material/Store';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { KpiCard, type KpiCardProps } from './KpiCard';
import { RecentTransfers } from './RecentTransfers';
import { LowStockList } from './LowStockList';
import { useDashboardStats } from './hooks/useDashboardStats';

/**
 * Genel Bakış ekranı (plan §12.1, mockup: web-dashboard).
 *
 * Özet kartlar mevcut liste uçlarından türetilir (özel dashboard ucu yoktur);
 * altta "Son Transferler" ve "Düşük Stok" bölümleri bulunur. Ekran, diğer
 * ekranlarla aynı query anahtarlarını paylaştığı için real-time olaylar
 * (bkz. useRealtimeSync) geldiğinde kartlar ve listeler kendiliğinden tazelenir.
 *
 * RBAC: Erişilemeyen veriden türetilen KPI **gizlenir** (kart hiç render
 * edilmez); yanıltıcı olacağı için "0" veya "—" gösterilmez. Bugün yalnızca
 * Düşük Stok kartı gizlenebilir: şube listeleyemeyen ve atanmış şubesi de
 * olmayan kullanıcı envanter kapsamı belirleyemez.
 */
export function DashboardPage() {
  const navigate = useNavigate();
  const {
    branchCount,
    productCount,
    pendingMovementCount,
    lowStockCount,
    recentMovements,
    lowStockItems,
    canSeeLowStock,
    isLoading,
  } = useDashboardStats();

  const cards: KpiCardProps[] = [
    {
      label: 'Toplam Şube',
      value: branchCount,
      icon: <StoreIcon />,
      color: 'primary',
      isLoading,
    },
    {
      label: 'Toplam Ürün',
      value: productCount,
      icon: <Inventory2Icon />,
      color: 'success',
      isLoading,
    },
    {
      label: 'Bekleyen Transfer',
      value: pendingMovementCount,
      icon: <SwapHorizIcon />,
      color: 'warning',
      chipLabel: pendingMovementCount ? 'Aktif' : undefined,
      isLoading,
    },
  ];

  if (canSeeLowStock) {
    cards.push({
      label: 'Düşük Stok',
      value: lowStockCount,
      icon: <WarningAmberIcon />,
      color: 'error',
      chipLabel: lowStockCount ? 'Kritik' : undefined,
      isLoading,
    });
  }

  // Kart sayısı role göre değişebildiğinden sütun genişliği dinamik hesaplanır
  // (4 kart → 3'er sütun, 3 kart → 4'er sütun); satır her durumda dolu görünür.
  const cardColumns = 12 / cards.length;

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h4" gutterBottom>
            Genel Bakış
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Tüm şubelerinizin envanter ve transfer durumu
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => navigate('/movements')}
          sx={{ flexShrink: 0 }}
        >
          Yeni Transfer
        </Button>
      </Box>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {cards.map((card) => (
          <Grid key={card.label} size={{ xs: 12, sm: 6, md: cardColumns }}>
            <KpiCard {...card} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <RecentTransfers movements={recentMovements} isLoading={isLoading} />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          {canSeeLowStock ? (
            <LowStockList items={lowStockItems} totalCount={lowStockCount} isLoading={isLoading} />
          ) : null}
        </Grid>
      </Grid>
    </Box>
  );
}

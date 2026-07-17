import type { ReactNode } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import StoreIcon from '@mui/icons-material/Store';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

type KpiColor = 'primary' | 'success' | 'warning' | 'error';

interface KpiCardProps {
  label: string;
  value: number;
  icon: ReactNode;
  color: KpiColor;
}

function KpiCard({ label, value, icon, color }: KpiCardProps) {
  return (
    <Card>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            color: `${color}.main`,
            bgcolor: (theme: Theme) => alpha(theme.palette[color].main, 0.1),
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
          <Typography variant="h3" sx={{ color: 'primary.dark' }}>
            {value}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

/** Placeholder KPI değerleri — Gün 15'te gerçek verilerle değişecek. */
const KPI_CARDS: KpiCardProps[] = [
  { label: 'Toplam Şube', value: 0, icon: <StoreIcon />, color: 'primary' },
  { label: 'Toplam Ürün', value: 0, icon: <Inventory2Icon />, color: 'success' },
  { label: 'Bekleyen Transfer', value: 0, icon: <SwapHorizIcon />, color: 'warning' },
  { label: 'Düşük Stok Uyarısı', value: 0, icon: <WarningAmberIcon />, color: 'error' },
];

export function DashboardPage() {
  return (
    <Box>
      <Alert severity="info" sx={{ mb: 3 }}>
        Bu ekran Gün 15&apos;te gerçek verilerle bağlanacak.
      </Alert>

      <Typography variant="h4" gutterBottom>
        Genel Bakış
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Tüm şubelerinizin envanter ve transfer durumu
      </Typography>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {KPI_CARDS.map((card) => (
          <Grid key={card.label} size={{ xs: 12, sm: 6, md: 3 }}>
            <KpiCard {...card} />
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Son Transferler
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Ürün</TableCell>
                    <TableCell>Kaynak → Hedef</TableCell>
                    <TableCell>Durum</TableCell>
                    <TableCell>Tarih</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell colSpan={4} align="center" sx={{ py: 4, border: 0 }}>
                      <Typography variant="body2" color="text.secondary">
                        Henüz transfer yok
                      </Typography>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Düşük Stok
            </Typography>
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Uyarı bulunmuyor
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

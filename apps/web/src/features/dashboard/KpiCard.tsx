import type { ReactNode } from 'react';
import { Box, Card, CardContent, Chip, Skeleton, Typography } from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';

export type KpiColor = 'primary' | 'success' | 'warning' | 'error';

export interface KpiCardProps {
  label: string;
  /** KPI değeri; `null` ise yükleniyor kabul edilir (skeleton gösterilir). */
  value: number | null;
  icon: ReactNode;
  color: KpiColor;
  /** Sağ üstteki durum etiketi (mockup: "Aktif", "Kritik"). */
  chipLabel?: string;
  isLoading?: boolean;
}

/**
 * Dashboard özet kartı (plan §12.1, mockup: web-dashboard).
 *
 * Gün 14'teki tasarımı korur (yuvarlak ikon rozeti + etiket + büyük sayı);
 * mockup'taki sağ üst durum etiketi ve yükleme iskeleti eklenmiştir.
 *
 * NOT (mockup sapması): Mockup'ta bazı kartlarda sayısal değişim rozeti
 * (`+2`, `+128`) vardır. Backend geçmiş döneme göre değişim verisi dönmediği
 * için bu rozetler **gösterilmez** — uydurma sayı üretmemek adına yalnızca
 * durum etiketleri ("Aktif", "Kritik") kullanılır (bkz. Gün 15-16 disiplini).
 */
export function KpiCard({ label, value, icon, color, chipLabel, isLoading }: KpiCardProps) {
  const showSkeleton = isLoading || value === null;

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
        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
          {showSkeleton ? (
            <Skeleton variant="text" width={64} height={48} />
          ) : (
            <Typography variant="h3" sx={{ color: 'primary.dark' }}>
              {value.toLocaleString('tr-TR')}
            </Typography>
          )}
        </Box>
        {chipLabel && !showSkeleton ? (
          <Chip label={chipLabel} size="small" color={color} variant="outlined" />
        ) : null}
      </CardContent>
    </Card>
  );
}

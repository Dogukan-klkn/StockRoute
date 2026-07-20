import type { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';

/**
 * Boş liste / hata durumları için ortak görünüm. Tablo yerine merkezlenmiş bir
 * mesaj (isteğe bağlı ikon + başlık + açıklama + eylem) gösterir
 * (bkz. plan §12 — boş durumlar).
 */
interface EmptyStateProps {
  /** Üstte gösterilecek ikon (genellikle bir MUI icon bileşeni). */
  icon?: ReactNode;
  title: string;
  description?: string;
  /** İsteğe bağlı eylem (ör. "Yeni Şube" butonu). */
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: 1,
        py: 8,
        px: 3,
      }}
    >
      {icon ? <Box sx={{ color: 'text.secondary', fontSize: 48, mb: 1 }}>{icon}</Box> : null}
      <Typography variant="h6" color="text.primary">
        {title}
      </Typography>
      {description ? (
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
          {description}
        </Typography>
      ) : null}
      {action ? <Box sx={{ mt: 2 }}>{action}</Box> : null}
    </Box>
  );
}

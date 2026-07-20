import type { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';

/**
 * Yönetim sayfalarının ortak başlığı: sol tarafta başlık + isteğe bağlı açıklama,
 * sağ tarafta isteğe bağlı ana eylem (ör. "Yeni Şube" butonu). Mockup'lardaki
 * (web_subeler / web_urunler / web_kullanicilarr) üst şerit düzenini uygular.
 */
interface PageHeaderProps {
  title: string;
  description?: string;
  /** Sağ üstteki eylem alanı (genellikle bir primary buton). */
  action?: ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 2,
        mb: 3,
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h4">{title}</Typography>
        {description ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {description}
          </Typography>
        ) : null}
      </Box>
      {action ? <Box sx={{ flexShrink: 0 }}>{action}</Box> : null}
    </Box>
  );
}

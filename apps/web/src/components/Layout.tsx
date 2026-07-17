import { AppBar, Box, Toolbar, Typography } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { useAuthStore } from '../lib/auth-store';
import { Sidebar } from './Sidebar';
import { UserBadge } from './UserBadge';

/** Tüm iç sayfaların ortak düzeni: kalıcı sidebar + topbar + içerik (plan §12.1). */
export function Layout() {
  const tenantSlug = useAuthStore((state) => state.tenantSlug);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Sidebar />
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            bgcolor: 'background.paper',
            color: 'text.primary',
            borderBottom: 1,
            borderColor: 'divider',
            boxShadow: 'none',
          }}
        >
          <Toolbar sx={{ justifyContent: 'space-between' }}>
            <Typography variant="h6">{tenantSlug ?? '—'}</Typography>
            <UserBadge />
          </Toolbar>
        </AppBar>
        <Box component="main" sx={{ p: 4 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}

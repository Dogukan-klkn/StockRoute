import {
  Box,
  Divider,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import DashboardIcon from '@mui/icons-material/Dashboard';
import StoreIcon from '@mui/icons-material/Store';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import PeopleIcon from '@mui/icons-material/People';
import LogoutIcon from '@mui/icons-material/Logout';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../lib/auth-store';
import { Logo } from './Logo';

export const SIDEBAR_WIDTH = 240;

const NAV_ITEMS = [
  { label: 'Kontrol Paneli', path: '/', icon: <DashboardIcon /> },
  { label: 'Şubeler', path: '/branches', icon: <StoreIcon /> },
  { label: 'Ürünler', path: '/products', icon: <Inventory2Icon /> },
  { label: 'Envanter', path: '/inventory', icon: <WarehouseIcon /> },
  { label: 'Transferler', path: '/movements', icon: <SwapHorizIcon /> },
  { label: 'Kullanıcılar', path: '/users', icon: <PeopleIcon /> },
] as const;

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: SIDEBAR_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: SIDEBAR_WIDTH,
          boxSizing: 'border-box',
          bgcolor: 'background.paper',
          borderRight: 1,
          borderColor: 'divider',
          boxShadow: 'none',
        },
      }}
    >
      <Box sx={{ p: 3 }}>
        <Logo variant="small" />
      </Box>
      <Divider />
      <Typography variant="overline" color="text.secondary" sx={{ px: 3, pt: 2, letterSpacing: 1 }}>
        Menü
      </Typography>
      <List sx={{ flexGrow: 1 }}>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.path);
          return (
            <ListItemButton
              key={item.path}
              onClick={() => navigate(item.path)}
              sx={{
                borderLeft: 3,
                borderLeftColor: active ? 'primary.main' : 'transparent',
                color: active ? 'primary.main' : 'text.secondary',
                bgcolor: active ? (theme) => alpha(theme.palette.primary.main, 0.1) : 'transparent',
                '& .MuiListItemIcon-root': {
                  color: active ? 'primary.main' : 'text.secondary',
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText
                primary={item.label}
                slotProps={{ primary: { sx: { fontWeight: active ? 600 : 500, fontSize: 14 } } }}
              />
            </ListItemButton>
          );
        })}
      </List>
      <Divider />
      <List>
        <ListItemButton onClick={handleLogout} sx={{ color: 'text.secondary' }}>
          <ListItemIcon sx={{ minWidth: 40, color: 'text.secondary' }}>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary="Çıkış Yap" slotProps={{ primary: { sx: { fontSize: 14 } } }} />
        </ListItemButton>
      </List>
    </Drawer>
  );
}

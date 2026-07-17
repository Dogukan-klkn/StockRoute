import { Box, Typography } from '@mui/material';
import { Logo } from './components/Logo';

export default function App() {
  return (
    <Box sx={{ p: 4, bgcolor: 'background.default', minHeight: '100vh' }}>
      <Logo variant="large" />
      <Typography variant="h4" sx={{ mt: 2 }}>
        StockRoute (iskelet)
      </Typography>
      <Typography color="text.secondary">Aşama 2&apos;de login sayfası gelecek.</Typography>
    </Box>
  );
}

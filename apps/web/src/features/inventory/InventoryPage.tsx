import { Alert, Box, Typography } from '@mui/material';

export function InventoryPage() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Envanter
      </Typography>
      <Alert severity="info">Bu ekran Gün 15&apos;te gelecek.</Alert>
    </Box>
  );
}

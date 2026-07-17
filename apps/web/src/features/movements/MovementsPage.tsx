import { Alert, Box, Typography } from '@mui/material';

export function MovementsPage() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Transferler
      </Typography>
      <Alert severity="info">Bu ekran Gün 15&apos;te gelecek.</Alert>
    </Box>
  );
}

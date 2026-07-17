import { Alert, Box, Typography } from '@mui/material';

export function UsersPage() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Kullanıcılar
      </Typography>
      <Alert severity="info">Bu ekran Gün 15&apos;te gelecek.</Alert>
    </Box>
  );
}

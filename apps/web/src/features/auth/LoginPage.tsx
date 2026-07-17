import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Navigate } from 'react-router-dom';
import axios from 'axios';
import { Logo } from '../../components/Logo';
import { useAuthStore } from '../../lib/auth-store';
import { useLogin } from './hooks/useLogin';
import { loginSchema, type LoginInput } from './schemas';

/** Alan etiketi — mockup'taki gibi input'un üzerinde durur (floating label yok). */
function FieldLabel({ children }: { children: string }) {
  return (
    <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
      {children}
    </Typography>
  );
}

export function LoginPage() {
  const isAuthenticated = useAuthStore((state) => state.accessToken !== null);
  const login = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { tenantSlug: '', email: '', password: '' },
  });

  const isUnauthorized = axios.isAxiosError(login.error) && login.error.response?.status === 401;

  const onSubmit = handleSubmit((input) => login.mutate(input));

  // Oturum zaten açıksa (veya login başarılı olduysa) panele yönlendir.
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Paper sx={{ width: '100%', maxWidth: 400, p: 4 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
          <Logo variant="large" />
          <Typography variant="h5" sx={{ mt: 2 }}>
            Hesabınıza giriş yapın
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Firma yönetim paneline giriş yapın
          </Typography>
        </Box>

        {login.isError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {isUnauthorized
              ? 'E-posta, şifre veya firma kodu hatalı'
              : 'Giriş yapılamadı, lütfen tekrar deneyin'}
          </Alert>
        )}

        <Box component="form" onSubmit={onSubmit} noValidate>
          <FieldLabel>Firma Kodu</FieldLabel>
          <TextField
            fullWidth
            placeholder="Örn. demo-firma"
            autoComplete="organization"
            error={Boolean(errors.tenantSlug)}
            helperText={errors.tenantSlug?.message}
            sx={{ mb: 2 }}
            {...register('tenantSlug')}
          />

          <FieldLabel>E-posta</FieldLabel>
          <TextField
            fullWidth
            type="email"
            placeholder="ornek@firma.com"
            autoComplete="email"
            error={Boolean(errors.email)}
            helperText={errors.email?.message}
            sx={{ mb: 2 }}
            {...register('email')}
          />

          <FieldLabel>Şifre</FieldLabel>
          <TextField
            fullWidth
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
            error={Boolean(errors.password)}
            helperText={errors.password?.message}
            sx={{ mb: 3 }}
            {...register('password')}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={login.isPending}
            sx={{ height: 48 }}
          >
            {login.isPending ? <CircularProgress size={20} color="inherit" /> : 'Giriş Yap'}
          </Button>
        </Box>

        <Divider sx={{ my: 3 }} />
        <Typography variant="body2" color="text.secondary" align="center">
          Firma kodu, firmanız kayıt edilirken belirlenen tekil kısaltmasıdır (örn.{' '}
          <Box component="code" sx={{ fontFamily: '"Roboto Mono", monospace' }}>
            demo-firma
          </Box>
          ).
        </Typography>
      </Paper>
    </Box>
  );
}

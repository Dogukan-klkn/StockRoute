import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Alert, Snackbar, type AlertColor } from '@mui/material';

/**
 * Hafif bildirim (toast) altyapısı — MUI `Snackbar` + `Alert` üzerine kurulu.
 *
 * Yeni bir bağımlılık (notistack vb.) eklemeden, tema ile tutarlı tek-mesajlı
 * success/error/info/warning bildirimleri sağlar. Uygulama kökünde bir kez
 * sarmalanır (bkz. AppProviders); herhangi bir bileşen `useSnackbar()` ile
 * `showSuccess` / `showError` çağırır (bkz. plan §12 — kullanıcı geri bildirimi).
 */
interface SnackbarState {
  open: boolean;
  message: string;
  severity: AlertColor;
}

interface SnackbarContextValue {
  /** Belirtilen önem derecesiyle bir bildirim gösterir. */
  notify: (message: string, severity: AlertColor) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showInfo: (message: string) => void;
}

const SnackbarContext = createContext<SnackbarContextValue | null>(null);

/** Bildirimin ekranda kalma süresi (ms). */
const AUTO_HIDE_MS = 4000;

export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success',
  });

  const notify = useCallback((message: string, severity: AlertColor) => {
    setState({ open: true, message, severity });
  }, []);

  const handleClose = useCallback((_event?: unknown, reason?: string) => {
    // Yanlışlıkla tıklamayla kapanmayı önle; yalnızca zaman aşımı/çarpı kapatır.
    if (reason === 'clickaway') {
      return;
    }
    setState((prev) => ({ ...prev, open: false }));
  }, []);

  const value = useMemo<SnackbarContextValue>(
    () => ({
      notify,
      showSuccess: (message) => notify(message, 'success'),
      showError: (message) => notify(message, 'error'),
      showInfo: (message) => notify(message, 'info'),
    }),
    [notify],
  );

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      <Snackbar
        open={state.open}
        autoHideDuration={AUTO_HIDE_MS}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleClose}
          severity={state.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {state.message}
        </Alert>
      </Snackbar>
    </SnackbarContext.Provider>
  );
}

/** Bildirim göstermek için hook. `SnackbarProvider` altında kullanılmalıdır. */
export function useSnackbar(): SnackbarContextValue {
  const ctx = useContext(SnackbarContext);
  if (!ctx) {
    throw new Error('useSnackbar, SnackbarProvider içinde kullanılmalıdır.');
  }
  return ctx;
}

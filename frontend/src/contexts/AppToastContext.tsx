import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Alert, Snackbar, type AlertColor } from '@mui/material';

const DEFAULT_DURATION_MS = 4500;

export type ToastOptions = {
  message: string;
  severity?: AlertColor;
  duration?: number;
};

type ToastState = ToastOptions & {
  open: boolean;
};

type AppToastContextValue = {
  showToast: (options: ToastOptions) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
};

const AppToastContext = createContext<AppToastContextValue | null>(null);

export function AppToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const showToast = useCallback(
    ({ message, severity = 'info', duration = DEFAULT_DURATION_MS }: ToastOptions) => {
      clearCloseTimer();
      setToast({ message, severity, duration, open: true });
    },
    [clearCloseTimer],
  );

  const success = useCallback(
    (message: string) => showToast({ message, severity: 'success' }),
    [showToast],
  );

  const error = useCallback(
    (message: string) => showToast({ message, severity: 'error', duration: 6000 }),
    [showToast],
  );

  const info = useCallback(
    (message: string) => showToast({ message, severity: 'info' }),
    [showToast],
  );

  const warning = useCallback(
    (message: string) => showToast({ message, severity: 'warning' }),
    [showToast],
  );

  const handleClose = useCallback(
    (_?: unknown, reason?: string) => {
      if (reason === 'clickaway') return;
      clearCloseTimer();
      setToast((prev) => (prev ? { ...prev, open: false } : null));
      closeTimerRef.current = setTimeout(() => setToast(null), 180);
    },
    [clearCloseTimer],
  );

  return (
    <AppToastContext.Provider value={{ showToast, success, error, info, warning }}>
      {children}
      <Snackbar
        open={toast?.open ?? false}
        autoHideDuration={toast?.duration ?? DEFAULT_DURATION_MS}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleClose}
          severity={toast?.severity ?? 'info'}
          variant="filled"
          elevation={4}
          sx={{ width: '100%', minWidth: { xs: 280, sm: 320 } }}
        >
          {toast?.message}
        </Alert>
      </Snackbar>
    </AppToastContext.Provider>
  );
}

export function useAppToast() {
  const ctx = useContext(AppToastContext);
  if (!ctx) {
    throw new Error('useAppToast deve ser usado dentro de AppToastProvider');
  }
  return ctx;
}

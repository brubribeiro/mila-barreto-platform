import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  IconButton,
  Switch,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { notificationsApi } from '../../api/notifications';
import { useAppToast } from '../../contexts/AppToastContext';
import { getApiErrorMessage } from '../../utils/apiError';
import { NOTIFICATION_TYPES } from '../../contexts/notificationsLabels';
import type { NotificationPreference, NotificationType } from '../../types';
import { AuroraIcon } from '../AuroraIcon';

interface NotificationPreferencesDialogProps {
  open: boolean;
  onClose: () => void;
}

export function NotificationPreferencesDialog({
  open,
  onClose,
}: NotificationPreferencesDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const queryClient = useQueryClient();
  const toast = useAppToast();

  const { data: prefs = [], isLoading } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: () => notificationsApi.getPreferences(),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: ({ type, enabled }: { type: NotificationType; enabled: boolean }) =>
      notificationsApi.setPreference(type, enabled),
    onMutate: async ({ type, enabled }) => {
      await queryClient.cancelQueries({ queryKey: ['notification-preferences'] });
      const previous = queryClient.getQueryData<NotificationPreference[]>([
        'notification-preferences',
      ]);
      queryClient.setQueryData<NotificationPreference[]>(
        ['notification-preferences'],
        (old = []) => {
          const exists = old.some((p) => p.type === type);
          return exists
            ? old.map((p) => (p.type === type ? { ...p, enabled } : p))
            : [...old, { type, enabled }];
        },
      );
      return { previous };
    },
    onError: (err, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(['notification-preferences'], context.previous);
      }
      toast.error(getApiErrorMessage(err, 'Não foi possível salvar a preferência.'));
    },
  });

  const isEnabled = (type: NotificationType) =>
    prefs.find((p) => p.type === type)?.enabled ?? true;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : '20px',
          ...(isMobile ? {} : { maxWidth: 520 }),
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 2,
          px: 3,
          py: 2.75,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box sx={{ lineHeight: 1.3 }}>
          <Typography sx={{ fontSize: '1.125rem', fontWeight: 800, letterSpacing: '-0.3px' }}>
            Preferências de notificação
          </Typography>
          <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
            Escolha o que e como você quer ser avisado
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          aria-label="Fechar"
          sx={{
            width: 36,
            height: 36,
            borderRadius: '10px',
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'grey.50',
            color: 'text.secondary',
            flexShrink: 0,
            '&:hover': { bgcolor: 'grey.100' },
          }}
        >
          <AuroraIcon name="close" size={18} strokeWidth={2} />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 0 }}>
        {isLoading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : (
          <Box sx={{ px: 3, py: 2.75 }}>
            <Typography
              sx={{
                fontSize: '0.72rem',
                fontWeight: 800,
                color: 'text.secondary',
                letterSpacing: '0.6px',
                textTransform: 'uppercase',
                mb: 1.5,
                opacity: 0.75,
              }}
            >
              Tipos de alerta
            </Typography>
            <Box>
              {NOTIFICATION_TYPES.map((t) => (
                <Box
                  key={t.type}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1.75,
                    py: 1.4,
                    borderBottom: '1px solid',
                    borderColor: 'grey.100',
                    '&:last-of-type': { borderBottom: 'none' },
                  }}
                >
                  <Box sx={{ lineHeight: 1.35, minWidth: 0 }}>
                    <Typography sx={{ fontSize: '0.85rem', fontWeight: 700 }}>{t.label}</Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                      {t.description}
                    </Typography>
                  </Box>
                  <Switch
                    checked={isEnabled(t.type)}
                    onChange={(e) =>
                      mutation.mutate({ type: t.type, enabled: e.target.checked })
                    }
                  />
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </DialogContent>

      {/* Footer */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 1.25,
          px: 3,
          py: 2,
          borderTop: '1px solid',
          borderColor: 'divider',
          bgcolor: 'grey.50',
        }}
      >
        <Button
          variant="contained"
          onClick={onClose}
          sx={{ height: 42, px: 2.5, borderRadius: '11px', fontWeight: 700 }}
        >
          Concluído
        </Button>
      </Box>
    </Dialog>
  );
}

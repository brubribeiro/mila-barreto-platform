import {
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  Switch,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { notificationsApi } from '../../api/notifications';
import { NOTIFICATION_TYPES } from '../../contexts/notificationsLabels';
import type { NotificationType } from '../../types';

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

  const { data: prefs = [], isLoading } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: () => notificationsApi.getPreferences(),
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: ({ type, enabled }: { type: NotificationType; enabled: boolean }) =>
      notificationsApi.setPreference(type, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
    },
  });

  const isEnabled = (type: NotificationType) =>
    prefs.find((p) => p.type === type)?.enabled ?? true;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen={isMobile}>
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h6">Preferências de notificação</Typography>
            <Typography variant="caption" color="text.secondary">
              Escolha quais notificações você quer receber
            </Typography>
          </Box>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        {isLoading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : (
          <List disablePadding>
            {NOTIFICATION_TYPES.map((t) => (
              <ListItem
                key={t.type}
                sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
                secondaryAction={
                  <Switch
                    edge="end"
                    checked={isEnabled(t.type)}
                    onChange={(e) =>
                      mutation.mutate({ type: t.type, enabled: e.target.checked })
                    }
                  />
                }
              >
                <ListItemText
                  primary={
                    <Typography variant="body1" fontWeight={500}>
                      {t.label}
                    </Typography>
                  }
                  secondary={t.description}
                />
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
}

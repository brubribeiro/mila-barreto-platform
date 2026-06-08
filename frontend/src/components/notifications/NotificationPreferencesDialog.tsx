import {
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  List,
  ListItem,
  ListItemText,
  Stack,
  Switch,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { notificationsApi } from '../../api/notifications';
import { DialogHeader, dialogPaperSx } from '../DialogCloseButton';
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
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{ sx: dialogPaperSx(isMobile) }}
    >
      <DialogHeader
        onClose={onClose}
        isMobile={isMobile}
        title="Preferências de notificação"
        subtitle="Escolha quais notificações você quer receber"
        icon={<NotificationsOutlinedIcon fontSize="small" />}
      />
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

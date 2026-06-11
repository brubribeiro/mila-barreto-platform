import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Badge,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Popover,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/NotificationsOutlined';
import SettingsIcon from '@mui/icons-material/Settings';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/pt-br';

import { notificationsApi } from '../../api/notifications';
import { NotificationPreferencesDialog } from './NotificationPreferencesDialog';
import type { Notification } from '../../types';

dayjs.extend(relativeTime);
dayjs.locale('pt-br');

const POLL_MS = 30_000;

interface NotificationsBellProps {
  iconColor?: string;
}

export function NotificationsBell({ iconColor }: NotificationsBellProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [prefsOpen, setPrefsOpen] = useState(false);

  const open = Boolean(anchorEl);

  const { data: count = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsApi.unreadCount(),
    refetchInterval: POLL_MS,
  });

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', 'list', 10],
    queryFn: () => notificationsApi.list({ limit: 10 }),
    enabled: open,
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
  };

  const handleClose = () => setAnchorEl(null);

  const handleClickNotification = (n: Notification) => {
    if (!n.read) markAsReadMutation.mutate(n.id);
    if (n.link) {
      navigate(n.link);
      handleClose();
    }
  };

  return (
    <>
      <Tooltip title="Notificações">
        <IconButton onClick={handleOpen} sx={{ color: iconColor }}>
          <Badge badgeContent={count} color="primary" max={99}>
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { width: 380, maxHeight: 500 } } }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ px: 2, py: 1.5 }}
        >
          <Typography variant="subtitle1" fontWeight={600}>
            Notificações
          </Typography>
          <Stack direction="row" spacing={0.5}>
            <Tooltip title="Preferências">
              <IconButton
                size="small"
                onClick={() => {
                  void queryClient.prefetchQuery({
                    queryKey: ['notification-preferences'],
                    queryFn: () => notificationsApi.getPreferences(),
                  });
                  setPrefsOpen(true);
                  handleClose();
                }}
              >
                <SettingsIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
        <Divider />

        {isLoading ? (
          <Box display="flex" justifyContent="center" py={3}>
            <CircularProgress size={24} />
          </Box>
        ) : notifications.length === 0 ? (
          <Box sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
            <Typography variant="body2">Você não tem notificações</Typography>
          </Box>
        ) : (
          <>
            <List sx={{ p: 0, maxHeight: 360, overflow: 'auto' }}>
              {notifications.map((n) => (
                <ListItemButton
                  key={n.id}
                  onClick={() => handleClickNotification(n)}
                  sx={{
                    alignItems: 'flex-start',
                    bgcolor: n.read ? 'transparent' : 'rgba(10, 186, 181, 0.04)',
                    borderLeft: '3px solid',
                    borderColor: n.read ? 'transparent' : 'primary.main',
                  }}
                >
                  <ListItemText
                    primary={
                      <Typography
                        variant="body2"
                        fontWeight={n.read ? 400 : 600}
                        sx={{ pr: 1 }}
                      >
                        {n.title}
                      </Typography>
                    }
                    secondary={
                      <>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          component="div"
                          sx={{ display: 'block', mb: 0.25 }}
                        >
                          {n.message}
                        </Typography>
                        <Typography variant="caption" color="text.disabled" component="div">
                          {dayjs(n.createdAt).fromNow()}
                        </Typography>
                      </>
                    }
                  />
                </ListItemButton>
              ))}
            </List>
            <Divider />
            <Stack direction="row" justifyContent="flex-end" sx={{ px: 2, py: 1 }}>
              <Button
                size="small"
                disabled={count === 0 || markAllAsReadMutation.isPending}
                onClick={() => markAllAsReadMutation.mutate()}
              >
                Marcar todas como lidas
              </Button>
            </Stack>
          </>
        )}
      </Popover>

      <NotificationPreferencesDialog
        open={prefsOpen}
        onClose={() => setPrefsOpen(false)}
      />
    </>
  );
}

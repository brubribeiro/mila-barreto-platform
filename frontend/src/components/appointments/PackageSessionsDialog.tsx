import { Box, Button, Dialog, DialogActions, DialogContent, Stack, Typography, alpha } from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import dayjs from 'dayjs';

import { fontSizes } from '../../theme/fontSizes';
import type { Appointment } from '../../types';
import { DialogHeader, dialogActionsBorderSx, dialogPaperSx, dialogSimpleContentSx } from '../DialogCloseButton';
import { STATUS_DOT, STATUS_LABEL } from './appointmentFormModel';

export function PackageSessionsDialog({
  open,
  onClose,
  isMobile,
  subtitle,
  sessions,
  currentAppointmentId,
  missingSessions,
  onScheduleMissing,
}: {
  open: boolean;
  onClose: () => void;
  isMobile: boolean;
  subtitle: string;
  sessions: Appointment[];
  currentAppointmentId?: string;
  missingSessions: number;
  onScheduleMissing: () => void;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { ...dialogPaperSx(isMobile), ...(isMobile ? {} : { maxWidth: 520 }) } }}
    >
      <DialogHeader
        onClose={onClose}
        title="Sessões do pacote"
        subtitle={subtitle}
        subtitleWrap
        icon={<ViewInArIcon fontSize="small" />}
      />
      <DialogContent sx={dialogSimpleContentSx}>
        {sessions.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
            Nenhuma sessão agendada ainda para este pacote.
          </Typography>
        ) : (
          <Stack spacing={1} sx={{ mt: 0.5 }}>
            {sessions.map((sess, idx) => {
              const isCurrent = currentAppointmentId === sess.id;
              const color = STATUS_DOT[sess.status] ?? '#8B8680';
              return (
                <Stack
                  key={sess.id}
                  direction="row"
                  alignItems="center"
                  spacing={1.25}
                  sx={{
                    px: 1.25,
                    py: 1,
                    borderRadius: '12px',
                    border: '1px solid',
                    borderColor: isCurrent ? 'primary.main' : 'divider',
                    bgcolor: isCurrent ? (t) => alpha(t.palette.primary.main, 0.06) : 'grey.50',
                  }}
                >
                  <Box
                    sx={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: fontSizes.xs,
                      fontWeight: 800,
                      bgcolor: (t) => alpha(t.palette.primary.main, 0.12),
                      color: 'primary.dark',
                    }}
                  >
                    {idx + 1}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: fontSizes.md, fontWeight: 700 }} noWrap>
                      {dayjs(sess.startAt).format('DD/MM/YYYY [às] HH:mm')}
                    </Typography>
                    {sess.procedure?.name && (
                      <Typography sx={{ fontSize: fontSizes.xs, color: 'text.secondary' }} noWrap>
                        {sess.procedure.name}
                      </Typography>
                    )}
                  </Box>
                  <Box
                    component="span"
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.6,
                      flexShrink: 0,
                      fontSize: fontSizes.xs,
                      fontWeight: 700,
                      color: 'text.secondary',
                    }}
                  >
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
                    {STATUS_LABEL[sess.status] ?? sess.status}
                  </Box>
                </Stack>
              );
            })}
          </Stack>
        )}
      </DialogContent>
      <DialogActions
        sx={{
          ...dialogActionsBorderSx,
          justifyContent: missingSessions > 0 ? 'space-between' : 'flex-end',
        }}
      >
        {missingSessions > 0 && (
          <Button
            variant="outlined"
            startIcon={<CalendarMonthIcon />}
            onClick={onScheduleMissing}
            sx={{
              bgcolor: 'background.paper',
              borderColor: 'divider',
              color: 'primary.main',
              fontWeight: 700,
              '&:hover': { bgcolor: 'grey.50', borderColor: 'primary.main' },
            }}
          >
            Agendar faltantes ({missingSessions})
          </Button>
        )}
        <Button
          variant="contained"
          onClick={onClose}
          sx={{ boxShadow: (t) => `0 6px 16px -6px ${t.palette.primary.main}` }}
        >
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  );
}

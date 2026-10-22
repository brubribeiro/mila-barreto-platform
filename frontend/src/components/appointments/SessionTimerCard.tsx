import { Box, Button, Paper, Stack, Typography, alpha } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';

import { fontSizes } from '../../theme/fontSizes';
import { formatElapsed } from './appointmentFormModel';
import { SectionIcon } from './AppointmentFormSection';
import type { SessionTimer } from './useSessionTimer';

interface SessionTimerProps {
  timer: SessionTimer;
  finishDisabled: boolean;
  onFinish: () => void;
}

/** Cartão do cronômetro (desktop/tablet). */
export function SessionTimerCard({ timer, finishDisabled, onFinish }: SessionTimerProps) {
  const {
    elapsed,
    isInProgress,
    hasFinishedAt,
    canStartSession,
    canFinishSession,
    showSessionControls,
    startMutation,
    pauseMutation,
    resumeMutation,
  } = timer;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.75,
        borderRadius: '14px',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        boxShadow: '0 1px 2px rgba(16,40,37,0.03)',
        flexShrink: 0,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap" useFlexGap>
        <SectionIcon>
          <TimerOutlinedIcon fontSize="small" />
        </SectionIcon>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: fontSizes.xs, fontWeight: 600, color: 'text.secondary' }}>
            Timer da sessão (opcional)
          </Typography>
          <Typography
            sx={{
              fontSize: fontSizes['3xl'],
              fontWeight: 800,
              fontVariantNumeric: 'tabular-nums',
              lineHeight: 1.1,
              color: isInProgress && !hasFinishedAt ? 'success.main' : 'text.primary',
            }}
          >
            {formatElapsed(elapsed)}
          </Typography>
        </Box>
        {showSessionControls && (
          <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
            {canStartSession && !isInProgress && !hasFinishedAt ? (
              <Button
                variant="contained"
                color="primary"
                size="small"
                startIcon={<PlayArrowIcon />}
                disabled={startMutation.isPending}
                onClick={() => startMutation.mutate()}
              >
                {startMutation.isPending ? 'Iniciando...' : 'Iniciar'}
              </Button>
            ) : isInProgress && !hasFinishedAt ? (
              <Button
                variant="outlined"
                color="inherit"
                size="small"
                startIcon={<PauseIcon />}
                disabled={pauseMutation.isPending}
                onClick={() => pauseMutation.mutate()}
              >
                {pauseMutation.isPending ? 'Pausando...' : 'Pausar'}
              </Button>
            ) : hasFinishedAt && isInProgress ? (
              <Button
                variant="outlined"
                color="primary"
                size="small"
                startIcon={<PlayArrowIcon />}
                disabled={resumeMutation.isPending}
                onClick={() => resumeMutation.mutate()}
              >
                {resumeMutation.isPending ? 'Retomando...' : 'Retomar'}
              </Button>
            ) : null}
            <Button
              variant="contained"
              color="success"
              size="small"
              startIcon={<CheckCircleOutlineIcon />}
              disabled={!canFinishSession || finishDisabled}
              onClick={onFinish}
            >
              Finalizar
            </Button>
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}

/** Versão compacta do cronômetro para o cabeçalho no celular. */
export function SessionTimerCompact({ timer, finishDisabled, onFinish }: SessionTimerProps) {
  const {
    elapsed,
    isInProgress,
    hasStartedAt,
    hasFinishedAt,
    canStartSession,
    canFinishSession,
    showSessionControls,
    startMutation,
    pauseMutation,
    resumeMutation,
  } = timer;
  const running = isInProgress && !hasFinishedAt;

  return (
    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
      {(isInProgress || hasStartedAt) && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            px: 1,
            py: 0.35,
            borderRadius: 1.5,
            bgcolor: running
              ? (theme) => alpha(theme.palette.success.main, 0.1)
              : (theme) => alpha(theme.palette.grey[500], 0.1),
            border: '1px solid',
            borderColor: running ? (theme) => alpha(theme.palette.success.main, 0.3) : 'divider',
          }}
        >
          <TimerOutlinedIcon sx={{ fontSize: 16, color: running ? 'success.main' : 'text.secondary' }} />
          <Typography
            variant="body2"
            fontWeight={700}
            sx={{ fontVariantNumeric: 'tabular-nums', color: running ? 'success.main' : 'text.primary' }}
          >
            {formatElapsed(elapsed)}
          </Typography>
        </Box>
      )}
      {showSessionControls && (
        <>
          {canStartSession && !isInProgress && !hasFinishedAt && (
            <Button variant="contained" color="primary" size="small" startIcon={<PlayArrowIcon />} disabled={startMutation.isPending} onClick={() => startMutation.mutate()}>
              Iniciar
            </Button>
          )}
          {running && (
            <Button variant="outlined" color="inherit" size="small" startIcon={<PauseIcon />} disabled={pauseMutation.isPending} onClick={() => pauseMutation.mutate()}>
              Pausar
            </Button>
          )}
          {hasFinishedAt && isInProgress && (
            <Button variant="outlined" color="primary" size="small" startIcon={<PlayArrowIcon />} disabled={resumeMutation.isPending} onClick={() => resumeMutation.mutate()}>
              Retomar
            </Button>
          )}
          <Button variant="contained" color="success" size="small" startIcon={<CheckCircleOutlineIcon />} disabled={!canFinishSession || finishDisabled} onClick={onFinish}>
            Finalizar
          </Button>
        </>
      )}
    </Stack>
  );
}

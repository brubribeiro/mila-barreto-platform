import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  ButtonGroup,
  Card,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  Divider,
  FormControlLabel,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EventBusyOutlinedIcon from '@mui/icons-material/EventBusyOutlined';
import EventOutlinedIcon from '@mui/icons-material/EventOutlined';
import LabelOutlinedIcon from '@mui/icons-material/LabelOutlined';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { PageHeader } from '../components/PageHeader';
import { DialogHeader, dialogActionsBorderSx, dialogPaperSx } from '../components/DialogCloseButton';
import { availabilityApi } from '../api/availability';
import { usersApi } from '../api/users';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../contexts/usePermissions';
import type { WorkingHours } from '../types';

const DAYS = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
];

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

type DayScheduleEdit = {
  works: boolean;
  startTime: string;
  endTime: string;
};

const DEFAULT_DAY: DayScheduleEdit = { works: false, startTime: '08:00', endTime: '18:00' };

const UNAVAIL_REASON_SUGGESTIONS = [
  'Férias',
  'Folga',
  'Compromisso pessoal',
  'Consulta médica',
  'Capacitação',
] as const;

const UNAVAIL_PERIOD_FIELD_SX = {
  flex: 1,
  minWidth: 0,
  width: '100%',
} as const;

const UNAVAIL_DATETIME_FIELD_SX = {
  ...UNAVAIL_PERIOD_FIELD_SX,
  '& .MuiInputBase-input': {
    textAlign: 'left',
  },
  '& input[type="datetime-local"]': {
    textAlign: 'left',
  },
  '& input[type="datetime-local"]::-webkit-datetime-edit': {
    textAlign: 'left',
  },
  '& input[type="datetime-local"]::-webkit-calendar-picker-indicator': {
    marginLeft: 0,
  },
} as const;

const UNAVAIL_DIALOG_MAX_WIDTH = 760;
const UNAVAIL_DIALOG_HEIGHT = 760;

const UNAVAIL_FORM_CARD_SX = {
  p: { xs: 1.5, sm: 1.75 },
  borderRadius: 2,
  borderColor: 'divider',
  bgcolor: 'background.paper',
  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
} as const;

function UnavailSectionIcon({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 36,
        height: 36,
        borderRadius: 2,
        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
        color: 'primary.main',
        flexShrink: 0,
      }}
    >
      {children}
    </Box>
  );
}

function UnavailSectionTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 1.5 }}>
      <UnavailSectionIcon>{icon}</UnavailSectionIcon>
      <Typography variant="subtitle1" fontWeight={600} letterSpacing="-0.01em">
        {title}
      </Typography>
    </Stack>
  );
}

function buildWeekFromRemote(remote: WorkingHours[]): Record<number, DayScheduleEdit> {
  const result: Record<number, DayScheduleEdit> = {};
  for (let day = 0; day < 7; day++) {
    const wh = remote.find((w) => w.dayOfWeek === day);
    result[day] = wh
      ? { works: true, startTime: wh.startTime, endTime: wh.endTime }
      : { ...DEFAULT_DAY };
  }
  return result;
}

function isFullDayRange(startAt: string, endAt: string): boolean {
  const start = dayjs(startAt);
  const end = dayjs(endAt);
  return (
    start.isSame(start.startOf('day'), 'minute') &&
    end.isSame(end.endOf('day'), 'minute')
  );
}

function formatUnavailabilityPeriod(startAt: string, endAt: string): string {
  const start = dayjs(startAt);
  const end = dayjs(endAt);
  if (isFullDayRange(startAt, endAt)) {
    if (start.isSame(end, 'day')) {
      return `${start.format('DD/MM/YYYY')} · dia inteiro`;
    }
    return `${start.format('DD/MM/YYYY')} → ${end.format('DD/MM/YYYY')} · dias inteiros`;
  }
  return `${start.format('DD/MM/YYYY HH:mm')} → ${end.format('DD/MM/YYYY HH:mm')}`;
}

export function Availability() {
  const queryClient = useQueryClient();
  const { user: me } = useAuth();
  const { has } = usePermissions();
  const canEditOthers = has('availability:edit');

  const [selectedUserId, setSelectedUserId] = useState<string>(me?.id ?? '');
  const [unavailDialogOpen, setUnavailDialogOpen] = useState(false);

  const { data: users = [] } = useQuery({
    queryKey: ['users', 'appointment-providers'],
    queryFn: () => usersApi.listAppointmentProviders(),
    enabled: canEditOthers,
  });

  const userId = selectedUserId || me?.id || '';

  const { data: workingHours = [] } = useQuery({
    queryKey: ['working-hours', userId],
    queryFn: () => availabilityApi.listWorkingHours(userId),
    enabled: !!userId,
  });

  const { data: unavailability = [] } = useQuery({
    queryKey: ['unavailability', userId],
    queryFn: () => availabilityApi.listUnavailability(userId),
    enabled: !!userId,
  });

  const removeUnavailMutation = useMutation({
    mutationFn: (id: string) => availabilityApi.removeUnavailability(userId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unavailability', userId] });
      queryClient.invalidateQueries({ queryKey: ['unavailability-range'] });
      queryClient.invalidateQueries({ queryKey: ['available-professionals'] });
    },
  });

  const [weekSchedule, setWeekSchedule] = useState<Record<number, DayScheduleEdit>>(() =>
    buildWeekFromRemote([]),
  );

  useEffect(() => {
    setWeekSchedule(buildWeekFromRemote(workingHours));
  }, [workingHours, userId]);

  const saveWeekMutation = useMutation({
    mutationFn: async () => {
      const ops: Promise<unknown>[] = [];
      for (let day = 0; day < 7; day++) {
        const state = weekSchedule[day] ?? DEFAULT_DAY;
        const remote = workingHours.find((w) => w.dayOfWeek === day);
        if (state.works) {
          if (
            !remote ||
            remote.startTime !== state.startTime ||
            remote.endTime !== state.endTime
          ) {
            ops.push(
              availabilityApi.upsertWorkingHours(userId, {
                dayOfWeek: day,
                startTime: state.startTime,
                endTime: state.endTime,
              }),
            );
          }
        } else if (remote) {
          ops.push(availabilityApi.removeWorkingHours(userId, day));
        }
      }
      await Promise.all(ops);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['working-hours', userId] });
    },
  });

  const updateDay = (day: number, patch: Partial<DayScheduleEdit>) => {
    setWeekSchedule((prev) => ({
      ...prev,
      [day]: { ...(prev[day] ?? DEFAULT_DAY), ...patch },
    }));
  };

  const applyPreset = (openDays: number[]) => {
    setWeekSchedule((prev) => {
      const next = { ...prev };
      for (let day = 0; day < 7; day++) {
        const current = next[day] ?? DEFAULT_DAY;
        next[day] = {
          ...current,
          works: openDays.includes(day),
        };
      }
      return next;
    });
  };

  const openDaysCount = useMemo(
    () => WEEK_ORDER.filter((day) => weekSchedule[day]?.works).length,
    [weekSchedule],
  );

  const selectedUser = useMemo(
    () => users.find((u) => u.id === userId) ?? null,
    [users, userId],
  );

  const weekHasInvalidHours = useMemo(
    () =>
      WEEK_ORDER.some((day) => {
        const s = weekSchedule[day];
        return s?.works && s.startTime >= s.endTime;
      }),
    [weekSchedule],
  );

  return (
    <Box>
      <PageHeader
        title="Horários e indisponibilidade"
        subtitle="Defina horário semanal de atendimento e bloqueios pontuais (folga, férias)"
        action={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setUnavailDialogOpen(true)}
          >
            Nova indisponibilidade
          </Button>
        }
      />

      <Card sx={{ mb: 3, p: { xs: 1.5, sm: 2 } }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={2}
          alignItems={{ sm: 'center' }}
          justifyContent="space-between"
        >
          {canEditOthers ? (
            <Autocomplete
              options={users}
              getOptionLabel={(u) => u.name}
              value={selectedUser}
              onChange={(_, val) => setSelectedUserId(val?.id ?? me?.id ?? '')}
              renderInput={(params) => (
                <TextField {...params} label="Profissional" size="small" />
              )}
              sx={{ width: { xs: '100%', sm: 320 } }}
            />
          ) : (
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              Seus horários de atendimento
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
            {openDaysCount} dia{openDaysCount === 1 ? '' : 's'} com atendimento ·{' '}
            {unavailability.length}{' '}
            {unavailability.length === 1 ? 'bloqueio' : 'bloqueios'}
          </Typography>
        </Stack>
      </Card>

      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Card sx={{ p: { xs: 1.5, sm: 2 } }}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ sm: 'center' }}
                spacing={1.5}
                sx={{ mb: 2, px: 0.5 }}
              >
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                  Horário semanal — marque os dias abertos e o expediente
                </Typography>
                <ButtonGroup size="small" variant="outlined">
                  <Button onClick={() => applyPreset([1, 2, 3, 4, 5])}>Seg–Sex</Button>
                  <Button onClick={() => applyPreset([1, 2, 3, 4, 5, 6])}>Seg–Sáb</Button>
                  <Button onClick={() => applyPreset([])}>Nenhum dia</Button>
                </ButtonGroup>
              </Stack>

              <Box
                sx={{
                  display: { xs: 'none', sm: 'grid' },
                  gridTemplateColumns: 'minmax(140px, 1.2fr) 72px 120px 120px',
                  gap: 1,
                  px: 1,
                  pb: 1,
                  color: 'text.secondary',
                  typography: 'caption',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                <span>Dia</span>
                <span>Aberto</span>
                <span>Das</span>
                <span>Até</span>
              </Box>

              <Stack divider={<Divider />} spacing={0}>
                {WEEK_ORDER.map((day) => {
                  const state = weekSchedule[day] ?? DEFAULT_DAY;
                  const invalidHours = state.works && state.startTime >= state.endTime;
                  return (
                    <Box
                      key={day}
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                          xs: '1fr',
                          sm: 'minmax(140px, 1.2fr) 72px 120px 120px',
                        },
                        gap: { xs: 1, sm: 1.5 },
                        alignItems: 'center',
                        py: 1.25,
                        px: 1,
                        bgcolor: state.works ? 'transparent' : 'action.hover',
                        borderRadius: 1,
                      }}
                    >
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography fontWeight={500}>{DAYS[day]}</Typography>
                        {!state.works && (
                          <Chip label="Fechado" size="small" variant="outlined" sx={{ display: { sm: 'none' } }} />
                        )}
                      </Stack>

                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={state.works}
                            onChange={(e) => updateDay(day, { works: e.target.checked })}
                          />
                        }
                        label={state.works ? 'Sim' : 'Não'}
                        sx={{ m: 0 }}
                      />

                      {state.works ? (
                        <>
                          <TextField
                            size="small"
                            type="time"
                            label="Das"
                            value={state.startTime}
                            onChange={(e) => updateDay(day, { startTime: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                            error={invalidHours}
                          />
                          <TextField
                            size="small"
                            type="time"
                            label="Até"
                            value={state.endTime}
                            onChange={(e) => updateDay(day, { endTime: e.target.value })}
                            InputLabelProps={{ shrink: true }}
                            error={invalidHours}
                          />
                        </>
                      ) : (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ gridColumn: { sm: 'span 2' }, display: { xs: 'none', sm: 'block' } }}
                        >
                          Sem atendimento
                        </Typography>
                      )}
                    </Box>
                  );
                })}
              </Stack>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }} sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  disabled={saveWeekMutation.isPending || weekHasInvalidHours}
                  onClick={() => saveWeekMutation.mutate()}
                >
                  {saveWeekMutation.isPending ? 'Salvando...' : 'Salvar horário semanal'}
                </Button>
                <Typography variant="body2" color="text.secondary">
                  {openDaysCount} dia{openDaysCount === 1 ? '' : 's'} com atendimento
                </Typography>
              </Stack>

              {weekHasInvalidHours && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  O horário de início deve ser anterior ao de término em cada dia aberto.
                </Alert>
              )}
              {saveWeekMutation.isError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {(saveWeekMutation.error as any)?.response?.data?.message ??
                    'Erro ao salvar horário semanal'}
                </Alert>
              )}
              <Alert severity="info" sx={{ mt: 2 }}>
                Use os atalhos <strong>Seg–Sex</strong> ou <strong>Seg–Sáb</strong> e ajuste os horários.
                Dias desmarcados ficam fechados para agendamento.
              </Alert>
          </Card>
        </Grid>

        <Grid item xs={12} md={5}>
          <Card sx={{ p: { xs: 1.5, sm: 2 } }}>
              <Typography
                variant="body2"
                color="text.secondary"
                fontWeight={500}
                sx={{ mb: 2, px: 0.5 }}
              >
                Indisponibilidades cadastradas
              </Typography>

              {unavailability.length === 0 ? (
                <Typography variant="body2" color="text.secondary" textAlign="center" py={3}>
                  Nenhuma indisponibilidade cadastrada
                </Typography>
              ) : (
                <List dense disablePadding>
                  {unavailability.map((u) => (
                    <ListItem
                      key={u.id}
                      sx={{ borderBottom: '1px solid', borderColor: 'divider', py: 1 }}
                      secondaryAction={
                        <Tooltip title="Remover">
                          <IconButton
                            size="small"
                            onClick={() => removeUnavailMutation.mutate(u.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      }
                    >
                      <ListItemText
                        primary={
                          <Typography variant="body2" fontWeight={500}>
                            {formatUnavailabilityPeriod(u.startAt, u.endAt)}
                          </Typography>
                        }
                        secondary={u.reason ?? 'Sem motivo informado'}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
          </Card>
        </Grid>
      </Grid>

      <UnavailabilityDialog
        open={unavailDialogOpen}
        onClose={() => setUnavailDialogOpen(false)}
        userId={userId}
        professionalName={canEditOthers ? selectedUser?.name : undefined}
      />
    </Box>
  );
}

function nextWeekdayRange(weekdayStart: number, weekdayEnd: number) {
  const today = dayjs();
  let start = today;
  while (start.day() !== weekdayStart) {
    start = start.add(1, 'day');
  }
  let end = start;
  while (end.day() !== weekdayEnd) {
    end = end.add(1, 'day');
  }
  return { start: start.format('YYYY-MM-DD'), end: end.format('YYYY-MM-DD') };
}

function UnavailabilityDialog({
  open,
  onClose,
  userId,
  professionalName,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
  professionalName?: string;
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const queryClient = useQueryClient();
  const [allDay, setAllDay] = useState(false);
  const [startAt, setStartAt] = useState(dayjs().format('YYYY-MM-DDTHH:mm'));
  const [endAt, setEndAt] = useState(dayjs().add(1, 'hour').format('YYYY-MM-DDTHH:mm'));
  const [startDate, setStartDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!open) return;
    const now = dayjs();
    setAllDay(false);
    setStartAt(now.format('YYYY-MM-DDTHH:mm'));
    setEndAt(now.add(1, 'hour').format('YYYY-MM-DDTHH:mm'));
    setStartDate(now.format('YYYY-MM-DD'));
    setEndDate(now.format('YYYY-MM-DD'));
    setReason('');
  }, [open]);

  const dateRangeInvalid = useMemo(
    () => allDay && !!startDate && !!endDate && dayjs(endDate).isBefore(dayjs(startDate), 'day'),
    [allDay, startDate, endDate],
  );

  const datetimeRangeInvalid = useMemo(
    () =>
      !allDay &&
      !!startAt &&
      !!endAt &&
      (dayjs(endAt).isBefore(dayjs(startAt)) || dayjs(endAt).isSame(dayjs(startAt))),
    [allDay, startAt, endAt],
  );

  const periodPreview = useMemo(() => {
    if (allDay) {
      if (!startDate || !endDate || dateRangeInvalid) return null;
      return formatUnavailabilityPeriod(
        dayjs(startDate).startOf('day').toISOString(),
        dayjs(endDate).endOf('day').toISOString(),
      );
    }
    if (!startAt || !endAt || datetimeRangeInvalid) return null;
    return formatUnavailabilityPeriod(new Date(startAt).toISOString(), new Date(endAt).toISOString());
  }, [allDay, startDate, endDate, startAt, endAt, dateRangeInvalid, datetimeRangeInvalid]);

  const formInvalid = dateRangeInvalid || datetimeRangeInvalid;

  const periodHelperMessage = useMemo(() => {
    if (dateRangeInvalid) {
      return { text: 'A data final deve ser igual ou posterior à inicial', color: 'error.main' as const };
    }
    if (datetimeRangeInvalid) {
      return { text: 'O término deve ser posterior ao início', color: 'error.main' as const };
    }
    if (allDay) {
      return {
        text: 'Use a mesma data nos dois campos para bloquear um único dia',
        color: 'text.secondary' as const,
      };
    }
    return { text: '\u00A0', color: 'text.secondary' as const };
  }, [allDay, dateRangeInvalid, datetimeRangeInvalid]);

  const switchMode = (nextAllDay: boolean) => {
    if (nextAllDay === allDay) return;
    setAllDay(nextAllDay);
    if (nextAllDay) {
      setStartDate(dayjs(startAt).format('YYYY-MM-DD'));
      setEndDate(dayjs(endAt).format('YYYY-MM-DD'));
      return;
    }
    const start = dayjs(startDate).hour(dayjs(startAt).hour()).minute(dayjs(startAt).minute());
    const end = dayjs(endDate).hour(dayjs(endAt).hour()).minute(dayjs(endAt).minute());
    setStartAt(start.format('YYYY-MM-DDTHH:mm'));
    setEndAt(
      end.isAfter(start)
        ? end.format('YYYY-MM-DDTHH:mm')
        : start.add(1, 'hour').format('YYYY-MM-DDTHH:mm'),
    );
  };

  const mutation = useMutation({
    mutationFn: () => {
      const payload = allDay
        ? {
            startAt: dayjs(startDate).startOf('day').toISOString(),
            endAt: dayjs(endDate).endOf('day').toISOString(),
            reason: reason.trim() || undefined,
          }
        : {
            startAt: new Date(startAt).toISOString(),
            endAt: new Date(endAt).toISOString(),
            reason: reason.trim() || undefined,
          };
      return availabilityApi.createUnavailability(userId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unavailability', userId] });
      queryClient.invalidateQueries({ queryKey: ['unavailability-range'] });
      queryClient.invalidateQueries({ queryKey: ['available-professionals'] });
      onClose();
    },
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!formInvalid && !mutation.isPending) {
      mutation.mutate();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          ...dialogPaperSx(isMobile),
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          ...(isMobile
            ? { height: '100%', maxHeight: '100dvh' }
            : {
                maxWidth: UNAVAIL_DIALOG_MAX_WIDTH,
                height: UNAVAIL_DIALOG_HEIGHT,
                maxHeight: '94vh',
                overflow: 'hidden',
              }),
        },
      }}
    >
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minHeight: 0,
          ...(isMobile ? { height: '100%' } : {}),
        }}
      >
        <DialogHeader
          onClose={onClose}
          isMobile={isMobile}
          title="Nova indisponibilidade"
          subtitle={
            professionalName
              ? `Bloqueio na agenda de ${professionalName}`
              : 'Bloqueie horários na agenda'
          }
          icon={<EventBusyOutlinedIcon fontSize="small" />}
        />
        <DialogContent
          dividers
          sx={{
            px: { xs: 2, sm: 3 },
            py: { xs: 2, sm: 2.5 },
            flex: 1,
            minHeight: 0,
            overflow: 'auto',
            bgcolor: (t) => t.palette.background.default,
          }}
        >
          <Stack spacing={2.5}>
            <Paper variant="outlined" sx={UNAVAIL_FORM_CARD_SX}>
              <UnavailSectionTitle icon={<EventOutlinedIcon fontSize="small" />} title="Período" />
              <Stack spacing={1.5}>
                <ToggleButtonGroup
                  exclusive
                  fullWidth
                  size="small"
                  color="primary"
                  value={allDay ? 'allDay' : 'partial'}
                  onChange={(_, val) => {
                    if (val === 'allDay') switchMode(true);
                    if (val === 'partial') switchMode(false);
                  }}
                >
                  <ToggleButton value="partial">Horário específico</ToggleButton>
                  <ToggleButton value="allDay">Dia(s) inteiro(s)</ToggleButton>
                </ToggleButtonGroup>

                <Stack direction="row" flexWrap="wrap" useFlexGap sx={{ gap: 0.75, mx: 0 }}>
                  {(allDay
                    ? [
                        { label: 'Hoje', onClick: () => {
                          const d = dayjs().format('YYYY-MM-DD');
                          setStartDate(d);
                          setEndDate(d);
                        }},
                        { label: 'Amanhã', onClick: () => {
                          const d = dayjs().add(1, 'day').format('YYYY-MM-DD');
                          setStartDate(d);
                          setEndDate(d);
                        }},
                        { label: 'Seg–Sex (próx.)', onClick: () => {
                          const range = nextWeekdayRange(1, 5);
                          setStartDate(range.start);
                          setEndDate(range.end);
                        }},
                      ]
                    : [
                        { label: 'Próxima hora', onClick: () => {
                          const now = dayjs();
                          setStartAt(now.format('YYYY-MM-DDTHH:mm'));
                          setEndAt(now.add(1, 'hour').format('YYYY-MM-DDTHH:mm'));
                        }},
                        { label: 'Manhã (hoje)', onClick: () => {
                          const start = dayjs().hour(8).minute(0).second(0);
                          setStartAt(start.format('YYYY-MM-DDTHH:mm'));
                          setEndAt(start.hour(12).format('YYYY-MM-DDTHH:mm'));
                        }},
                        { label: 'Tarde (hoje)', onClick: () => {
                          const start = dayjs().hour(13).minute(0).second(0);
                          setStartAt(start.format('YYYY-MM-DDTHH:mm'));
                          setEndAt(start.hour(18).format('YYYY-MM-DDTHH:mm'));
                        }},
                      ]
                  ).map((preset) => (
                    <Chip
                      key={preset.label}
                      label={preset.label}
                      size="small"
                      clickable
                      variant="outlined"
                      onClick={preset.onClick}
                    />
                  ))}
                </Stack>

                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={2}
                  sx={{ width: '100%' }}
                >
                  {allDay ? (
                    <>
                      <TextField
                        type="date"
                        label="De"
                        value={startDate}
                        onChange={(e) => {
                          setStartDate(e.target.value);
                          if (dayjs(endDate).isBefore(dayjs(e.target.value), 'day')) {
                            setEndDate(e.target.value);
                          }
                        }}
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                        error={dateRangeInvalid}
                        sx={UNAVAIL_PERIOD_FIELD_SX}
                      />
                      <TextField
                        type="date"
                        label="Até"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                        error={dateRangeInvalid}
                        sx={UNAVAIL_PERIOD_FIELD_SX}
                      />
                    </>
                  ) : (
                    <>
                      <TextField
                        type="datetime-local"
                        label="Início"
                        value={startAt}
                        onChange={(e) => {
                          const newStart = e.target.value;
                          setStartAt(newStart);
                          if (
                            !dayjs(endAt).isAfter(dayjs(newStart)) &&
                            dayjs(newStart).isValid()
                          ) {
                            setEndAt(dayjs(newStart).add(1, 'hour').format('YYYY-MM-DDTHH:mm'));
                          }
                        }}
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                        error={datetimeRangeInvalid}
                        sx={UNAVAIL_DATETIME_FIELD_SX}
                      />
                      <TextField
                        type="datetime-local"
                        label="Término"
                        value={endAt}
                        onChange={(e) => setEndAt(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        fullWidth
                        error={datetimeRangeInvalid}
                        sx={UNAVAIL_DATETIME_FIELD_SX}
                      />
                    </>
                  )}
                </Stack>

                <Typography variant="caption" color={periodHelperMessage.color} sx={{ display: 'block' }}>
                  {periodHelperMessage.text}
                </Typography>

                <Alert
                  severity="info"
                  icon={false}
                  sx={{
                    py: 0.75,
                    visibility: periodPreview ? 'visible' : 'hidden',
                  }}
                >
                  <Typography variant="body2">
                    Será bloqueado: <strong>{periodPreview ?? '—'}</strong>
                  </Typography>
                </Alert>
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={UNAVAIL_FORM_CARD_SX}>
              <UnavailSectionTitle icon={<LabelOutlinedIcon fontSize="small" />} title="Motivo" />
              <Stack spacing={1.5}>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: -0.5 }}>
                  Opcional — ajuda a identificar o bloqueio na agenda
                </Typography>
                <Stack direction="row" flexWrap="wrap" useFlexGap sx={{ gap: 0.75 }}>
                  {UNAVAIL_REASON_SUGGESTIONS.map((suggestion) => (
                    <Chip
                      key={suggestion}
                      label={suggestion}
                      size="small"
                      clickable
                      color={reason === suggestion ? 'primary' : 'default'}
                      variant={reason === suggestion ? 'filled' : 'outlined'}
                      onClick={() => setReason(suggestion)}
                    />
                  ))}
                </Stack>
                <TextField
                  label="Descreva o motivo"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ou digite outro motivo..."
                  fullWidth
                  multiline
                  minRows={2}
                />
              </Stack>
            </Paper>

            {mutation.isError && (
              <Alert severity="error" variant="outlined">
                {(mutation.error as { response?: { data?: { message?: string } } })?.response?.data
                  ?.message ?? 'Erro ao salvar'}
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ ...dialogActionsBorderSx, flexShrink: 0 }}>
          <Button onClick={onClose} type="button" disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button variant="contained" type="submit" disabled={mutation.isPending || formInvalid}>
            {mutation.isPending ? 'Salvando…' : 'Criar bloqueio'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

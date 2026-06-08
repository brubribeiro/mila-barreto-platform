import { useEffect, useMemo, useState } from 'react';
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
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EventBusyOutlinedIcon from '@mui/icons-material/EventBusyOutlined';
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

/** Ordem usual no Brasil: segunda → domingo */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

type DayScheduleEdit = {
  works: boolean;
  startTime: string;
  endTime: string;
};

const DEFAULT_DAY: DayScheduleEdit = { works: false, startTime: '08:00', endTime: '18:00' };

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

  // Lista de usuários para o dropdown (apenas se pode editar outros)
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
      />
    </Box>
  );
}

function UnavailabilityDialog({
  open,
  onClose,
  userId,
}: {
  open: boolean;
  onClose: () => void;
  userId: string;
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

  const mutation = useMutation({
    mutationFn: () => {
      const payload = allDay
        ? {
            startAt: dayjs(startDate).startOf('day').toISOString(),
            endAt: dayjs(endDate).endOf('day').toISOString(),
            reason: reason || undefined,
          }
        : {
            startAt: new Date(startAt).toISOString(),
            endAt: new Date(endAt).toISOString(),
            reason: reason || undefined,
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

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{ sx: dialogPaperSx(isMobile) }}
    >
      <DialogHeader
        onClose={onClose}
        isMobile={isMobile}
        title="Nova indisponibilidade"
        subtitle="Bloqueie horários na agenda"
        icon={<EventBusyOutlinedIcon fontSize="small" />}
      />
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={allDay}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setAllDay(checked);
                  if (checked) {
                    const start = dayjs(startAt);
                    setStartDate(start.format('YYYY-MM-DD'));
                    setEndDate(dayjs(endAt).format('YYYY-MM-DD'));
                  } else {
                    const start = dayjs(startDate).hour(9).minute(0);
                    setStartAt(start.format('YYYY-MM-DDTHH:mm'));
                    setEndAt(start.add(1, 'hour').format('YYYY-MM-DDTHH:mm'));
                  }
                }}
              />
            }
            label="Dia inteiro"
          />

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
              />
              <TextField
                type="date"
                label="Até"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
                error={dateRangeInvalid}
                helperText={
                  dateRangeInvalid
                    ? 'A data final deve ser igual ou posterior à inicial'
                    : 'Use a mesma data para bloquear um único dia'
                }
              />
            </>
          ) : (
            <>
              <TextField
                type="datetime-local"
                label="Início"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                type="datetime-local"
                label="Término"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </>
          )}

          <TextField
            label="Motivo (opcional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Férias, folga, compromisso..."
            fullWidth
          />
          {mutation.isError && (
            <Alert severity="error">
              {(mutation.error as any)?.response?.data?.message ?? 'Erro ao salvar'}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          disabled={mutation.isPending || dateRangeInvalid}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? 'Salvando...' : 'Salvar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

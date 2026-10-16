import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  CircularProgress,
  IconButton,
  MenuItem,
  Skeleton,
  Stack,
  Switch,
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
import EditIcon from '@mui/icons-material/Edit';
import EventBusyOutlinedIcon from '@mui/icons-material/EventBusyOutlined';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs, { type Dayjs } from 'dayjs';
import 'dayjs/locale/pt-br';

import { AuroraIcon } from '../components/AuroraIcon';
import { DialogHeader, dialogActionsBorderSx, dialogPaperSx } from '../components/DialogCloseButton';
import { LabeledField } from '../components/LabeledField';
import { availabilityApi } from '../api/availability';
import { usersApi } from '../api/users';
import { useAuth } from '../contexts/AuthContext';
import { useAppToast } from '../contexts/AppToastContext';
import { getApiErrorMessage } from '../utils/apiError';
import { usePermissions } from '../contexts/usePermissions';
import { fontSizes } from '../theme/fontSizes';
import type { Unavailability, WorkingHours } from '../types';

const DAYS = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
];

const DAY_ABBR = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

type DayScheduleEdit = {
  works: boolean;
  startTime: string;
  endTime: string;
};

type Professional = { id: string; name: string };

const DEFAULT_DAY: DayScheduleEdit = { works: false, startTime: '08:00', endTime: '18:00' };

const UNAVAIL_REASON_SUGGESTIONS = [
  'Férias',
  'Folga',
  'Compromisso pessoal',
  'Consulta médica',
  'Capacitação',
] as const;

const WEEK_PRESETS = [
  { label: 'Seg–Sex', days: [1, 2, 3, 4, 5] },
  { label: 'Seg–Sáb', days: [1, 2, 3, 4, 5, 6] },
  { label: 'Nenhum dia', days: [] },
];

const PROFESSIONAL_COLORS = ['#15998B', '#5BA8DE', '#9B7BD4', '#E0915B', '#D46B8A', '#4FB3A8'];

const UNAVAIL_DATETIME_FIELD_SX = {
  '& .MuiInputBase-input': {
    textAlign: 'left',
  },
  '& input[type="datetime-local"]::-webkit-datetime-edit': {
    textAlign: 'left',
  },
  '& input[type="datetime-local"]::-webkit-calendar-picker-indicator': {
    marginLeft: 0,
  },
} as const;

const DIALOG_MAX_WIDTH = 640;

const CARD_HEADER_SX = {
  px: { xs: 2, sm: 2.75 },
  py: 2.25,
  minHeight: 73,
  display: 'flex',
  alignItems: 'center',
  borderBottom: 1,
  borderColor: 'divider',
} as const;

const CARD_ROW_SX = {
  px: { xs: 2, sm: 2.75 },
  borderBottom: 1,
  borderColor: 'grey.100',
  '&:last-of-type': { borderBottom: 0 },
} as const;

const SMALL_CHIP_SX = { height: 21, fontSize: fontSizes['2xs'], fontWeight: 700 } as const;

const ROW_ACTION_SX = {
  width: 30,
  height: 30,
  flexShrink: 0,
  borderRadius: '9px',
  border: 1,
  borderColor: 'divider',
  color: 'text.secondary',
} as const;

const EMPTY_HOURS: WorkingHours[] = [];

function CardTitle({ title }: { title: string }) {
  return (
    <Typography component="h3" sx={{ fontSize: fontSizes.xl, fontWeight: 700, lineHeight: 1.3 }}>
      {title}
    </Typography>
  );
}

function PeriodNotice({ tone, visible, children }: { tone: 'primary' | 'error'; visible: boolean; children: ReactNode }) {
  const Icon = tone === 'error' ? ReportProblemOutlinedIcon : EventAvailableOutlinedIcon;
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1.375}
      sx={{
        px: 1.875,
        py: 1.625,
        borderRadius: '12px',
        border: 1,
        bgcolor: (t) => alpha(t.palette[tone].main, 0.08),
        borderColor: (t) => alpha(t.palette[tone].main, 0.2),
        visibility: visible ? 'visible' : 'hidden',
      }}
    >
      <Icon sx={{ fontSize: 18, color: `${tone}.main`, flexShrink: 0 }} />
      <Typography sx={{ fontSize: fontSizes.sm, color: 'text.secondary', fontWeight: 500, lineHeight: 1.4 }}>
        {children}
      </Typography>
    </Stack>
  );
}

function initialsOf(name: string): string {
  // Ignora títulos como "Dra." / "Enf." ao montar as iniciais.
  const words = name.split(/\s+/).filter((w) => w && !w.endsWith('.'));
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
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

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
}

/** Resumo dos dias abertos (ex.: "Seg – Sex", "Seg, Qua, Sex"). */
function summarizeDays(hours: WorkingHours[]): string {
  const open = WEEK_ORDER.filter((d) => hours.some((h) => h.dayOfWeek === d));
  if (open.length === 0) return 'Sem horário definido';
  const idx = open.map((d) => WEEK_ORDER.indexOf(d));
  const contiguous = idx.every((v, i) => i === 0 || v === idx[i - 1] + 1);
  if (contiguous && open.length >= 3) {
    return `${DAY_ABBR[open[0]]} – ${DAY_ABBR[open[open.length - 1]]}`;
  }
  return open.map((d) => DAY_ABBR[d]).join(', ');
}

/** Faixa de horário da semana e uma nota (carga semanal ou "varia por dia"). */
function summarizeHours(hours: WorkingHours[]): { range: string; note: string } | null {
  if (hours.length === 0) return null;
  const starts = hours.map((h) => h.startTime).sort();
  const ends = hours.map((h) => h.endTime).sort();
  const uniform = starts[0] === starts[starts.length - 1] && ends[0] === ends[ends.length - 1];
  const weekly = hours.reduce((sum, h) => sum + toMinutes(h.endTime) - toMinutes(h.startTime), 0);
  return {
    range: `${starts[0]} – ${ends[ends.length - 1]}`,
    note: uniform ? `${formatMinutes(weekly)} por semana` : 'varia por dia',
  };
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

/** Formato curto da lista de bloqueios (ex.: "25 – 27 jun", "19 jun · 12:00 – 14:00"). */
function formatBlockPeriod(startAt: string, endAt: string): string {
  const start = dayjs(startAt).locale('pt-br');
  const end = dayjs(endAt).locale('pt-br');
  const day = (d: Dayjs) => d.format(d.isSame(dayjs(), 'year') ? 'D MMM' : 'D MMM YYYY');
  if (isFullDayRange(startAt, endAt)) {
    if (start.isSame(end, 'day')) return day(start);
    if (start.isSame(end, 'month')) return `${start.format('D')} – ${day(end)}`;
    return `${day(start)} – ${day(end)}`;
  }
  if (start.isSame(end, 'day')) {
    return `${day(start)} · ${start.format('HH:mm')} – ${end.format('HH:mm')}`;
  }
  return `${day(start)} ${start.format('HH:mm')} – ${day(end)} ${end.format('HH:mm')}`;
}

export function Availability() {
  const queryClient = useQueryClient();
  const toast = useAppToast();
  const { user: me } = useAuth();
  const { has } = usePermissions();
  const canEditOthers = has('availability:edit');

  const [editing, setEditing] = useState<Professional | null>(null);
  const [unavailDialogOpen, setUnavailDialogOpen] = useState(false);

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['users', 'appointment-providers'],
    queryFn: () => usersApi.listAppointmentProviders(),
    enabled: canEditOthers,
  });

  // Quem pode editar outros vê toda a equipe; os demais só a própria agenda.
  const professionals = useMemo<Professional[]>(() => {
    const list: Professional[] = canEditOthers ? users.map((u) => ({ id: u.id, name: u.name })) : [];
    if (me && !list.some((p) => p.id === me.id)) list.unshift({ id: me.id, name: me.name });
    return list;
  }, [canEditOthers, users, me]);

  const colorOf = useMemo(() => {
    const map = new Map(professionals.map((p, i) => [p.id, PROFESSIONAL_COLORS[i % PROFESSIONAL_COLORS.length]]));
    return (id: string) => map.get(id) ?? PROFESSIONAL_COLORS[0];
  }, [professionals]);

  const hoursQueries = useQueries({
    queries: professionals.map((p) => ({
      queryKey: ['working-hours', p.id],
      queryFn: () => availabilityApi.listWorkingHours(p.id),
    })),
  });

  const unavailQueries = useQueries({
    queries: professionals.map((p) => ({
      queryKey: ['unavailability', p.id],
      queryFn: () => availabilityApi.listUnavailability(p.id),
    })),
  });

  const unavailLoading = (canEditOthers && usersLoading) || unavailQueries.some((q) => q.isLoading);

  const blocks = useMemo(
    () =>
      professionals
        .flatMap((p, i) =>
          (unavailQueries[i]?.data ?? []).map((u: Unavailability) => ({ ...u, professional: p })),
        )
        .sort((a, b) => a.startAt.localeCompare(b.startAt)),
    [professionals, unavailQueries],
  );

  const removeUnavailMutation = useMutation({
    mutationFn: ({ userId, id }: { userId: string; id: string }) =>
      availabilityApi.removeUnavailability(userId, id),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['unavailability', userId] });
      queryClient.invalidateQueries({ queryKey: ['unavailability-range'] });
      queryClient.invalidateQueries({ queryKey: ['available-professionals'] });
      toast.success('Indisponibilidade removida.');
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Não foi possível remover a indisponibilidade.'));
    },
  });

  return (
    <Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1.25fr 1fr' },
          gap: 2.25,
          alignItems: 'start',
        }}
      >
        {/* Disponibilidade da equipe */}
        <Card sx={{ overflow: 'hidden' }}>
          <Box sx={CARD_HEADER_SX}>
            <CardTitle title={canEditOthers ? 'Disponibilidade da equipe' : 'Minha disponibilidade'} />
          </Box>

          {canEditOthers && usersLoading ? (
            <Stack spacing={1} sx={{ p: 2 }}>
              {[1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={48} />)}
            </Stack>
          ) : (
            professionals.map((p, i) => {
              const query = hoursQueries[i];
              const hours = query?.data ?? EMPTY_HOURS;
              const summary = summarizeHours(hours);
              return (
                <Stack
                  key={p.id}
                  direction="row"
                  alignItems="center"
                  spacing={1.75}
                  sx={{ ...CARD_ROW_SX, py: 1.875 }}
                >
                  <Box
                    sx={{
                      width: 42,
                      height: 42,
                      borderRadius: '12px',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: fontSizes.sm,
                      fontWeight: 700,
                      color: '#fff',
                      bgcolor: colorOf(p.id),
                    }}
                  >
                    {initialsOf(p.name)}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0, lineHeight: 1.3 }}>
                    <Typography noWrap sx={{ fontSize: fontSizes.md, fontWeight: 700, lineHeight: 'inherit' }}>
                      {p.name}
                    </Typography>
                    <Typography noWrap sx={{ fontSize: fontSizes.xs, color: 'text.secondary', lineHeight: 'inherit' }}>
                      {query?.isLoading ? <Skeleton width={90} /> : summarizeDays(hours)}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right', lineHeight: 1.3, flexShrink: 0 }}>
                    {query?.isLoading ? (
                      <Skeleton width={90} />
                    ) : summary ? (
                      <>
                        <Typography sx={{ fontSize: fontSizes.sm, fontWeight: 700, lineHeight: 'inherit' }}>
                          {summary.range}
                        </Typography>
                        <Typography sx={{ fontSize: fontSizes.xs, color: 'text.secondary', lineHeight: 'inherit' }}>
                          {summary.note}
                        </Typography>
                      </>
                    ) : (
                      <Typography sx={{ fontSize: fontSizes.sm, fontWeight: 600, color: 'text.disabled' }}>
                        —
                      </Typography>
                    )}
                  </Box>
                  <Tooltip title="Editar horários">
                    <IconButton onClick={() => setEditing(p)} sx={ROW_ACTION_SX} aria-label={`Editar horários de ${p.name}`}>
                      <EditIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </Stack>
              );
            })
          )}
        </Card>

        {/* Bloqueios de agenda */}
        <Card sx={{ overflow: 'hidden' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.5} sx={CARD_HEADER_SX}>
            <CardTitle title="Bloqueios de agenda" />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setUnavailDialogOpen(true)}
              sx={{
                flexShrink: 0,
                minHeight: 36,
                height: 36,
                px: 1.75,
                borderRadius: '10px',
                fontSize: fontSizes.sm,
                fontWeight: 700,
              }}
            >
              Bloquear
            </Button>
          </Stack>

          {unavailLoading ? (
            <Stack spacing={1} sx={{ p: 2 }}>
              {[1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={48} />)}
            </Stack>
          ) : blocks.length === 0 ? (
            <Box sx={{ px: 3, py: 5, textAlign: 'center' }}>
              <EventBusyOutlinedIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
              <Typography sx={{ fontWeight: 700, fontSize: fontSizes.md }}>Nenhum bloqueio cadastrado</Typography>
              <Typography sx={{ fontSize: fontSizes.sm, color: 'text.secondary', mt: 0.5 }}>
                Registre folgas, férias e compromissos para fechar a agenda.
              </Typography>
            </Box>
          ) : (
            blocks.map((b) => {
              const fullDay = isFullDayRange(b.startAt, b.endAt);
              return (
                <Stack
                  key={b.id}
                  direction="row"
                  alignItems="center"
                  spacing={1.625}
                  sx={{ ...CARD_ROW_SX, py: 1.75 }}
                >
                  <Box
                    sx={{
                      width: 3,
                      height: 38,
                      borderRadius: '3px',
                      flexShrink: 0,
                      bgcolor: colorOf(b.professional.id),
                    }}
                  />
                  <Box sx={{ flex: 1, minWidth: 0, lineHeight: 1.3 }}>
                    <Typography noWrap sx={{ fontSize: fontSizes.md, fontWeight: 700, lineHeight: 'inherit' }}>
                      {b.reason || 'Sem motivo informado'}
                    </Typography>
                    <Typography noWrap sx={{ fontSize: fontSizes.xs, color: 'text.secondary', lineHeight: 'inherit' }}>
                      {b.professional.name} · {formatBlockPeriod(b.startAt, b.endAt)}
                    </Typography>
                  </Box>
                  <Chip
                    size="small"
                    label={fullDay ? 'Dia inteiro' : 'Por horário'}
                    sx={
                      fullDay
                        ? { ...SMALL_CHIP_SX, bgcolor: alpha('#5BA8DE', 0.16), color: '#2F6FA0' }
                        : { ...SMALL_CHIP_SX, bgcolor: 'grey.100', color: 'text.secondary' }
                    }
                  />
                  <Tooltip title="Remover">
                    <IconButton
                      onClick={() => removeUnavailMutation.mutate({ userId: b.professional.id, id: b.id })}
                      sx={{ ...ROW_ACTION_SX, '&:hover': { color: 'error.main', borderColor: 'error.light' } }}
                      aria-label="Remover bloqueio"
                    >
                      <DeleteIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </Stack>
              );
            })
          )}
        </Card>
      </Box>

      <WorkingHoursDialog professional={editing} onClose={() => setEditing(null)} />

      <UnavailabilityDialog
        open={unavailDialogOpen}
        onClose={() => setUnavailDialogOpen(false)}
        professionals={professionals}
        defaultUserId={me?.id ?? professionals[0]?.id ?? ''}
        canChooseProfessional={canEditOthers}
      />
    </Box>
  );
}

function WorkingHoursDialog({
  professional,
  onClose,
}: {
  professional: Professional | null;
  onClose: () => void;
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const queryClient = useQueryClient();
  const toast = useAppToast();
  const open = !!professional;
  const userId = professional?.id ?? '';

  const { data: workingHours, isLoading: hoursLoading } = useQuery({
    queryKey: ['working-hours', userId],
    queryFn: () => availabilityApi.listWorkingHours(userId),
    enabled: !!userId,
  });

  const [weekSchedule, setWeekSchedule] = useState<Record<number, DayScheduleEdit>>(() =>
    buildWeekFromRemote([]),
  );

  useEffect(() => {
    if (open) setWeekSchedule(buildWeekFromRemote(workingHours ?? EMPTY_HOURS));
  }, [open, workingHours]);

  const saveWeekMutation = useMutation({
    mutationFn: async () => {
      const remoteHours = workingHours ?? EMPTY_HOURS;
      const ops: Promise<unknown>[] = [];
      for (let day = 0; day < 7; day++) {
        const state = weekSchedule[day] ?? DEFAULT_DAY;
        const remote = remoteHours.find((w) => w.dayOfWeek === day);
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
      toast.success('Horários salvos.');
      onClose();
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Não foi possível salvar os horários.'));
    },
  });

  useEffect(() => {
    if (open) saveWeekMutation.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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

  const openDaysCount = WEEK_ORDER.filter((day) => weekSchedule[day]?.works).length;

  const weekHasInvalidHours = WEEK_ORDER.some((day) => {
    const s = weekSchedule[day];
    return s?.works && s.startTime >= s.endTime;
  });

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
            : { maxWidth: DIALOG_MAX_WIDTH, maxHeight: '94dvh' }),
        },
      }}
    >
      <DialogHeader
        onClose={onClose}
        isMobile={isMobile}
        title="Horário semanal"
        subtitle={professional ? `Expediente de ${professional.name}` : undefined}
        icon={<AuroraIcon name="clock" size={20} />}
      />
      <DialogContent
        sx={{
          px: { xs: 2, sm: 3 },
          pb: { xs: 2, sm: 2.5 },
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          bgcolor: 'background.paper',
          '&.MuiDialogContent-root': { pt: { xs: 2.75, sm: 3 } },
        }}
      >
        <Stack spacing={2}>
          <LabeledField label="Atalhos">
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
              {WEEK_PRESETS.map((preset) => (
                <Chip
                  key={preset.label}
                  label={preset.label}
                  size="small"
                  variant="outlined"
                  clickable
                  onClick={() => applyPreset(preset.days)}
                  sx={{ fontWeight: 600 }}
                />
              ))}
            </Stack>
          </LabeledField>

          <Box
            sx={{
              position: 'relative',
              border: 1,
              borderColor: 'divider',
              borderRadius: '14px',
              overflow: 'hidden',
            }}
          >
            {hoursLoading && (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: (t) => alpha(t.palette.background.paper, 0.7),
                  zIndex: 5,
                }}
              >
                <CircularProgress size={32} />
              </Box>
            )}
            {WEEK_ORDER.map((day) => {
              const state = weekSchedule[day] ?? DEFAULT_DAY;
              const invalidHours = state.works && state.startTime >= state.endTime;
              return (
                <Stack
                  key={day}
                  direction="row"
                  alignItems="center"
                  flexWrap={{ xs: 'wrap', sm: 'nowrap' }}
                  useFlexGap
                  sx={{
                    ...CARD_ROW_SX,
                    px: { xs: 1.5, sm: 2 },
                    py: 1.25,
                    columnGap: 1.5,
                    rowGap: 1,
                    bgcolor: state.works ? 'transparent' : 'grey.50',
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 72, lineHeight: 1.3 }}>
                    <Typography
                      sx={{
                        fontSize: fontSizes.md,
                        fontWeight: 700,
                        lineHeight: 'inherit',
                        color: state.works ? 'text.primary' : 'text.secondary',
                      }}
                    >
                      {DAYS[day]}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: fontSizes.xs,
                        lineHeight: 'inherit',
                        color: invalidHours ? 'error.main' : 'text.secondary',
                      }}
                    >
                      {!state.works
                        ? 'Sem atendimento'
                        : invalidHours
                          ? 'Início deve ser antes do término'
                          : `${formatMinutes(toMinutes(state.endTime) - toMinutes(state.startTime))} de atendimento`}
                    </Typography>
                  </Box>
                  <Switch
                    size="small"
                    checked={state.works}
                    onChange={(e) => updateDay(day, { works: e.target.checked })}
                    inputProps={{ 'aria-label': `Atende ${DAYS[day].toLowerCase()}` }}
                  />
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={0.75}
                    sx={{ width: { xs: '100%', sm: 'auto' }, flex: { sm: '0 1 272px' }, minWidth: { sm: 210 } }}
                  >
                    {state.works ? (
                      <>
                        <TextField
                          type="time"
                          value={state.startTime}
                          onChange={(e) => updateDay(day, { startTime: e.target.value })}
                          inputProps={{ 'aria-label': `${DAYS[day]} das` }}
                          error={invalidHours}
                          fullWidth
                        />
                        <Typography sx={{ fontSize: fontSizes.sm, color: 'text.disabled' }}>–</Typography>
                        <TextField
                          type="time"
                          value={state.endTime}
                          onChange={(e) => updateDay(day, { endTime: e.target.value })}
                          inputProps={{ 'aria-label': `${DAYS[day]} até` }}
                          error={invalidHours}
                          fullWidth
                        />
                      </>
                    ) : (
                      <Typography
                        sx={{
                          display: { xs: 'none', sm: 'block' },
                          width: '100%',
                          textAlign: 'center',
                          fontSize: fontSizes.sm,
                          fontWeight: 600,
                          color: 'text.disabled',
                        }}
                      >
                        Fechado
                      </Typography>
                    )}
                  </Stack>
                </Stack>
              );
            })}
          </Box>

          <Typography sx={{ fontSize: fontSizes.xs, color: 'text.secondary' }}>
            {openDaysCount} {openDaysCount === 1 ? 'dia' : 'dias'} com atendimento · dias desligados ficam
            fechados para agendamento.
          </Typography>

          {weekHasInvalidHours && (
            <Alert severity="warning">
              O horário de início deve ser anterior ao de término em cada dia aberto.
            </Alert>
          )}
          {saveWeekMutation.isError && (
            <Alert severity="error" variant="outlined">
              {(saveWeekMutation.error as { response?: { data?: { message?: string } } })?.response?.data
                ?.message ?? 'Erro ao salvar horário semanal'}
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ ...dialogActionsBorderSx, flexShrink: 0 }}>
        <Button onClick={onClose} type="button" disabled={saveWeekMutation.isPending}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          disabled={saveWeekMutation.isPending || weekHasInvalidHours || hoursLoading}
          onClick={() => saveWeekMutation.mutate()}
        >
          {saveWeekMutation.isPending ? 'Salvando...' : 'Salvar horário semanal'}
        </Button>
      </DialogActions>
    </Dialog>
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
  professionals,
  defaultUserId,
  canChooseProfessional,
}: {
  open: boolean;
  onClose: () => void;
  professionals: Professional[];
  defaultUserId: string;
  canChooseProfessional: boolean;
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const queryClient = useQueryClient();
  const toast = useAppToast();
  const [allDay, setAllDay] = useState(false);
  const [startAt, setStartAt] = useState(dayjs().format('YYYY-MM-DDTHH:mm'));
  const [endAt, setEndAt] = useState(dayjs().add(1, 'hour').format('YYYY-MM-DDTHH:mm'));
  const [startDate, setStartDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [reason, setReason] = useState('');
  const [userId, setUserId] = useState(defaultUserId);
  const professionalName = professionals.find((p) => p.id === userId)?.name;

  useEffect(() => {
    if (!open) return;
    const now = dayjs();
    setUserId(defaultUserId);
    setAllDay(false);
    setStartAt(now.format('YYYY-MM-DDTHH:mm'));
    setEndAt(now.add(1, 'hour').format('YYYY-MM-DDTHH:mm'));
    setStartDate(now.format('YYYY-MM-DD'));
    setEndDate(now.format('YYYY-MM-DD'));
    setReason('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const periodError = dateRangeInvalid
    ? 'A data final deve ser igual ou posterior à inicial'
    : datetimeRangeInvalid
      ? 'O término deve ser posterior ao início'
      : null;

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
      toast.success('Indisponibilidade registrada.');
      onClose();
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Não foi possível registrar a indisponibilidade.'));
    },
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!formInvalid && !!userId && !mutation.isPending) {
      mutation.mutate();
    }
  };

  const presets = allDay
    ? [
        {
          label: 'Hoje',
          onClick: () => {
            const d = dayjs().format('YYYY-MM-DD');
            setStartDate(d);
            setEndDate(d);
          },
        },
        {
          label: 'Amanhã',
          onClick: () => {
            const d = dayjs().add(1, 'day').format('YYYY-MM-DD');
            setStartDate(d);
            setEndDate(d);
          },
        },
        {
          label: 'Seg–Sex (próx.)',
          onClick: () => {
            const range = nextWeekdayRange(1, 5);
            setStartDate(range.start);
            setEndDate(range.end);
          },
        },
      ]
    : [
        {
          label: 'Próxima hora',
          onClick: () => {
            const now = dayjs();
            setStartAt(now.format('YYYY-MM-DDTHH:mm'));
            setEndAt(now.add(1, 'hour').format('YYYY-MM-DDTHH:mm'));
          },
        },
        {
          label: 'Manhã (hoje)',
          onClick: () => {
            const start = dayjs().hour(8).minute(0).second(0);
            setStartAt(start.format('YYYY-MM-DDTHH:mm'));
            setEndAt(start.hour(12).format('YYYY-MM-DDTHH:mm'));
          },
        },
        {
          label: 'Tarde (hoje)',
          onClick: () => {
            const start = dayjs().hour(13).minute(0).second(0);
            setStartAt(start.format('YYYY-MM-DDTHH:mm'));
            setEndAt(start.hour(18).format('YYYY-MM-DDTHH:mm'));
          },
        },
      ];

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
            : { maxWidth: DIALOG_MAX_WIDTH, maxHeight: '94dvh' }),
        },
      }}
    >
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
      >
        <DialogHeader
          onClose={onClose}
          isMobile={isMobile}
          title="Novo bloqueio"
          subtitle={
            professionalName
              ? `Bloqueio na agenda de ${professionalName}`
              : 'Bloqueie horários na agenda'
          }
          icon={<EventBusyOutlinedIcon fontSize="small" />}
        />
        <DialogContent
          sx={{
            px: { xs: 2, sm: 3 },
            pb: { xs: 2, sm: 2.5 },
            flex: 1,
            minHeight: 0,
            overflow: 'auto',
            bgcolor: 'background.paper',
            // MUI zera o padding-top quando o content segue o DialogTitle; força o espaçamento
            '&.MuiDialogContent-root': { pt: { xs: 2.75, sm: 3 } },
          }}
        >
          <Stack spacing={2}>
            {canChooseProfessional && professionals.length > 1 && (
              <LabeledField label="Profissional">
                <TextField
                  select
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  inputProps={{ 'aria-label': 'Profissional' }}
                  fullWidth
                >
                  {professionals.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.name}
                    </MenuItem>
                  ))}
                </TextField>
              </LabeledField>
            )}

            <LabeledField label="Motivo">
              <Stack spacing={1}>
                <TextField
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ex.: Congresso, férias, almoço estendido..."
                  inputProps={{ 'aria-label': 'Motivo' }}
                  fullWidth
                />
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
                      sx={{ fontWeight: 600 }}
                    />
                  ))}
                </Stack>
              </Stack>
            </LabeledField>

            <LabeledField label="Período">
              <Stack spacing={1}>
                <ToggleButtonGroup
                  exclusive
                  fullWidth
                  color="primary"
                  value={allDay ? 'allDay' : 'partial'}
                  onChange={(_, val) => {
                    if (val === 'allDay') switchMode(true);
                    if (val === 'partial') switchMode(false);
                  }}
                  sx={{ '& .MuiToggleButton-root': { textTransform: 'none', fontWeight: 700, py: 1.1 } }}
                >
                  <ToggleButton value="partial">Horário específico</ToggleButton>
                  <ToggleButton value="allDay">Dia(s) inteiro(s)</ToggleButton>
                </ToggleButtonGroup>
                <Stack direction="row" flexWrap="wrap" useFlexGap sx={{ gap: 0.75 }}>
                  {presets.map((preset) => (
                    <Chip
                      key={preset.label}
                      label={preset.label}
                      size="small"
                      clickable
                      variant="outlined"
                      onClick={preset.onClick}
                      sx={{ fontWeight: 600 }}
                    />
                  ))}
                </Stack>
              </Stack>
            </LabeledField>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.75 }}>
              {allDay ? (
                <>
                  <LabeledField label="Início">
                    <TextField
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        if (dayjs(endDate).isBefore(dayjs(e.target.value), 'day')) {
                          setEndDate(e.target.value);
                        }
                      }}
                      inputProps={{ 'aria-label': 'Início' }}
                      fullWidth
                      error={dateRangeInvalid}
                    />
                  </LabeledField>
                  <LabeledField label="Fim">
                    <TextField
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      inputProps={{ 'aria-label': 'Fim' }}
                      fullWidth
                      error={dateRangeInvalid}
                    />
                  </LabeledField>
                </>
              ) : (
                <>
                  <LabeledField label="Início">
                    <TextField
                      type="datetime-local"
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
                      inputProps={{ 'aria-label': 'Início' }}
                      fullWidth
                      error={datetimeRangeInvalid}
                      sx={UNAVAIL_DATETIME_FIELD_SX}
                    />
                  </LabeledField>
                  <LabeledField label="Fim">
                    <TextField
                      type="datetime-local"
                      value={endAt}
                      onChange={(e) => setEndAt(e.target.value)}
                      inputProps={{ 'aria-label': 'Fim' }}
                      fullWidth
                      error={datetimeRangeInvalid}
                      sx={UNAVAIL_DATETIME_FIELD_SX}
                    />
                  </LabeledField>
                </>
              )}
            </Box>

            <Typography sx={{ fontSize: fontSizes.xs, color: 'text.secondary', mt: '6px !important' }}>
              {allDay ? 'Use a mesma data nos dois campos para bloquear um único dia' : ' '}
            </Typography>

            {periodError ? (
              <PeriodNotice tone="error" visible>
                {periodError}
              </PeriodNotice>
            ) : (
              <PeriodNotice tone="primary" visible={!!periodPreview}>
                Será bloqueado:{' '}
                <Box component="strong" sx={{ color: 'text.primary' }}>
                  {periodPreview ?? '—'}
                </Box>
              </PeriodNotice>
            )}

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

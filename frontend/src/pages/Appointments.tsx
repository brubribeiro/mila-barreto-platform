import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { Box, Button, Card, Checkbox, Collapse, FormControl, IconButton, InputLabel, ListItemText, MenuItem, OutlinedInput, Select, Skeleton, Stack, Typography, lighten, useMediaQuery, useTheme } from '@mui/material';
import { AuroraIcon } from '../components/AuroraIcon';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import type { EventInput, DatesSetArg, DateSelectArg, EventClickArg, DateClickArg } from '@fullcalendar/core';
import { useQueries, useQuery } from '@tanstack/react-query';

import { PageHeader } from '../components/PageHeader';
import { useUrlState, urlDate, urlEnum, urlList } from '../hooks/useUrlState';
import { appointmentsApi } from '../api/appointments';
import { availabilityApi } from '../api/availability';
import { usersApi } from '../api/users';
import { AppointmentFormDialog } from '../components/appointments/AppointmentFormDialog';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../contexts/usePermissions';
import type { Appointment, AppointmentStatus, UnavailabilityCalendarItem } from '../types';
import { buildBrazilCaieirasHolidayEvents } from '../utils/brazilCaieirasHolidays';
import {
  buildUnavailabilityCalendarEvents,
  filterUnavailabilityInRange,
  slotOverlapsUnavailability,
} from '../utils/unavailabilityCalendar';
import { slotOverlapsProfessionalAppointment } from '../utils/appointmentScheduling';
import { fontSizes } from '../theme/fontSizes';

const statusColors: Record<AppointmentStatus, { bg: string; border: string; text: string }> = {
  SCHEDULED: { bg: '#B8E5E2', border: '#0ABAB5', text: '#07807C' },
  CONFIRMED: { bg: '#0ABAB5', border: '#07807C', text: '#FFFFFF' },
  IN_PROGRESS: { bg: '#F9A825', border: '#F57F17', text: '#FFFFFF' },
  COMPLETED: { bg: '#8FBFA8', border: '#5A9A7D', text: '#FFFFFF' },
  CANCELLED: { bg: '#EDEDEB', border: '#A8A6A2', text: '#6E6B66' },
  NO_SHOW: { bg: '#D58A81', border: '#8A3F33', text: '#FFFFFF' },
};

// No tema escuro, eventos em tom pastel (feriados, bloqueios) viram uma tinta da cor da borda com texto claro.
function toDarkEvent(e: EventInput): EventInput {
  const c = e.borderColor as string;
  return { ...e, backgroundColor: `${c}33`, textColor: lighten(c, 0.6) };
}

const kindLabel: Record<string, string> = {
  EVALUATION: 'AVAL',
  PROCEDURE: 'PROC',
  RETURN: 'RET',
};

const statusLabel: Record<string, string> = {
  SCHEDULED: 'Agendado',
  CONFIRMED: 'Confirmado',
  IN_PROGRESS: 'Em andamento',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
  NO_SHOW: 'Faltou',
};

const AGENDA_CATEGORIES = [
  { label: 'Injetáveis', color: '#15998B' },
  { label: 'Laser', color: '#9B7BD4' },
  { label: 'Facial', color: '#5BA8DE' },
  { label: 'Corporal', color: '#E0915B' },
  { label: 'Peeling', color: '#D46B8A' },
];

const AGENDA_VIEWS = [
  { view: 'timeGridDay', label: 'Dia' },
  { view: 'timeGridWeek', label: 'Semana' },
  { view: 'dayGridMonth', label: 'Mês' },
];
const AGENDA_VIEW_CODEC = urlEnum(AGENDA_VIEWS.map((v) => v.view));

// Cor "de categoria" derivada de forma determinística do nome do procedimento
// (o backend ainda não tem cor por categoria).
function categoryColorFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AGENDA_CATEGORIES[h % AGENDA_CATEGORIES.length].color;
}

export function Appointments() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuth();
  const { has, restrictToOwnAppointments } = usePermissions();
  const canCreate = has('appointments:create');
  const calendarRef = useRef<FullCalendar | null>(null);
  const [currentView, setCurrentView] = useUrlState(
    'visao',
    isMobile ? 'timeGridDay' : 'timeGridWeek',
    AGENDA_VIEW_CODEC,
  );
  const [currentDate, setCurrentDate] = useUrlState('data', dayjs().format('YYYY-MM-DD'), urlDate);
  const [periodLabel, setPeriodLabel] = useState('');
  const [pendingDismissed, setPendingDismissed] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [defaultStart, setDefaultStart] = useState<Date | null>(null);
  const [defaultPatientId, setDefaultPatientId] = useState<string | null>(null);
  const [filterProfessionalIds] = useUrlState<string[]>('profissionais', [], urlList);

  const [range, setRange] = useState<{ from: string; to: string }>(() => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    return { from: from.toISOString(), to: to.toISOString() };
  });

  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery({
    queryKey: ['appointments', 'range', range.from, range.to],
    queryFn: () => appointmentsApi.list(range.from, range.to),
  });

  const { data: activeUsers = [] } = useQuery({
    queryKey: ['users', 'appointment-providers'],
    queryFn: () => usersApi.listAppointmentProviders(),
    enabled: !restrictToOwnAppointments,
  });

  const { data: pendingAppointments = [] } = useQuery({
    queryKey: ['appointments', 'pending'],
    queryFn: () => appointmentsApi.pending(),
    refetchInterval: 5 * 60_000,
  });

  const [pendingExpanded, setPendingExpanded] = useState(false);

  const unavailabilityUserIds = useMemo(() => {
    if (restrictToOwnAppointments) {
      if (!user || user.providesAppointments === false) return [];
      return [user.id];
    }
    return activeUsers.map((u) => u.id);
  }, [restrictToOwnAppointments, user, activeUsers]);

  const unavailabilityQueries = useQueries({
    queries: unavailabilityUserIds.map((userId) => ({
      queryKey: ['unavailability', userId],
      queryFn: () => availabilityApi.listUnavailability(userId),
      enabled: !!userId,
    })),
  });

  const unavailabilityItems = useMemo<UnavailabilityCalendarItem[]>(() => {
    const merged = unavailabilityUserIds.flatMap((userId, index) => {
      const rows = unavailabilityQueries[index]?.data ?? [];
      const userName = restrictToOwnAppointments
        ? (user?.name ?? '')
        : (activeUsers.find((u) => u.id === userId)?.name ?? '');
      return rows.map((row) => ({
        ...row,
        user: { id: userId, name: userName },
      }));
    });
    return filterUnavailabilityInRange(merged, range.from, range.to);
  }, [
    unavailabilityUserIds,
    unavailabilityQueries,
    restrictToOwnAppointments,
    user?.name,
    activeUsers,
    range.from,
    range.to,
  ]);

  const filteredAppointments = useMemo(
    () =>
      filterProfessionalIds.length > 0
        ? appointments.filter((a) => filterProfessionalIds.includes(a.professionalId))
        : appointments,
    [appointments, filterProfessionalIds],
  );

  const appointmentEvents = useMemo<EventInput[]>(
    () =>
      filteredAppointments.map((a) => {
        const tag = kindLabel[a.kind] ? `[${kindLabel[a.kind]}] ` : '';
        const catColor = categoryColorFor(a.procedure?.name ?? a.kind ?? '');
        const statusColor = statusColors[a.status]?.border ?? theme.palette.primary.main;
        return {
          id: a.id,
          title: `${tag}${a.patient?.name ?? 'Paciente'} · ${a.procedure?.name ?? ''}`,
          start: a.startAt,
          end: a.endAt,
          backgroundColor: `${catColor}1A`,
          borderColor: catColor,
          textColor: theme.palette.text.primary,
          extendedProps: {
            appointment: a,
            catColor,
            statusColor,
            sessionLabel:
              a.patientPackageId && a.patientPackage?.sessionsTotal && a.sessionIndex
                ? `Sessão ${a.sessionIndex}/${a.patientPackage.sessionsTotal}`
                : null,
          },
        };
      }),
    [filteredAppointments, theme.palette.text.primary, theme.palette.primary.main],
  );

  const isDark = theme.palette.mode === 'dark';

  const holidayEvents = useMemo(() => {
    const evs = buildBrazilCaieirasHolidayEvents(range.from, range.to);
    return isDark ? evs.map(toDarkEvent) : evs;
  }, [range.from, range.to, isDark]);

  const unavailabilityEvents = useMemo(() => {
    const evs = buildUnavailabilityCalendarEvents(unavailabilityItems, !restrictToOwnAppointments);
    return isDark ? evs.map(toDarkEvent) : evs;
  }, [unavailabilityItems, restrictToOwnAppointments, isDark]);

  const events = useMemo<EventInput[]>(
    () => [...holidayEvents, ...unavailabilityEvents, ...appointmentEvents],
    [holidayEvents, unavailabilityEvents, appointmentEvents],
  );

  const openNew = (start: Date | null = null, patientId: string | null = null) => {
    setEditing(null);
    setDefaultStart(start);
    setDefaultPatientId(patientId);
    setFormOpen(true);
  };

  // Abre a modal automaticamente quando chega via "Novo agendamento" do header (?novo=1)
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    if (searchParams.get('novo') === '1' && canCreate) {
      openNew(null, searchParams.get('paciente'));
      const next = new URLSearchParams(searchParams);
      next.delete('novo');
      next.delete('paciente');
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, canCreate]);

  const handleDatesSet = (info: DatesSetArg) => {
    setRange({ from: info.start.toISOString(), to: info.end.toISOString() });
    setPeriodLabel(info.view.title);
    setCurrentView(info.view.type);
    setCurrentDate(dayjs(info.view.calendar.getDate()).format('YYYY-MM-DD'));
  };

  const handleSelect = (info: DateSelectArg) => {
    if (!canCreate) return;
    if (slotOverlapsUnavailability(info.start, info.end, unavailabilityItems)) return;
    if (
      restrictToOwnAppointments &&
      user &&
      slotOverlapsProfessionalAppointment(info.start, info.end, appointments, user.id)
    ) {
      return;
    }
    openNew(info.start);
  };

  const handleDateClick = (info: DateClickArg) => {
    if (!canCreate) return;
    openNew(info.date);
  };

  const handleEventClick = (info: EventClickArg) => {
    if (info.event.extendedProps?.holiday) return;
    if (info.event.extendedProps?.unavailability) return;
    const appt = info.event.extendedProps?.appointment as Appointment | undefined;
    if (!appt) return;
    setEditing(appt);
    setDefaultStart(null);
    setFormOpen(true);
  };

  const scrollActiveCalendarView = useCallback((direction: 'up' | 'down' | 'pageUp' | 'pageDown') => {
    const root = calendarRef.current?.getApi().el as HTMLElement | undefined;
    if (!root) return;
    const scroller = root.querySelector('.fc-view-harness-active .fc-scroller') as HTMLElement | null;
    if (!scroller) return;

    const line = 56;
    switch (direction) {
      case 'up':
        scroller.scrollTop -= line;
        break;
      case 'down':
        scroller.scrollTop += line;
        break;
      case 'pageUp':
        scroller.scrollTop -= scroller.clientHeight * 0.85;
        break;
      case 'pageDown':
        scroller.scrollTop += scroller.clientHeight * 0.85;
        break;
    }
  }, []);

  const handleCalendarKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        scrollActiveCalendarView('down');
        event.preventDefault();
        break;
      case 'ArrowUp':
        scrollActiveCalendarView('up');
        event.preventDefault();
        break;
      case 'PageDown':
        scrollActiveCalendarView('pageDown');
        event.preventDefault();
        break;
      case 'PageUp':
        scrollActiveCalendarView('pageUp');
        event.preventDefault();
        break;
      default:
        break;
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: { xs: 'calc(100vh - 100px)', md: 'calc(100vh - 128px)' },
      }}
    >
      <PageHeader
        title="Agenda"
        subtitle={
          restrictToOwnAppointments
            ? 'Sua agenda · feriados · indisponibilidades'
            : 'Agendamentos, feriados e bloqueios de indisponibilidade dos profissionais'
        }
      />

      {pendingAppointments.length > 0 && !pendingDismissed && (
        <Box
          sx={{
            mb: 1.5,
            borderRadius: '13px',
            border: '1px solid',
            borderColor: 'rgba(194,90,76,.32)',
            bgcolor: 'rgba(194,90,76,.07)',
            overflow: 'hidden',
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={1.25}
            sx={{ px: 2, py: 1.35, cursor: 'pointer' }}
            onClick={() => setPendingExpanded((v) => !v)}
          >
            <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: '#C25A4C', flexShrink: 0 }} />
            <Typography sx={{ flex: 1, fontSize: fontSizes.md, fontWeight: 700 }}>
              {pendingAppointments.length} agendamento{pendingAppointments.length > 1 ? 's' : ''} com pendência
            </Typography>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setPendingExpanded((v) => !v);
              }}
              aria-label={pendingExpanded ? 'Recolher' : 'Expandir'}
              sx={{
                color: 'text.secondary',
                transform: pendingExpanded ? 'rotate(180deg)' : 'none',
                transition: 'transform 150ms ease',
              }}
            >
              <AuroraIcon name="chevronDown" size={16} strokeWidth={2} />
            </IconButton>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setPendingDismissed(true);
              }}
              aria-label="Dispensar"
              sx={{ color: 'text.secondary' }}
            >
              <AuroraIcon name="close" size={16} strokeWidth={2} />
            </IconButton>
          </Stack>
          <Collapse in={pendingExpanded}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, px: 2, pb: 1.75, pt: 0.25 }}>
              {pendingAppointments.map((a) => (
                <Box
                  key={a.id}
                  onClick={() => {
                    setEditing(a);
                    setDefaultStart(null);
                    setFormOpen(true);
                  }}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.75,
                    px: 1.25,
                    py: 0.85,
                    borderRadius: '10px',
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'rgba(194,90,76,.25)',
                    cursor: 'pointer',
                    '&:hover': { borderColor: '#C25A4C' },
                  }}
                >
                  <Box
                    component="span"
                    sx={{
                      fontSize: fontSizes.xs,
                      fontWeight: 800,
                      color: '#C25A4C',
                      textTransform: 'uppercase',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {new Date(a.startAt).toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}{' '}
                    {new Date(a.startAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </Box>
                  <Box component="span" sx={{ fontSize: fontSizes.xs, fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {a.patient?.name ?? 'Paciente'}
                  </Box>
                  <Box component="span" sx={{ fontSize: fontSizes.xs, color: 'text.secondary', whiteSpace: 'nowrap' }}>
                    · {a.procedure?.name ?? kindLabel[a.kind] ?? a.kind}
                  </Box>
                </Box>
              ))}
            </Box>
          </Collapse>
        </Box>
      )}

      {/* Toolbar custom (fora do calendário) */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1.5,
          mb: 1.5,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap" useFlexGap>
          <Stack direction="row" alignItems="center" spacing={0.25}>
            <IconButton
              onClick={() => calendarRef.current?.getApi().prev()}
              aria-label="Anterior"
              sx={{
                width: 36,
                height: 36,
                borderRadius: '9px',
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                color: 'text.secondary',
                '&:hover': { bgcolor: 'grey.50', borderColor: 'primary.light' },
              }}
            >
              <AuroraIcon name="chevronLeft" size={17} strokeWidth={2} />
            </IconButton>
            <Typography
              sx={{
                fontSize: fontSizes.xl,
                fontWeight: 700,
                px: 1,
                textTransform: 'capitalize',
                textAlign: 'center',
                minWidth: { xs: 90, sm: 150 },
              }}
            >
              {periodLabel}
            </Typography>
            <IconButton
              onClick={() => calendarRef.current?.getApi().next()}
              aria-label="Próximo"
              sx={{
                width: 36,
                height: 36,
                borderRadius: '9px',
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                color: 'text.secondary',
                '&:hover': { bgcolor: 'grey.50', borderColor: 'primary.light' },
              }}
            >
              <AuroraIcon name="chevronRight" size={17} strokeWidth={2} />
            </IconButton>
          </Stack>
          <Button
            onClick={() => calendarRef.current?.getApi().today()}
            sx={{
              bgcolor: `${theme.palette.primary.main}1F`,
              color: 'primary.main',
              fontWeight: 700,
              fontSize: fontSizes.sm,
              borderRadius: '10px',
              px: 2,
              '&:hover': { bgcolor: `${theme.palette.primary.main}2E` },
            }}
          >
            Hoje
          </Button>
          <Box sx={{ display: 'flex', gap: '3px', bgcolor: 'grey.100', p: '3px', borderRadius: '10px' }}>
            {AGENDA_VIEWS.map((opt) => {
              const active = currentView === opt.view;
              return (
                <Box
                  key={opt.view}
                  component="button"
                  type="button"
                  onClick={() => calendarRef.current?.getApi().changeView(opt.view)}
                  sx={{
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: fontSizes.sm,
                    fontWeight: 700,
                    px: 1.75,
                    py: 0.75,
                    borderRadius: '8px',
                    ...(active
                      ? {
                          bgcolor: 'background.paper',
                          color: 'primary.main',
                          boxShadow: '0 1px 3px rgba(16,40,37,.14)',
                        }
                      : { bgcolor: 'transparent', color: 'text.secondary' }),
                  }}
                >
                  {opt.label}
                </Box>
              );
            })}
          </Box>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap" useFlexGap>
          {AGENDA_CATEGORIES.map((c) => (
            <Stack key={c.label} direction="row" alignItems="center" spacing={0.9}>
              <Box sx={{ width: 10, height: 10, borderRadius: '3px', bgcolor: c.color, flexShrink: 0 }} />
              <Typography sx={{ fontSize: fontSizes.xs, fontWeight: 600, color: 'text.secondary' }}>
                {c.label}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Box>

      {/* Legenda de status */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: { xs: 1.5, sm: 2 },
          flexWrap: 'wrap',
          px: 2,
          py: 1.15,
          mb: 1.5,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: '13px',
          boxShadow: '0 1px 2px rgba(16,40,37,.04),0 8px 24px -12px rgba(16,40,37,.10)',
        }}
      >
        <Typography
          sx={{
            fontSize: fontSizes.xs,
            fontWeight: 700,
            color: 'text.secondary',
            textTransform: 'uppercase',
            letterSpacing: '0.4px',
          }}
        >
          Status
        </Typography>
        {Object.entries(statusLabel).map(([key, label]) => (
          <Stack key={key} direction="row" alignItems="center" spacing={0.9}>
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: '3px',
                bgcolor: statusColors[key as AppointmentStatus]?.border,
                flexShrink: 0,
              }}
            />
            <Typography sx={{ fontSize: fontSizes.xs, fontWeight: 600, color: 'text.secondary' }}>
              {label}
            </Typography>
          </Stack>
        ))}
      </Box>

      <Card
        tabIndex={0}
        role="region"
        aria-label="Calendário de agendamentos"
        onKeyDown={handleCalendarKeyDown}
        sx={{
          flex: 1,
          p: { xs: 0.75, sm: 1.5, md: 2.5 },
          minHeight: 0,
          outline: 'none',
          position: 'relative',
          '&:focus-visible': {
            boxShadow: `0 0 0 2px ${theme.palette.primary.main}`,
          },
          '& .fc': {
            height: '100% !important',
            fontFamily: theme.typography.fontFamily,
          },
          '& .fc .fc-toolbar': {
            flexWrap: 'wrap',
            gap: isMobile ? '6px' : '8px',
            ...(isMobile && { marginBottom: '0.5em' }),
          },
          '& .fc .fc-toolbar-title': {
            fontSize: isMobile ? '0.95rem' : '1.05rem',
            fontWeight: 700,
            color: theme.palette.text.primary,
            textTransform: 'capitalize',
          },
          '& .fc .fc-button': {
            backgroundColor: theme.palette.background.paper,
            color: theme.palette.text.secondary,
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: 'none',
            textTransform: 'none',
            fontWeight: 700,
            borderRadius: '10px',
            padding: isMobile ? '5px 10px' : '7px 14px',
            fontSize: isMobile ? '0.75rem' : '0.8125rem',
          },
          '& .fc .fc-button:hover': {
            backgroundColor: theme.palette.grey[50],
            color: theme.palette.primary.dark,
            borderColor: theme.palette.primary.light,
          },
          // prev/next como quadradinhos
          '& .fc .fc-prev-button, & .fc .fc-next-button': {
            width: 36,
            height: 36,
            padding: 0,
            borderRadius: '9px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          },
          // "Hoje" em tint
          '& .fc .fc-today-button': {
            backgroundColor: `${theme.palette.primary.main}1F`,
            color: theme.palette.primary.main,
            border: 'none',
            opacity: '1 !important',
          },
          '& .fc .fc-today-button:disabled': {
            backgroundColor: theme.palette.grey[100],
            color: theme.palette.text.disabled,
            opacity: '1 !important',
          },
          // seletor de visão segmentado
          '& .fc .fc-button-group': {
            backgroundColor: theme.palette.grey[100],
            padding: '3px',
            borderRadius: '10px',
            gap: '3px',
          },
          '& .fc .fc-button-group .fc-button': {
            border: 'none',
            backgroundColor: 'transparent',
            color: theme.palette.text.secondary,
            borderRadius: '8px !important',
            padding: isMobile ? '5px 9px' : '6px 14px',
          },
          '& .fc .fc-button-group .fc-button:hover': {
            backgroundColor: 'transparent',
            color: theme.palette.primary.main,
          },
          '& .fc .fc-button-primary:not(:disabled).fc-button-active': {
            backgroundColor: theme.palette.background.paper,
            color: theme.palette.primary.main,
            boxShadow: '0 1px 3px rgba(16,40,37,.14)',
          },
          '& .fc .fc-button-primary:focus, & .fc .fc-button-primary:not(:disabled):active:focus': {
            boxShadow: 'none',
          },
          '& .fc-theme-standard td, & .fc-theme-standard th, & .fc-theme-standard .fc-scrollgrid':
            {
              borderColor: theme.palette.divider,
            },
          '& .fc .fc-col-header-cell': {
            backgroundColor: theme.palette.background.paper,
            padding: '10px 0',
          },
          '& .fc .fc-col-header-cell-cushion': {
            color: theme.palette.text.secondary,
            fontWeight: 600,
            fontSize: fontSizes.xs,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            padding: 0,
          },
          '& .fc .fc-daygrid-day-number, & .fc .fc-timegrid-axis-cushion': {
            color: theme.palette.text.secondary,
            fontSize: fontSizes.md,
          },
          '& .fc .fc-day-today': {
            backgroundColor: `${theme.palette.mode === 'dark' ? theme.palette.primary.main + '14' : '#EDF8F7'} !important`,
          },
          '& .fc .fc-timegrid-slot': {
            height: '2.7em',
          },
          '& .fc .fc-timegrid-slot-label-cushion, & .fc .fc-timegrid-axis-cushion': {
            fontSize: fontSizes.xs,
            fontWeight: 600,
            color: theme.palette.text.secondary,
          },
          '& .fc .fc-timegrid-now-indicator-line': {
            borderColor: theme.palette.primary.main,
          },
          '& .fc .fc-timegrid-now-indicator-arrow': {
            borderColor: theme.palette.primary.main,
          },
          '& .fc-event': {
            padding: 0,
            cursor: 'pointer',
            fontSize: fontSizes.xs,
            fontWeight: 600,
            borderRadius: '12px',
            border: 'none',
            overflow: 'hidden',
            boxShadow: '0 1px 2px rgba(16,40,37,.06)',
          },
          '& .fc .fc-event-main': {
            padding: 0,
          },
          '& .fc-dayGridMonth-view .fc-event, & .fc-dayGridMonth-view .fc-daygrid-event': {
            borderRadius: 8,
            boxShadow: 'none',
          },
          '& .fc-dayGridMonth-view .fc-event .fc-event-main': {
            padding: '1px 4px',
          },
          '& .fc-timeGridWeek-view, & .fc-timeGridDay-view': {
            '& .fc-event, & .fc-timegrid-event, & .fc-v-event, & .fc-daygrid-event, & .fc-daygrid-block-event':
              {
                borderRadius: '12px !important',
                border: 'none !important',
                overflow: 'hidden',
              },
          },
          '& .fc-event:hover': {
            filter: 'brightness(0.95)',
          },
          '& .fc .fc-highlight': {
            backgroundColor: 'rgba(10, 186, 181, 0.15)',
          },
          '& .fc .fc-event.fc-holiday-nacional, & .fc .fc-event.fc-holiday-municipal': {
            fontSize: fontSizes.xs,
            fontWeight: 600,
            cursor: 'default',
          },
          '& .fc-event.fc-holiday-nacional:hover, & .fc-event.fc-holiday-municipal:hover': {
            filter: 'none',
          },
          '& .fc .fc-event.fc-unavailability': {
            fontSize: fontSizes.xs,
            fontWeight: 600,
            cursor: 'default',
            opacity: 0.95,
          },
          '& .fc-event.fc-unavailability:hover': {
            filter: 'none',
          },
          '& .fc .fc-all-day': {
            minHeight: 28,
          },
          '& .fc-view-harness-active .fc-scroller': {
            overflowY: 'auto !important',
            overflowX: 'auto !important',
          },
        }}
      >
        {appointmentsLoading && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              zIndex: 10,
              borderRadius: 'inherit',
              bgcolor: 'background.paper',
              p: 1.5,
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
            }}
          >
            <Stack direction="row" spacing={1}>
              <Skeleton variant="rounded" width={54} height={30} sx={{ flexShrink: 0 }} />
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} variant="rounded" height={30} sx={{ flex: 1 }} />
              ))}
            </Stack>
            <Box
              sx={{
                flex: 1,
                display: 'grid',
                gridTemplateColumns: '54px repeat(7, 1fr)',
                gridAutoRows: '1fr',
                gap: 1,
                minHeight: 0,
              }}
            >
              {Array.from({ length: 8 * 8 }).map((_, i) => {
                const isTimeCol = i % 8 === 0;
                const showEvent = !isTimeCol && (i * 7) % 5 < 2;
                return (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'stretch' }}>
                    {isTimeCol ? (
                      <Skeleton variant="text" width={34} sx={{ my: 'auto' }} />
                    ) : showEvent ? (
                      <Skeleton variant="rounded" sx={{ flex: 1, borderRadius: '10px' }} />
                    ) : null}
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={currentView}
          initialDate={currentDate}
          locale={ptBrLocale}
          height="100%"
          scrollTime="08:00:00"
          headerToolbar={false}
          buttonText={{
            today: 'Hoje',
            month: 'Mês',
            week: 'Sem',
            day: 'Dia',
          }}
          slotMinTime="07:00:00"
          slotMaxTime="22:00:00"
          slotDuration="00:30:00"
          allDaySlot
          nowIndicator
          weekends
          selectable
          selectMirror
          dayMaxEvents
          firstDay={1}
          events={events}
          datesSet={handleDatesSet}
          select={handleSelect}
          selectAllow={(info) => {
            if (slotOverlapsUnavailability(info.start, info.end, unavailabilityItems)) return false;
            if (
              restrictToOwnAppointments &&
              user &&
              slotOverlapsProfessionalAppointment(info.start, info.end, appointments, user.id)
            ) {
              return false;
            }
            return true;
          }}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
          slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
          dayHeaderContent={(arg) => {
            const weekday = arg.date
              .toLocaleDateString('pt-BR', { weekday: 'short' })
              .replace('.', '');
            if (arg.view.type === 'dayGridMonth') {
              return (
                <Box
                  sx={{
                    fontSize: fontSizes['2xs'],
                    fontWeight: 700,
                    color: 'text.secondary',
                    textTransform: 'uppercase',
                    letterSpacing: '0.4px',
                    py: 0.75,
                  }}
                >
                  {weekday}
                </Box>
              );
            }
            return (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 0.4,
                  py: 0.6,
                }}
              >
                <Box
                  sx={{
                    fontSize: fontSizes['3xs'],
                    fontWeight: 700,
                    color: 'text.secondary',
                    textTransform: 'uppercase',
                    letterSpacing: '0.4px',
                  }}
                >
                  {weekday}
                </Box>
                <Box
                  sx={{
                    minWidth: 30,
                    height: 30,
                    px: 0.75,
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: fontSizes.md,
                    fontWeight: 800,
                    ...(arg.isToday
                      ? { bgcolor: 'primary.main', color: '#fff' }
                      : { color: 'text.primary' }),
                  }}
                >
                  {arg.date.getDate()}
                </Box>
              </Box>
            );
          }}
          eventContent={(arg) => {
            const appt = arg.event.extendedProps.appointment as Appointment | undefined;
            const isMonth = arg.view.type === 'dayGridMonth';
            const barColor = arg.event.borderColor || theme.palette.primary.main;
            const statusColor = (arg.event.extendedProps.statusColor as string) || barColor;
            if (appt) {
              if (isMonth) {
                return (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, minWidth: 0, px: 0.25 }}>
                    <Box
                      sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: barColor, flexShrink: 0 }}
                    />
                    <Box component="span" sx={{ fontWeight: 700, fontSize: fontSizes['2xs'], flexShrink: 0 }}>
                      {arg.timeText}
                    </Box>
                    <Box
                      component="span"
                      sx={{
                        fontWeight: 700,
                        fontSize: fontSizes['2xs'],
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {appt.patient?.name ?? 'Paciente'}
                    </Box>
                  </Box>
                );
              }
              return (
                <Box
                  sx={{
                    position: 'relative',
                    height: '100%',
                    overflow: 'hidden',
                    borderRadius: '12px',
                    boxShadow: `inset 4px 0 0 ${barColor}`,
                    pl: '11px',
                    pr: '14px',
                    pt: '7px',
                    pb: '4px',
                  }}
                >
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      width: 13,
                      height: 13,
                      borderRadius: '50%',
                      bgcolor: statusColor,
                      border: '2px solid',
                      borderColor: 'background.paper',
                    }}
                  />
                  <Box sx={{ minWidth: 0, lineHeight: 1.25 }}>
                    <Box sx={{ fontSize: fontSizes['3xs'], fontWeight: 700, opacity: 0.9 }}>
                      {arg.timeText}
                    </Box>
                    <Box
                      sx={{
                        fontSize: fontSizes.xs,
                        fontWeight: 800,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {appt.patient?.name ?? 'Paciente'}
                    </Box>
                    {arg.event.extendedProps.sessionLabel ? (
                      <Box
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          mt: '2px',
                          maxWidth: '100%',
                          px: '5px',
                          py: '1px',
                          borderRadius: '6px',
                          bgcolor: `${barColor}26`,
                          color: barColor,
                          fontSize: fontSizes['3xs'],
                          fontWeight: 800,
                          letterSpacing: '0.03em',
                          textTransform: 'uppercase',
                          lineHeight: 1.4,
                        }}
                      >
                        <AuroraIcon name="pacotes" size={10} />
                        <Box
                          component="span"
                          sx={{
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {arg.event.extendedProps.sessionLabel as string}
                        </Box>
                      </Box>
                    ) : (
                      appt.procedure?.name && (
                        <Box
                          sx={{
                            fontSize: fontSizes['3xs'],
                            opacity: 0.82,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {appt.procedure.name}
                        </Box>
                      )
                    )}
                  </Box>
                </Box>
              );
            }
            return (
              <Box
                sx={{
                  px: 0.5,
                  fontSize: fontSizes['2xs'],
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {arg.event.title}
              </Box>
            );
          }}
        />
      </Card>

      <AppointmentFormDialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setDefaultStart(null);
          setDefaultPatientId(null);
        }}
        appointment={editing}
        defaultStart={defaultStart}
        defaultPatientId={defaultPatientId}
      />
    </Box>
  );
}

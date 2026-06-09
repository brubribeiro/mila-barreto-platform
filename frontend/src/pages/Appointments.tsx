import { useCallback, useMemo, useRef, useState } from 'react';
import { Box, Button, Card, Checkbox, Chip, FormControl, InputLabel, ListItemText, MenuItem, OutlinedInput, Select, Stack, useMediaQuery, useTheme } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import HistoryIcon from '@mui/icons-material/History';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import type { EventInput, DatesSetArg, DateSelectArg, EventClickArg, DateClickArg } from '@fullcalendar/core';
import { useQueries, useQuery } from '@tanstack/react-query';

import { PageHeader } from '../components/PageHeader';
import { appointmentsApi } from '../api/appointments';
import { availabilityApi } from '../api/availability';
import { usersApi } from '../api/users';
import { AppointmentFormDialog } from '../components/appointments/AppointmentFormDialog';
import { AuditHistoryDialog } from '../components/audit/AuditHistoryDialog';
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

const statusColors: Record<AppointmentStatus, { bg: string; border: string; text: string }> = {
  SCHEDULED: { bg: '#B8E5E2', border: '#0ABAB5', text: '#07807C' },
  CONFIRMED: { bg: '#0ABAB5', border: '#07807C', text: '#FFFFFF' },
  IN_PROGRESS: { bg: '#F9A825', border: '#F57F17', text: '#FFFFFF' },
  COMPLETED: { bg: '#8FBFA8', border: '#5A9A7D', text: '#FFFFFF' },
  CANCELLED: { bg: '#EDEDEB', border: '#A8A6A2', text: '#6E6B66' },
  NO_SHOW: { bg: '#D58A81', border: '#8A3F33', text: '#FFFFFF' },
};

const kindLabel: Record<string, string> = {
  EVALUATION: 'AVAL',
  PROCEDURE: 'PROC',
  RETURN: 'RET',
};

export function Appointments() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuth();
  const { has, restrictToOwnAppointments, isAdmin } = usePermissions();
  const canCreate = has('appointments:create');
  const [historyOpen, setHistoryOpen] = useState(false);
  const calendarRef = useRef<FullCalendar | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [defaultStart, setDefaultStart] = useState<Date | null>(null);
  const [filterProfessionalIds, setFilterProfessionalIds] = useState<string[]>([]);

  const [range, setRange] = useState<{ from: string; to: string }>(() => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    return { from: from.toISOString(), to: to.toISOString() };
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments', 'range', range.from, range.to],
    queryFn: () => appointmentsApi.list(range.from, range.to),
  });

  const { data: activeUsers = [] } = useQuery({
    queryKey: ['users', 'appointment-providers'],
    queryFn: () => usersApi.listAppointmentProviders(),
    enabled: !restrictToOwnAppointments,
  });

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
        const colors = statusColors[a.status];
        const tag = kindLabel[a.kind] ? `[${kindLabel[a.kind]}] ` : '';
        return {
          id: a.id,
          title: `${tag}${a.patient?.name ?? 'Paciente'} · ${a.procedure?.name ?? ''}`,
          start: a.startAt,
          end: a.endAt,
          backgroundColor: colors.bg,
          borderColor: colors.border,
          textColor: colors.text,
          extendedProps: { appointment: a },
        };
      }),
    [filteredAppointments],
  );

  const holidayEvents = useMemo(
    () => buildBrazilCaieirasHolidayEvents(range.from, range.to),
    [range.from, range.to],
  );

  const unavailabilityEvents = useMemo(
    () => buildUnavailabilityCalendarEvents(unavailabilityItems, !restrictToOwnAppointments),
    [unavailabilityItems, restrictToOwnAppointments],
  );

  const events = useMemo<EventInput[]>(
    () => [...holidayEvents, ...unavailabilityEvents, ...appointmentEvents],
    [holidayEvents, unavailabilityEvents, appointmentEvents],
  );

  const openNew = (start: Date | null = null) => {
    setEditing(null);
    setDefaultStart(start);
    setFormOpen(true);
  };

  const handleDatesSet = (info: DatesSetArg) => {
    setRange({ from: info.start.toISOString(), to: info.end.toISOString() });
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
        action={
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            {!restrictToOwnAppointments && activeUsers.length > 1 && (
              <FormControl size="small" sx={{ minWidth: { xs: 140, sm: 200 } }}>
                <InputLabel id="filter-prof-label">Profissional</InputLabel>
                <Select
                  labelId="filter-prof-label"
                  multiple
                  value={filterProfessionalIds}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFilterProfessionalIds(typeof val === 'string' ? val.split(',') : val);
                  }}
                  input={<OutlinedInput label="Profissional" />}
                  renderValue={(selected) => {
                    if (selected.length === 0) return 'Todos';
                    if (selected.length <= 2) {
                      return selected
                        .map((id) => activeUsers.find((u) => u.id === id)?.name ?? id)
                        .join(', ');
                    }
                    return `${selected.length} selecionados`;
                  }}
                  MenuProps={{ PaperProps: { sx: { maxHeight: 300 } } }}
                >
                  {activeUsers.map((u) => (
                    <MenuItem key={u.id} value={u.id}>
                      <Checkbox size="small" checked={filterProfessionalIds.includes(u.id)} />
                      <ListItemText primary={u.name} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            {isAdmin && (
              <Button
                variant="outlined"
                startIcon={<HistoryIcon />}
                onClick={() => setHistoryOpen(true)}
                size={isMobile ? 'small' : 'medium'}
              >
                Histórico
              </Button>
            )}
            {canCreate && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => openNew()}
                size={isMobile ? 'small' : 'medium'}
              >
                {isMobile ? 'Novo' : 'Novo agendamento'}
              </Button>
            )}
          </Stack>
        }
      />

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
            fontSize: isMobile ? '0.95rem' : '1.15rem',
            fontWeight: 600,
            color: theme.palette.text.primary,
            textTransform: 'capitalize',
          },
          '& .fc .fc-button': {
            backgroundColor: 'transparent',
            color: theme.palette.text.secondary,
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: 'none',
            textTransform: 'none',
            fontWeight: 500,
            padding: isMobile ? '4px 8px' : '6px 14px',
            fontSize: isMobile ? '0.75rem' : undefined,
          },
          '& .fc .fc-button:hover': {
            backgroundColor: '#E5F4F3',
            color: theme.palette.primary.dark,
            borderColor: theme.palette.primary.light,
          },
          '& .fc .fc-button-primary:not(:disabled).fc-button-active, & .fc .fc-button-primary:not(:disabled):active':
            {
              backgroundColor: theme.palette.primary.main,
              color: '#FFFFFF',
              borderColor: theme.palette.primary.dark,
              boxShadow: 'none',
            },
          '& .fc .fc-button-primary:focus, & .fc .fc-button-primary:not(:disabled):active:focus': {
            boxShadow: 'none',
          },
          '& .fc-theme-standard td, & .fc-theme-standard th, & .fc-theme-standard .fc-scrollgrid':
            {
              borderColor: theme.palette.divider,
            },
          '& .fc .fc-col-header-cell': {
            backgroundColor: '#F4F4F2',
            padding: '8px 0',
          },
          '& .fc .fc-col-header-cell-cushion': {
            color: theme.palette.text.secondary,
            fontWeight: 600,
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            padding: 0,
          },
          '& .fc .fc-daygrid-day-number, & .fc .fc-timegrid-axis-cushion': {
            color: theme.palette.text.secondary,
            fontSize: '0.85rem',
          },
          '& .fc .fc-day-today': {
            backgroundColor: '#EDF8F7 !important',
          },
          '& .fc .fc-timegrid-now-indicator-line': {
            borderColor: theme.palette.primary.main,
          },
          '& .fc .fc-timegrid-now-indicator-arrow': {
            borderColor: theme.palette.primary.main,
          },
          '& .fc-event': {
            padding: '2px 4px',
            cursor: 'pointer',
            fontSize: '0.8rem',
          },
          '& .fc-dayGridMonth-view .fc-event, & .fc-dayGridMonth-view .fc-daygrid-event': {
            borderRadius: 8,
          },
          '& .fc-timeGridWeek-view, & .fc-timeGridDay-view': {
            '& .fc-event, & .fc-timegrid-event, & .fc-v-event, & .fc-daygrid-event, & .fc-daygrid-block-event':
              {
                borderRadius: '8px !important',
              },
          },
          '& .fc-event:hover': {
            filter: 'brightness(0.95)',
          },
          '& .fc .fc-highlight': {
            backgroundColor: 'rgba(10, 186, 181, 0.15)',
          },
          '& .fc .fc-event.fc-holiday-nacional, & .fc .fc-event.fc-holiday-municipal': {
            fontSize: '0.72rem',
            fontWeight: 600,
            cursor: 'default',
          },
          '& .fc-event.fc-holiday-nacional:hover, & .fc-event.fc-holiday-municipal:hover': {
            filter: 'none',
          },
          '& .fc .fc-event.fc-unavailability': {
            fontSize: '0.72rem',
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
            scrollbarWidth: 'thin',
            scrollbarColor: `${theme.palette.primary.main} ${theme.palette.grey[200]}`,
            '&::-webkit-scrollbar': {
              width: 10,
              height: 10,
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: theme.palette.grey[100],
              borderRadius: 8,
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: theme.palette.primary.main,
              borderRadius: 8,
              border: `2px solid ${theme.palette.grey[100]}`,
            },
            '&::-webkit-scrollbar-thumb:hover': {
              backgroundColor: theme.palette.primary.dark,
            },
          },
        }}
      >
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView={isMobile ? 'timeGridDay' : 'timeGridWeek'}
          locale={ptBrLocale}
          height="100%"
          scrollTime="08:00:00"
          headerToolbar={isMobile ? {
            left: 'prev,next',
            center: 'title',
            right: 'timeGridDay,timeGridWeek',
          } : {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
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
        />
      </Card>

      <AppointmentFormDialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setDefaultStart(null);
        }}
        appointment={editing}
        defaultStart={defaultStart}
      />
      <AuditHistoryDialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        entity="Appointment"
        title="Agendamentos"
      />
    </Box>
  );
}

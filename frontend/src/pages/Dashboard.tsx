import { useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import PeopleIcon from '@mui/icons-material/People';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import CakeOutlinedIcon from '@mui/icons-material/CakeOutlined';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import { Link as RouterLink } from 'react-router-dom';
import { alpha, useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

dayjs.locale('pt-br');

import { api } from '../api/client';
import { appointmentsApi } from '../api/appointments';
import { patientsApi } from '../api/patients';
import { AppointmentFormDialog } from '../components/appointments/AppointmentFormDialog';
import { SendWhatsAppDialog } from '../components/messages/SendWhatsAppDialog';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../contexts/usePermissions';
import type { Appointment, AppointmentStatus, Patient } from '../types';
import { dayjsFromDateOnlyApi } from '../utils/dateOnly';
import { UpcomingDatesCard } from '../components/dashboard/UpcomingDatesCard';
import { UpcomingExpensesCard } from '../components/dashboard/UpcomingExpensesCard';
import { DashboardDetailItem } from '../components/dashboard/DashboardDetailItem';
import { DashboardEmptyState } from '../components/dashboard/DashboardEmptyState';
import { AppGrid } from '../components/AppGrid';

const UPCOMING_BIRTHDAY_WINDOW_DAYS = 30;

const BIRTHDAY_ACCENT = '#C2185B';

function getNextBirthdayDate(birthDateStr: string): dayjs.Dayjs | null {
  const birth = dayjsFromDateOnlyApi(birthDateStr);
  if (!birth) return null;
  const today = dayjs().startOf('day');
  let next = today
    .clone()
    .month(birth.month())
    .date(birth.date())
    .startOf('day');
  if (!next.isValid()) return null;
  if (next.isBefore(today)) next = next.add(1, 'year');
  return next;
}

function turnsAgeOnDate(birth: dayjs.Dayjs, celebration: dayjs.Dayjs): number {
  return celebration.year() - birth.year();
}

function countdownBirthdayLabel(daysUntil: number): string {
  if (daysUntil === 0) return 'hoje';
  if (daysUntil === 1) return 'amanhã';
  return `em ${daysUntil} dias`;
}

function mondayToSundayWeekBounds(anchorDateStr: string) {
  const startOfDay = dayjs(anchorDateStr).startOf('day');
  const dow = startOfDay.day();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = startOfDay.add(mondayOffset, 'day');
  const sundayEnd = monday.add(6, 'day').endOf('day');
  return {
    from: monday.toISOString(),
    to: sundayEnd.toISOString(),
    label: `${monday.format('DD/MM')} – ${sundayEnd.format('DD/MM/YYYY')}`,
  };
}

const statusLabelDashboard: Partial<Record<AppointmentStatus, string>> = {
  SCHEDULED: 'Agendado',
  CONFIRMED: 'Confirmado',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
  NO_SHOW: 'Faltou',
};

const weekdayNamesPt = [
  'Domingo',
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
];

function labelForDayKey(dayKey: string) {
  const d = dayjs(dayKey);
  const isToday = d.isSame(dayjs(), 'day');
  const name = weekdayNamesPt[d.day()];
  return { title: `${name}, ${d.format('DD/MM')}`, isToday };
}

function weekAppointmentChipSx(status: AppointmentStatus): object {
  switch (status) {
    case 'CONFIRMED':
      return { bgcolor: 'primary.main', color: 'primary.contrastText' };
    case 'COMPLETED':
      return { bgcolor: 'success.main', color: 'success.contrastText' };
    case 'NO_SHOW':
      return { bgcolor: 'error.light', color: 'error.dark' };
    default:
      return { bgcolor: 'grey.200', color: 'text.primary' };
  }
}

interface SummaryCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  color?: string;
  to?: string;
}

function SummaryCard({ label, value, hint, icon, color = 'primary.main', to }: SummaryCardProps) {
  const card = (
    <Card
      sx={{
        height: '100%',
        ...(to && {
          cursor: 'pointer',
          transition: 'box-shadow 120ms ease, border-color 120ms ease',
          '&:hover': {
            boxShadow: 2,
            borderColor: 'primary.light',
          },
        }),
      }}
    >
      <CardContent sx={{ p: { xs: 1.25, sm: 2 }, '&:last-child': { pb: { xs: 1.25, sm: 2 } } }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: { xs: 0.5, sm: 1 } }}>
          <Typography variant="body2" color="text.secondary" fontWeight={500} sx={{ lineHeight: 1.3, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
            {label}
          </Typography>
          <Box sx={{ color, display: 'flex', flexShrink: 0, '& .MuiSvgIcon-root': { fontSize: { xs: 20, sm: 24 } } }}>{icon}</Box>
        </Stack>
        <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.2, fontSize: { xs: '1.1rem', sm: '1.5rem' } }}>
          {value}
        </Typography>
        {hint && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            {hint}
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  if (!to) return card;

  return (
    <Box
      component={RouterLink}
      to={to}
      aria-label={`${label}: ${value}`}
      sx={{ textDecoration: 'none', color: 'inherit', display: 'block', height: '100%' }}
    >
      {card}
    </Box>
  );
}

type RangeMode = 'MONTH' | 'CUSTOM';

export function Dashboard() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user } = useAuth();
  const { has, restrictToOwnAppointments } = usePermissions();
  const canSeeFinance = has('finance:view');
  const canSeeAgenda = has('appointments:view');
  const canSeePatients = has('patients:view');
  const canSeeInventory = has('inventory:view');

  const todayStr = dayjs().format('YYYY-MM-DD');
  const weekBounds = useMemo(() => mondayToSundayWeekBounds(todayStr), [todayStr]);

  const [mode, setMode] = useState<RangeMode>('MONTH');
  const [selectedYear, setSelectedYear] = useState(dayjs().year());
  const [selectedMonth, setSelectedMonth] = useState(dayjs().month() + 1);
  const [customFrom, setCustomFrom] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [customTo, setCustomTo] = useState(dayjs().endOf('month').format('YYYY-MM-DD'));

  const [weekApptDialogOpen, setWeekApptDialogOpen] = useState(false);
  const [editingWeekAppt, setEditingWeekAppt] = useState<Appointment | null>(null);
  const [whatsappPatient, setWhatsappPatient] = useState<Patient | null>(null);
  const [monthMenuAnchor, setMonthMenuAnchor] = useState<HTMLElement | null>(null);

  const { from, to } = useMemo(() => {
    if (mode === 'CUSTOM') {
      return {
        from: dayjs(customFrom).startOf('day').toISOString(),
        to: dayjs(customTo).endOf('day').toISOString(),
      };
    }
    const ref = dayjs(`${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`);
    return {
      from: ref.startOf('month').toISOString(),
      to: ref.endOf('month').toISOString(),
    };
  }, [mode, selectedYear, selectedMonth, customFrom, customTo]);

  const { data: summary } = useQuery({
    queryKey: ['finance-summary', from, to],
    queryFn: async () => {
      const { data } = await api.get('/finance/summary', { params: { from, to } });
      return data as { totalIncome: number; totalExpense: number; balance: number };
    },
    enabled: canSeeFinance,
  });

  const { data: appointments } = useQuery({
    queryKey: ['appointments-range', from, to],
    queryFn: async () => {
      const { data } = await api.get('/appointments', { params: { from, to } });
      return data as any[];
    },
  });

  const { data: weekAppointments = [], isLoading: weekLoading } = useQuery({
    queryKey: ['appointments-week', weekBounds.from, weekBounds.to],
    queryFn: () => appointmentsApi.list(weekBounds.from, weekBounds.to),
    enabled: canSeeAgenda,
  });

  const upcomingThisWeek = useMemo(() => {
    const now = dayjs();
    return weekAppointments
      .filter((a) => a.status !== 'CANCELLED')
      .filter((a) => !dayjs(a.startAt).isBefore(now))
      .sort((a, b) => dayjs(a.startAt).valueOf() - dayjs(b.startAt).valueOf());
  }, [weekAppointments]);

  const upcomingByDay = useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const a of upcomingThisWeek) {
      const key = dayjs(a.startAt).format('YYYY-MM-DD');
      const list = map.get(key);
      if (list) list.push(a);
      else map.set(key, [a]);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [upcomingThisWeek]);

  const { data: patients = [] } = useQuery({
    queryKey: ['patients', 'dashboard'],
    queryFn: () => patientsApi.list(),
  });

  const patientsInPeriod = useMemo(() => {
    const periodStart = dayjs(from);
    const periodEnd = dayjs(to);
    return patients.filter((p) => {
      const created = dayjs(p.createdAt);
      return (
        created.isValid() &&
        !created.isBefore(periodStart) &&
        !created.isAfter(periodEnd)
      );
    });
  }, [patients, from, to]);

  const { data: inventory } = useQuery({
    queryKey: ['inventory-low'],
    queryFn: async () => {
      const { data } = await api.get('/inventory');
      return data as any[];
    },
  });

  const lowStock = (inventory ?? []).filter(
    (i) => Number(i.quantity) <= Number(i.minQuantity),
  ).length;

  const upcomingBirthdays = useMemo(() => {
    if (!canSeePatients) return [];
    const today = dayjs().startOf('day');
    const end = today.add(UPCOMING_BIRTHDAY_WINDOW_DAYS, 'day');
    const rows: {
      patient: Patient;
      when: dayjs.Dayjs;
      turnsAge: number;
      daysUntil: number;
    }[] = [];

    for (const p of patients) {
      if (!p.birthDate) continue;
      const birth = dayjsFromDateOnlyApi(p.birthDate);
      if (!birth) continue;
      const next = getNextBirthdayDate(p.birthDate);
      if (!next || next.isAfter(end)) continue;
      const daysUntil = next.diff(today, 'day');
      if (daysUntil < 0) continue;
      rows.push({
        patient: p,
        when: next,
        turnsAge: turnsAgeOnDate(birth, next),
        daysUntil,
      });
    }

    return rows.sort((a, b) => a.when.valueOf() - b.when.valueOf());
  }, [canSeePatients, patients]);

  const yearOptions = useMemo(() => {
    const current = dayjs().year();
    const years: number[] = [];
    for (let y = current - 5; y <= current + 1; y++) years.push(y);
    return years;
  }, []);

  const calendarMonthOptions = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        value: i + 1,
        label: dayjs().month(i).format('MMMM'),
      })),
    [],
  );

  const selectedPeriodDate = useMemo(
    () => dayjs(`${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`),
    [selectedYear, selectedMonth],
  );

  const selectedPeriodLabel = selectedPeriodDate.format('MMMM [de] YYYY');

  const periodMin = useMemo(() => dayjs(`${yearOptions[0]}-01-01`), [yearOptions]);
  const periodMax = useMemo(
    () => dayjs(`${yearOptions[yearOptions.length - 1]}-12-31`),
    [yearOptions],
  );

  const canGoPrevMonth = selectedPeriodDate.isAfter(periodMin, 'month');
  const canGoNextMonth = selectedPeriodDate.isBefore(periodMax, 'month');

  const goToMonth = (delta: number) => {
    const next = selectedPeriodDate.add(delta, 'month');
    if (next.isBefore(periodMin, 'month') || next.isAfter(periodMax, 'month')) return;
    setSelectedYear(next.year());
    setSelectedMonth(next.month() + 1);
  };

  const periodFieldSx = {
    '& .MuiOutlinedInput-root': {
      bgcolor: 'background.paper',
      borderRadius: 1.5,
      fontSize: '0.875rem',
      '& fieldset': { borderColor: (theme: { palette: { primary: { main: string } } }) => alpha(theme.palette.primary.main, 0.22) },
      '&:hover fieldset': { borderColor: 'primary.light' },
      '&.Mui-focused fieldset': { borderColor: 'primary.main' },
    },
  } as const;

  const periodToggleSx = {
    '& .MuiToggleButton-root': {
      px: 2.25,
      py: 0.75,
      borderColor: (theme: { palette: { primary: { main: string } } }) => alpha(theme.palette.primary.main, 0.28),
      color: 'text.secondary',
      '&.Mui-selected': {
        bgcolor: (theme: { palette: { primary: { main: string } } }) => alpha(theme.palette.primary.main, 0.14),
        color: 'primary.dark',
        fontWeight: 600,
        '&:hover': {
          bgcolor: (theme: { palette: { primary: { main: string } } }) => alpha(theme.palette.primary.main, 0.2),
        },
      },
      '&:hover': {
        bgcolor: (theme: { palette: { primary: { main: string } } }) => alpha(theme.palette.primary.main, 0.06),
      },
    },
  } as const;

  const monthNavigatorSx = {
    border: '1px solid',
    borderColor: (theme: { palette: { primary: { main: string } } }) => alpha(theme.palette.primary.main, 0.22),
    borderRadius: 2,
    bgcolor: (theme: { palette: { primary: { main: string } } }) => alpha(theme.palette.primary.main, 0.05),
    px: 0.5,
  } as const;

  const visibleDetailColumns = 1 + (canSeePatients ? 1 : 0) + (canSeeAgenda ? 1 : 0) + (canSeeFinance ? 1 : 0);
  const detailGridCols =
    visibleDetailColumns >= 4 ? 4 : visibleDetailColumns === 3 ? 3 : visibleDetailColumns === 2 ? 2 : 1;

  const isImpersonating = user?.impersonating === true;
  const dashboardViewportOffset = isImpersonating ? 168 : 128;

  const detailCardScrollSx = {
    flex: '1 1 auto',
    overflow: 'auto',
    pr: 0.5,
    minHeight: 0,
  } as const;

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: { xs: 'auto', md: `calc(100dvh - ${dashboardViewportOffset}px)` },
        minHeight: 0,
      }}
    >
      <Card sx={{ mb: { xs: 2, sm: 3 }, flexShrink: 0 }}>
        <CardContent
          sx={{
            p: { xs: 1.5, sm: 2.5 },
            '&:last-child': { pb: { xs: 1.5, sm: 2.5 } },
          }}
        >
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            alignItems={{ md: 'center' }}
            justifyContent="space-between"
            spacing={{ xs: 1.5, sm: 2.5 }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h4" fontWeight={700}>
                Olá, {user?.name?.split(' ')[0] ?? 'bem-vinda'}
              </Typography>
              {!isMobile && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {restrictToOwnAppointments ? 'Sua visão geral' : 'Visão geral da clínica'}
                </Typography>
              )}
            </Box>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              alignItems={{ sm: 'center' }}
              spacing={2}
              sx={{ flexShrink: 0 }}
            >
              <ToggleButtonGroup
                size="small"
                exclusive
                value={mode}
                onChange={(_, v) => v && setMode(v)}
                sx={periodToggleSx}
              >
                <ToggleButton value="MONTH">Mês</ToggleButton>
                <ToggleButton value="CUSTOM">Intervalo</ToggleButton>
              </ToggleButtonGroup>

              {mode === 'MONTH' ? (
                <Stack direction="row" alignItems="center" spacing={0.25} sx={{ ...monthNavigatorSx, minWidth: 0 }}>
                  <Tooltip title="Mês anterior">
                    <span>
                      <IconButton
                        size="small"
                        color="primary"
                        disabled={!canGoPrevMonth}
                        onClick={() => goToMonth(-1)}
                        aria-label="Mês anterior"
                      >
                        <ChevronLeftIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>

                  <Button
                    variant="text"
                    size="small"
                    color="primary"
                    onClick={(e) => setMonthMenuAnchor(e.currentTarget)}
                    sx={{
                      minWidth: { xs: 110, sm: 180 },
                      textTransform: 'capitalize',
                      fontWeight: 600,
                      px: { xs: 0.75, sm: 1.5 },
                      borderRadius: 1.5,
                      fontSize: { xs: '0.8rem', sm: '0.875rem' },
                    }}
                  >
                    {selectedPeriodLabel}
                  </Button>

                  <Tooltip title="Próximo mês">
                    <span>
                      <IconButton
                        size="small"
                        color="primary"
                        disabled={!canGoNextMonth}
                        onClick={() => goToMonth(1)}
                        aria-label="Próximo mês"
                      >
                        <ChevronRightIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>

                  <Menu
                    anchorEl={monthMenuAnchor}
                    open={Boolean(monthMenuAnchor)}
                    onClose={() => setMonthMenuAnchor(null)}
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                    transformOrigin={{ vertical: 'top', horizontal: 'center' }}
                    slotProps={{
                      paper: {
                        sx: {
                          mt: 0.75,
                          borderRadius: 2,
                          minWidth: 280,
                          border: '1px solid',
                          borderColor: (theme) => alpha(theme.palette.primary.main, 0.15),
                          boxShadow: '0 8px 24px rgba(10, 186, 181, 0.12)',
                        },
                      },
                    }}
                  >
                    <Box sx={{ px: 2, pt: 1.5, pb: 0.5 }}>
                      <Typography variant="caption" color="primary.dark" fontWeight={600}>
                        Ir para
                      </Typography>
                    </Box>
                    <Box sx={{ px: 2, pb: 2, display: 'flex', gap: 1 }}>
                      <TextField
                        select
                        size="small"
                        label="Mês"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        sx={{ flex: 1, ...periodFieldSx }}
                      >
                        {calendarMonthOptions.map((opt) => (
                          <MenuItem key={opt.value} value={opt.value} sx={{ textTransform: 'capitalize' }}>
                            {opt.label}
                          </MenuItem>
                        ))}
                      </TextField>
                      <TextField
                        select
                        size="small"
                        label="Ano"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        sx={{ width: 100, ...periodFieldSx }}
                      >
                        {yearOptions.map((year) => (
                          <MenuItem key={year} value={year}>
                            {year}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Box>
                  </Menu>
                </Stack>
              ) : (
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  alignItems={{ sm: 'center' }}
                  sx={{ minWidth: { sm: 360 }, width: { xs: '100%', sm: 'auto' } }}
                >
                  <TextField
                    size="small"
                    type="date"
                    label="De"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{ flex: 1, ...periodFieldSx }}
                  />
                  <Typography variant="body2" color="primary.dark" fontWeight={500} sx={{ display: { xs: 'none', sm: 'block' } }}>
                    até
                  </Typography>
                  <TextField
                    size="small"
                    type="date"
                    label="Até"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{ flex: 1, ...periodFieldSx }}
                  />
                </Stack>
              )}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <AppGrid
        columns={{ xs: 2, md: 4 }}
        gap={{ xs: 1.5, sm: 3 }}
        sx={{ mb: { xs: 2, sm: 3 }, flexShrink: 0 }}
      >
        <SummaryCard
          label={restrictToOwnAppointments ? 'Meus agendamentos' : 'Agendamentos'}
          value={String(appointments?.length ?? 0)}
          hint="No período selecionado"
          icon={<EventIcon />}
          to={canSeeAgenda ? '/agenda' : undefined}
        />
        <SummaryCard
          label="Pacientes cadastrados"
          value={String(patientsInPeriod.length)}
          hint="No período selecionado"
          icon={<PeopleIcon />}
          to={canSeePatients ? '/pacientes' : undefined}
        />
        {canSeeFinance ? (
          <SummaryCard
            label="Faturamento"
            value={new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(summary?.totalIncome ?? 0)}
            hint={`Saldo: ${new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(summary?.balance ?? 0)}`}
            icon={<AttachMoneyIcon />}
            color="success.main"
            to="/financeiro"
          />
        ) : (
          <SummaryCard
            label="Itens em baixa"
            value={String(lowStock)}
            hint="Abaixo do estoque mínimo"
            icon={<WarningAmberIcon />}
            color="warning.main"
            to={canSeeInventory ? '/estoque' : undefined}
          />
        )}
        {canSeeFinance ? (
          <SummaryCard
            label="Itens em baixa"
            value={String(lowStock)}
            hint="Abaixo do estoque mínimo"
            icon={<WarningAmberIcon />}
            color="warning.main"
            to={canSeeInventory ? '/estoque' : undefined}
          />
        ) : (
          <SummaryCard
            label="Agendamentos futuros"
            value={String(upcomingThisWeek.length)}
            hint="Nesta semana"
            icon={<CalendarMonthOutlinedIcon />}
            to={canSeeAgenda ? '/agenda' : undefined}
          />
        )}
      </AppGrid>

      <AppGrid
        columns={{ xs: 1, lg: detailGridCols }}
        gap={{ xs: 2, sm: 3 }}
        sx={{
          flex: { xs: 'none', md: 1 },
          minHeight: { md: 0 },
          gridTemplateRows: { md: '1fr' },
        }}
      >
        <UpcomingDatesCard embedded />

        {canSeeFinance && <UpcomingExpensesCard embedded />}

        {canSeePatients && (
            <Card
              sx={{
                flex: 1,
                width: '100%',
                height: { md: '100%' },
                display: 'flex',
                flexDirection: 'column',
                minHeight: { md: 0 },
              }}
            >
              <CardContent sx={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', p: 2.5, minHeight: 0 }}>
                <Stack
                  direction="row"
                  spacing={2}
                  alignItems="flex-start"
                  justifyContent="space-between"
                  sx={{ mb: 2, flexShrink: 0, minHeight: 48 }}
                >
                  <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ minWidth: 0 }}>
                    <Avatar
                      variant="rounded"
                      sx={{
                        bgcolor: alpha(BIRTHDAY_ACCENT, 0.14),
                        width: 48,
                        height: 48,
                        flexShrink: 0,
                      }}
                    >
                      <CakeOutlinedIcon sx={{ color: 'text.secondary' }} />
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle1" fontWeight={700}>
                        Próximos aniversários
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Próximos {UPCOMING_BIRTHDAY_WINDOW_DAYS} dias
                      </Typography>
                    </Box>
                  </Stack>
                  <Button
                    size="small"
                    variant="outlined"
                    component={RouterLink}
                    to="/pacientes"
                    sx={{ flexShrink: 0 }}
                  >
                    Pacientes
                  </Button>
                </Stack>

                <Box sx={detailCardScrollSx}>
                  {upcomingBirthdays.length === 0 ? (
                    <DashboardEmptyState message="Nenhum aniversário neste período." />
                  ) : (
                    <Stack spacing={1.5}>
                      {upcomingBirthdays.map(({ patient, when, turnsAge, daysUntil }) => (
                        <DashboardDetailItem
                          key={patient.id}
                          accentColor={BIRTHDAY_ACCENT}
                          title={patient.name}
                          chip={
                            daysUntil <= 7
                              ? {
                                  label: countdownBirthdayLabel(daysUntil),
                                  color: daysUntil === 0 ? 'secondary' : 'default',
                                  variant: daysUntil === 0 ? 'filled' : 'outlined',
                                }
                              : undefined
                          }
                          subtitle={`Completa ${turnsAge} anos · ${when.format('dddd')}`}
                          primaryRight={when.format('DD/MM')}
                          secondaryRight={when.format('dddd')}
                          trailing={
                            patient.phone?.trim() ? (
                              <Tooltip title="Enviar mensagem no WhatsApp">
                                <IconButton
                                  size="small"
                                  onClick={() => setWhatsappPatient(patient)}
                                  aria-label={`Enviar WhatsApp para ${patient.name}`}
                                  sx={{ color: '#25D366' }}
                                >
                                  <WhatsAppIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            ) : undefined
                          }
                        />
                      ))}
                    </Stack>
                  )}
                </Box>
              </CardContent>
            </Card>
        )}

        {canSeeAgenda && (
            <Card
              sx={{
                width: '100%',
                flex: 1,
                height: { md: '100%' },
                display: 'flex',
                flexDirection: 'column',
                minHeight: { md: 0 },
              }}
            >
              <CardContent sx={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', p: 2.5, minHeight: 0 }}>
                <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ mb: 2, flexShrink: 0, minHeight: 48 }}>
                  <Avatar variant="rounded" sx={{ bgcolor: 'primary.light', width: 48, height: 48 }}>
                    <CalendarMonthOutlinedIcon sx={{ color: 'primary.dark' }} />
                  </Avatar>
                  <Box sx={{ flex: '1 1 auto', minWidth: 0 }}>
                    <Typography variant="subtitle1" fontWeight={700}>
                      Esta semana
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      {weekBounds.label}
                    </Typography>
                  </Box>
                </Stack>

                <Box sx={detailCardScrollSx}>
                  {weekLoading ? (
                    <Typography variant="body2" color="text.secondary">
                      Carregando…
                    </Typography>
                  ) : upcomingThisWeek.length === 0 ? (
                    <DashboardEmptyState message="Sem horários nesta semana." />
                  ) : (
                    <Stack spacing={2.75}>
                      {upcomingByDay.map(([dayKey, dayApps]) => {
                        const { title, isToday } = labelForDayKey(dayKey);
                        return (
                          <Box key={dayKey}>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                              <Typography
                                variant="overline"
                                sx={{ letterSpacing: 0.08, fontWeight: 700, fontSize: 11 }}
                              >
                                {title}
                              </Typography>
                              {isToday && (
                                <Chip label="hoje" size="small" color="primary" variant="filled" />
                              )}
                            </Stack>
                            <Stack spacing={1.5}>
                              {dayApps.map((a) => {
                                const subtitle = [
                                  a.procedure?.name ?? 'Procedimento',
                                  a.professional?.name,
                                ]
                                  .filter(Boolean)
                                  .join(' · ');

                                return (
                                  <DashboardDetailItem
                                    key={a.id}
                                    accentColor="primary.main"
                                    title={a.patient?.name ?? 'Paciente'}
                                    chip={{
                                      label: statusLabelDashboard[a.status] ?? a.status,
                                      sx: {
                                        borderRadius: 1,
                                        height: 22,
                                        fontSize: '0.7rem',
                                        ...weekAppointmentChipSx(a.status),
                                      },
                                    }}
                                    subtitle={subtitle}
                                    primaryRight={
                                      <Typography
                                        component="span"
                                        variant="subtitle2"
                                        fontWeight={700}
                                        sx={{ fontVariantNumeric: 'tabular-nums', color: 'primary.main' }}
                                      >
                                        {dayjs(a.startAt).format('HH:mm')}
                                      </Typography>
                                    }
                                    secondaryRight={dayjs(a.startAt).format('dddd')}
                                    onClick={() => {
                                      setEditingWeekAppt(a);
                                      setWeekApptDialogOpen(true);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        setEditingWeekAppt(a);
                                        setWeekApptDialogOpen(true);
                                      }
                                    }}
                                    aria-label={`Editar agendamento ${dayjs(a.startAt).format('dddd DD/MM')} às ${dayjs(a.startAt).format('HH:mm')}`}
                                  />
                                );
                              })}
                            </Stack>
                          </Box>
                        );
                      })}
                    </Stack>
                  )}
                </Box>
              </CardContent>
            </Card>
        )}
      </AppGrid>

      {canSeeAgenda && (
        <AppointmentFormDialog
          open={weekApptDialogOpen}
          onClose={() => {
            setWeekApptDialogOpen(false);
            setEditingWeekAppt(null);
          }}
          appointment={editingWeekAppt}
          defaultStart={null}
        />
      )}

      {canSeePatients && (
        <SendWhatsAppDialog
          open={!!whatsappPatient}
          onClose={() => setWhatsappPatient(null)}
          phone={whatsappPatient?.phone}
          patientId={whatsappPatient?.id}
          vars={{ paciente_nome: whatsappPatient?.name?.split(' ')[0] }}
          preferredCategory="aniversario"
          title={`Feliz aniversário — ${whatsappPatient?.name ?? ''}`}
        />
      )}
    </Box>
  );
}

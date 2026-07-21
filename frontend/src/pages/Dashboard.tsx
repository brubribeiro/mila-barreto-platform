import { useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Skeleton,
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
import { AuroraIcon } from '../components/AuroraIcon';

const UPCOMING_BIRTHDAY_WINDOW_DAYS = 30;

const BIRTHDAY_ACCENT = '#C2185B';

const BDAY_COLORS = ['#15998B', '#C98A12', '#C25A4C', '#5A9A7D', '#7E57C2', '#3A6B64'];

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
  const start = dayjs(anchorDateStr).startOf('day');
  const end = start.add(6, 'day').endOf('day');
  return {
    from: start.toISOString(),
    to: end.toISOString(),
    label: `${start.format('DD/MM')} – ${end.format('DD/MM/YYYY')}`,
  };
}

const statusLabelDashboard: Partial<Record<AppointmentStatus, string>> = {
  SCHEDULED: 'Agendado',
  CONFIRMED: 'Confirmado',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
  NO_SHOW: 'Faltou',
};

// Pills de status no estilo Aurora (fundo tint suave + texto colorido).
const AGENDA_PILL_SX: Record<string, { bgcolor: string; color: string }> = {
  SCHEDULED: { bgcolor: 'rgba(201,138,18,.16)', color: '#C98A12' },
  CONFIRMED: { bgcolor: 'rgba(17,168,147,.15)', color: '#11A893' },
  COMPLETED: { bgcolor: 'rgba(46,125,214,.15)', color: '#3787DE' },
  NO_SHOW: { bgcolor: 'rgba(214,90,90,.14)', color: '#D65A5A' },
  CANCELLED: { bgcolor: 'rgba(120,134,130,.16)', color: '#7C8B87' },
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
  loading?: boolean;
  delta?: string;
  deltaTone?: 'up' | 'down' | 'neutral';
}

const DELTA_TONES = {
  up: { color: '#11A893', bg: 'rgba(17,168,147,.13)' },
  down: { color: '#D65A5A', bg: 'rgba(214,90,90,.13)' },
  neutral: { color: '#6E7B78', bg: 'rgba(110,123,120,.12)' },
} as const;

function SummaryCard({
  label,
  value,
  hint,
  icon,
  color = 'primary.main',
  to,
  loading,
  delta,
  deltaTone = 'neutral',
}: SummaryCardProps) {
  const theme = useTheme();
  const [group, shade] = color.split('.') as [string, string | undefined];
  const paletteGroup = (theme.palette as unknown as Record<string, Record<string, string>>)[group];
  const resolvedColor = (shade && paletteGroup?.[shade]) || theme.palette.primary.main;

  const card = (
    <Card
      sx={{
        height: '100%',
        ...(to && {
          cursor: 'pointer',
          transition: 'box-shadow 120ms ease, border-color 120ms ease, transform 120ms ease',
          '&:hover': {
            boxShadow: theme.shadows[2],
            borderColor: alpha(resolvedColor, 0.4),
            transform: 'translateY(-2px)',
          },
        }),
      }}
    >
      <CardContent
        sx={{
          p: { xs: 2, sm: 2.5 },
          '&:last-child': { pb: { xs: 2, sm: 2.5 } },
          display: 'flex',
          flexDirection: 'column',
          gap: { xs: 1.25, sm: 2 },
        }}
      >
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={1}>
          <Typography
            sx={{
              fontSize: { xs: '0.75rem', sm: '0.8125rem' },
              fontWeight: 600,
              color: 'text.secondary',
              lineHeight: 1.35,
            }}
          >
            {label}
          </Typography>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: '11px',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha(resolvedColor, 0.12),
              color: resolvedColor,
              '& .MuiSvgIcon-root': { fontSize: 20 },
            }}
          >
            {icon}
          </Box>
        </Stack>
        {loading ? (
          <Skeleton variant="text" width={90} sx={{ fontSize: { xs: '1.5rem', sm: '1.85rem' } }} />
        ) : (
          <Typography
            sx={{
              fontSize: { xs: '1.5rem', sm: '1.85rem' },
              fontWeight: 800,
              letterSpacing: '-1px',
              lineHeight: 1.05,
              color: 'text.primary',
            }}
          >
            {value}
          </Typography>
        )}
        {!loading && (delta || hint) && (
          <Stack direction="row" alignItems="center" spacing={1}>
            {delta && (
              <Box
                component="span"
                sx={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: DELTA_TONES[deltaTone].color,
                  bgcolor: DELTA_TONES[deltaTone].bg,
                  px: 1,
                  py: 0.25,
                  borderRadius: '7px',
                  lineHeight: 1.4,
                }}
              >
                {delta}
              </Box>
            )}
            {hint && (
              <Typography
                component="span"
                sx={{ fontSize: '0.72rem', color: 'text.secondary', fontWeight: 500 }}
              >
                {hint}
              </Typography>
            )}
          </Stack>
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

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['finance-summary', from, to],
    queryFn: async () => {
      const { data } = await api.get('/finance/summary', { params: { from, to } });
      return data as { totalIncome: number; totalExpense: number; balance: number };
    },
    enabled: canSeeFinance,
  });

  const { data: appointments, isLoading: appointmentsLoading } = useQuery({
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

  const todayAppointments = useMemo(() => {
    const today = dayjs();
    return (appointments ?? [])
      .filter((a) => a.status !== 'CANCELLED')
      .filter((a) => dayjs(a.startAt).isSame(today, 'day'))
      .sort((a, b) => dayjs(a.startAt).valueOf() - dayjs(b.startAt).valueOf());
  }, [appointments]);

  const { data: patients = [], isLoading: patientsLoading } = useQuery({
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

  const { data: inventory, isLoading: inventoryLoading } = useQuery({
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
        gap: { xs: 2, sm: 2.5 },
        width: '100%',
      }}
    >
      {false && (
      <Card sx={{ flexShrink: 0 }}>
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
      )}

      <AppGrid
        columns={{ xs: 2, md: 4 }}
        gap={{ xs: 1.5, sm: 3 }}
        sx={{ flexShrink: 0 }}
      >
        {canSeeFinance ? (
          <SummaryCard
            label="Faturamento do mês"
            value={new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(summary?.totalIncome ?? 0)}
            hint={`Saldo: ${new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(summary?.balance ?? 0)}`}
            icon={<AuroraIcon name="money" size={19} />}
            color="success.main"
            to="/financeiro"
            loading={summaryLoading}
          />
        ) : (
          <SummaryCard
            label="Itens em baixa"
            value={String(lowStock)}
            hint="Abaixo do estoque mínimo"
            icon={<AuroraIcon name="estoque" size={19} />}
            color="warning.main"
            to={canSeeInventory ? '/estoque' : undefined}
            loading={inventoryLoading}
          />
        )}
        <SummaryCard
          label={restrictToOwnAppointments ? 'Meus agendamentos hoje' : 'Agendamentos hoje'}
          value={String(todayAppointments.length)}
          hint="Hoje"
          delta="—"
          icon={<AuroraIcon name="agenda" size={19} />}
          to={canSeeAgenda ? '/agenda' : undefined}
          loading={appointmentsLoading}
        />
        <SummaryCard
          label="Novos pacientes"
          value={String(patientsInPeriod.length)}
          hint="no mês"
          delta="—"
          icon={<AuroraIcon name="clientes" size={19} />}
          to={canSeePatients ? '/pacientes' : undefined}
          loading={patientsLoading}
        />
        <SummaryCard
          label="Taxa de ocupação"
          value="0%"
          hint="sem dados ainda"
          delta="—"
          icon={<AuroraIcon name="clock" size={19} />}
        />
      </AppGrid>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '1.6fr 1fr' },
          gap: { xs: 2, sm: 2.5 },
        }}
      >
        {/* Agenda da semana */}
        <Card sx={{ display: 'flex', flexDirection: 'column' }}>
          <CardContent sx={{ p: { xs: 2, sm: 2.75 } }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <Typography sx={{ fontSize: '1rem', fontWeight: 700 }}>Agenda para os próximos dias</Typography>
              {canSeeAgenda && (
                <Button size="small" component={RouterLink} to="/agenda" sx={{ fontWeight: 700 }}>
                  Ver tudo
                </Button>
              )}
            </Stack>
            {weekLoading ? (
              <Stack spacing={1.5}>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} variant="rounded" height={44} />
                ))}
              </Stack>
            ) : upcomingThisWeek.length === 0 ? (
              <DashboardEmptyState message="Sem agendamentos nesta semana." />
            ) : (
              <Stack spacing={0.5} sx={{ maxHeight: 260, overflowY: 'auto', pr: 0.5, mr: -0.5 }}>
                {upcomingThisWeek.map((a) => (
                  <Stack
                    key={a.id}
                    direction="row"
                    alignItems="center"
                    spacing={1.5}
                    onClick={() => {
                      if (!canSeeAgenda) return;
                      setEditingWeekAppt(a);
                      setWeekApptDialogOpen(true);
                    }}
                    sx={{
                      px: 1,
                      py: 1.25,
                      borderRadius: 2,
                      cursor: canSeeAgenda ? 'pointer' : 'default',
                      '&:hover': canSeeAgenda ? { bgcolor: 'grey.50' } : undefined,
                    }}
                  >
                    <Box sx={{ width: 46, flexShrink: 0, textAlign: 'center', lineHeight: 1.15 }}>
                      <Typography
                        sx={{
                          fontSize: '0.6rem',
                          fontWeight: 700,
                          color: 'text.secondary',
                          textTransform: 'uppercase',
                          letterSpacing: '0.4px',
                        }}
                      >
                        {dayjs(a.startAt).format('ddd')}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: '0.8rem',
                          fontWeight: 800,
                          color: 'text.primary',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {dayjs(a.startAt).format('HH:mm')}
                      </Typography>
                    </Box>
                    <Box sx={{ width: 3, height: 34, borderRadius: 3, bgcolor: 'primary.main', flexShrink: 0 }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography noWrap sx={{ fontSize: '0.85rem', fontWeight: 700 }}>
                        {a.patient?.name ?? 'Paciente'}
                      </Typography>
                      <Typography noWrap sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                        {[a.procedure?.name ?? 'Procedimento', a.professional?.name]
                          .filter(Boolean)
                          .join(' · ')}
                      </Typography>
                    </Box>
                    <Box
                      component="span"
                      sx={{
                        flexShrink: 0,
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        px: 1.25,
                        py: 0.5,
                        borderRadius: '8px',
                        whiteSpace: 'nowrap',
                        ...(AGENDA_PILL_SX[a.status] ?? AGENDA_PILL_SX.CANCELLED),
                      }}
                    >
                      {statusLabelDashboard[a.status as AppointmentStatus] ?? a.status}
                    </Box>
                  </Stack>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>

        {/* Metas do mês (novo — sem dados ainda) */}
        <Card sx={{ display: 'flex', flexDirection: 'column' }}>
          <CardContent sx={{ p: { xs: 2, sm: 2.75 } }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2.25 }}>
              <Typography sx={{ fontSize: '1rem', fontWeight: 700 }}>Metas do mês</Typography>
              <Chip
                label="Em breve"
                size="small"
                variant="outlined"
                sx={{ height: 22, fontSize: '0.68rem', fontWeight: 700 }}
              />
            </Stack>
            <Stack spacing={2}>
              {[
                { label: 'Faturamento', detail: 'Meta não definida' },
                { label: 'Novos pacientes', detail: 'Meta não definida' },
                { label: 'Taxa de ocupação', detail: 'Meta não definida' },
              ].map((m) => (
                <Box key={m.label}>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.75 }}>
                    <Typography sx={{ fontSize: '0.8125rem', fontWeight: 600 }}>{m.label}</Typography>
                    <Typography sx={{ fontSize: '0.8125rem', fontWeight: 800, color: 'text.secondary' }}>
                      0%
                    </Typography>
                  </Stack>
                  <Box sx={{ height: 8, borderRadius: 8, bgcolor: 'grey.100', overflow: 'hidden' }}>
                    <Box sx={{ height: '100%', width: '0%', borderRadius: 8, bgcolor: 'primary.main' }} />
                  </Box>
                  <Typography sx={{ display: 'block', fontSize: '0.72rem', color: 'text.secondary', mt: 0.75 }}>
                    {m.detail}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', lg: '1fr 1fr 1fr' },
          gap: { xs: 2, sm: 2.5 },
        }}
      >
        {/* Aniversariantes */}
        {canSeePatients && (
          <Card>
            <CardContent sx={{ p: { xs: 2, sm: 2.75 } }}>
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.75 }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '10px',
                    bgcolor: alpha(BIRTHDAY_ACCENT, 0.14),
                    color: BIRTHDAY_ACCENT,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <AuroraIcon name="gift" size={19} strokeWidth={1.7} />
                </Box>
                <Box sx={{ lineHeight: 1.2 }}>
                  <Typography sx={{ fontSize: '0.9375rem', fontWeight: 700 }}>Aniversariantes</Typography>
                  <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', fontWeight: 500 }}>
                    próximos {UPCOMING_BIRTHDAY_WINDOW_DAYS} dias
                  </Typography>
                </Box>
              </Stack>
              {patientsLoading ? (
                <Stack spacing={1}>
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} variant="rounded" height={44} />
                  ))}
                </Stack>
              ) : upcomingBirthdays.length === 0 ? (
                <DashboardEmptyState message="Nenhum aniversário neste período." />
              ) : (
                <Stack spacing={0.25}>
                  {upcomingBirthdays.map(({ patient, when, turnsAge, daysUntil }, idx) => {
                    const initials = patient.name
                      .trim()
                      .split(/\s+/)
                      .map((w) => w[0] ?? '')
                      .slice(0, 2)
                      .join('')
                      .toUpperCase();
                    const bdColor = BDAY_COLORS[idx % BDAY_COLORS.length];
                    return (
                      <Stack key={patient.id} direction="row" alignItems="center" spacing={1.5} sx={{ px: 0.5, py: 1 }}>
                        <Avatar
                          variant="rounded"
                          sx={{
                            width: 34,
                            height: 34,
                            borderRadius: '10px',
                            bgcolor: bdColor,
                            color: '#fff',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {initials}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography noWrap sx={{ fontSize: '0.8125rem', fontWeight: 700 }}>
                            {patient.name}
                          </Typography>
                          <Typography noWrap sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
                            {turnsAge} anos · {when.format('DD/MM')}
                          </Typography>
                        </Box>
                        <Box
                          component="span"
                          sx={{
                            flexShrink: 0,
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            px: 1.1,
                            py: '3px',
                            borderRadius: '7px',
                            whiteSpace: 'nowrap',
                            ...(daysUntil <= 3
                              ? { bgcolor: 'rgba(21,153,139,.14)', color: '#11A893' }
                              : { bgcolor: 'grey.100', color: 'text.secondary' }),
                          }}
                        >
                          {countdownBirthdayLabel(daysUntil)}
                        </Box>
                        {patient.phone?.trim() && (
                          <Tooltip title="Enviar mensagem no WhatsApp">
                            <IconButton
                              size="small"
                              onClick={() => setWhatsappPatient(patient)}
                              aria-label={`Enviar WhatsApp para ${patient.name}`}
                              sx={{ color: '#1DAE53', flexShrink: 0 }}
                            >
                              <WhatsAppIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    );
                  })}
                </Stack>
              )}
            </CardContent>
          </Card>
        )}

        {/* Contas a pagar */}
        {canSeeFinance && <UpcomingExpensesCard embedded />}

        {/* Datas comemorativas */}
        <UpcomingDatesCard embedded />
      </Box>

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

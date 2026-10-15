import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  IconButton,
  InputBase,
  MenuItem,
  Skeleton,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
  alpha,
  type SxProps,
  type Theme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SearchIcon from '@mui/icons-material/Search';
import ScheduleIcon from '@mui/icons-material/Schedule';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { Link as RouterLink } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs, { type Dayjs } from 'dayjs';
import 'dayjs/locale/pt-br';

import { matchFields, matchesActiveFilter, type ActiveFilter } from '../utils/listFilters';
import { recurringExpensesApi, type HourlyCostSettings } from '../api/recurring-expenses';
import { RecurringExpenseFormDialog } from '../components/finance/RecurringExpenseFormDialog';
import { useAppDialog } from '../contexts/AppDialogContext';
import { useAppToast } from '../contexts/AppToastContext';
import { getApiErrorMessage } from '../utils/apiError';
import type { RecurringExpense } from '../types';
import { fontSizes } from '../theme/fontSizes';
import { brl } from '../utils/money';

const hours = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });

const PAGE_SIZE = 8;
const TABLE_COLUMNS = '1.8fr .8fr .9fr 1fr 1fr .9fr .8fr 84px';
const UPCOMING_DAYS = 7;

const TOOLBAR_SELECT_SX = {
  flexShrink: 0,
  width: { xs: 'calc(50% - 5px)', sm: 'auto' },
  minWidth: { sm: 150 },
  '& .MuiOutlinedInput-root': {
    height: 38,
    borderRadius: '12px',
    fontSize: fontSizes.sm,
    bgcolor: 'background.paper',
  },
} as const;

const ACTION_BUTTON_SX = {
  width: 32,
  height: 32,
  borderRadius: '9px',
  border: 1,
  borderColor: 'divider',
  color: 'text.secondary',
} as const;

const CELL_LABEL_SX = {
  fontSize: fontSizes['2xs'],
  fontWeight: 700,
  color: 'text.disabled',
  textTransform: 'uppercase',
  letterSpacing: '.4px',
  mb: 1.25,
} as const;

/** Próximo vencimento a partir de hoje; dias 29–31 caem no último dia em meses mais curtos. */
function nextDueDate(dueDay: number): Dayjs {
  const today = dayjs().startOf('day');
  const inMonth = (month: Dayjs) => month.date(Math.min(dueDay, month.daysInMonth()));
  const thisMonth = inMonth(today.startOf('month'));
  return thisMonth.isBefore(today) ? inMonth(today.add(1, 'month').startOf('month')) : thisMonth;
}

function formatDue(date: Dayjs) {
  return date.locale('pt-br').format('DD MMM');
}

function dueInLabel(date: Dayjs) {
  const days = date.diff(dayjs().startOf('day'), 'day');
  if (days === 0) return 'hoje';
  if (days === 1) return 'amanhã';
  return `em ${days} dias`;
}

type Tone = 'primary' | 'warning' | 'success' | 'neutral';

const TONE_TEXT: Record<Tone, string> = {
  primary: 'primary.dark',
  warning: 'warning.dark',
  success: 'success.dark',
  neutral: 'text.secondary',
};

function toneBg(tone: Tone, opacity = 0.14) {
  return (t: Theme) => (tone === 'neutral' ? t.palette.grey[100] : alpha(t.palette[tone].main, opacity));
}

function SoftChip({ label, tone }: { label: string; tone: Tone }) {
  return (
    <Chip
      label={label}
      size="small"
      sx={{
        height: 24,
        fontSize: fontSizes['2xs'],
        fontWeight: 700,
        borderRadius: '8px',
        bgcolor: toneBg(tone),
        color: TONE_TEXT[tone],
      }}
    />
  );
}

function SummaryCard({ children, sx }: { children: ReactNode; sx?: SxProps<Theme> }) {
  return (
    <Card
      sx={{
        p: { xs: 2, sm: '18px 20px' },
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: 132,
        ...sx,
      }}
    >
      {children}
    </Card>
  );
}

function SummaryIcon({ children, tone }: { children: ReactNode; tone: 'primary' | 'warning' }) {
  return (
    <Box
      sx={{
        width: 34,
        height: 34,
        borderRadius: '10px',
        bgcolor: toneBg(tone, 0.12),
        color: `${tone}.main`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {children}
    </Box>
  );
}

export function RecurringExpensesPage() {
  const queryClient = useQueryClient();
  const { confirm } = useAppDialog();
  const toast = useAppToast();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'FIXED' | 'VARIABLE'>('ALL');
  const [page, setPage] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringExpense | null>(null);
  const [hourlyCostCollapsed, setHourlyCostCollapsed] = useState(false);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['recurring-expenses'],
    queryFn: () => recurringExpensesApi.list(),
  });

  const { data: hourlyCostSettings } = useQuery({
    queryKey: ['recurring-expenses', 'hourly-cost-settings'],
    queryFn: () => recurringExpensesApi.getHourlyCostSettings(),
  });

  const includeVariable = hourlyCostSettings?.includeVariable ?? false;

  const { data: hourlyCostSummary, isLoading: hourlyCostLoading } = useQuery({
    queryKey: ['recurring-expenses', 'hourly-cost-summary', includeVariable],
    queryFn: () => recurringExpensesApi.getHourlyCostSummary(includeVariable),
    enabled: hourlyCostSettings !== undefined,
    placeholderData: keepPreviousData,
  });

  const updateHourlySettingsMutation = useMutation({
    mutationFn: (value: boolean) => recurringExpensesApi.updateHourlyCostSettings(value),
    onMutate: async (value) => {
      await queryClient.cancelQueries({ queryKey: ['recurring-expenses', 'hourly-cost-settings'] });
      const previousSettings = queryClient.getQueryData<HourlyCostSettings>([
        'recurring-expenses',
        'hourly-cost-settings',
      ]);
      queryClient.setQueryData(['recurring-expenses', 'hourly-cost-settings'], { includeVariable: value });
      await queryClient.prefetchQuery({
        queryKey: ['recurring-expenses', 'hourly-cost-summary', value],
        queryFn: () => recurringExpensesApi.getHourlyCostSummary(value),
      });
      return { previousSettings };
    },
    onError: (_err, _value, context) => {
      if (context?.previousSettings) {
        queryClient.setQueryData(['recurring-expenses', 'hourly-cost-settings'], context.previousSettings);
      }
      toast.error('Não foi possível atualizar a configuração de custo/hora.');
    },
    onSuccess: (_data, value) => {
      void queryClient.prefetchQuery({
        queryKey: ['recurring-expenses', 'hourly-cost-summary', value],
        queryFn: () => recurringExpensesApi.getHourlyCostSummary(value),
      });
      queryClient.invalidateQueries({ queryKey: ['procedures'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => recurringExpensesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-expenses'] });
      toast.success('Despesa excluída.');
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Não foi possível excluir a despesa.'));
    },
  });

  const generateMutation = useMutation({
    mutationFn: () => recurringExpensesApi.generate(),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      if (result.generated === 0) {
        toast.info('Todos os lançamentos do mês já foram gerados.');
      } else {
        toast.success(
          `${result.generated} lançamento${result.generated > 1 ? 's' : ''} gerado${result.generated > 1 ? 's' : ''} para ${result.month}.`,
        );
      }
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Não foi possível gerar os lançamentos.'));
    },
  });

  const totalMonthly = useMemo(
    () => items.filter((i) => i.active).reduce((sum, i) => sum + Number(i.amount), 0),
    [items],
  );

  const activeFixedMonthly = useMemo(
    () =>
      items
        .filter((i) => i.active && i.expenseType === 'FIXED')
        .reduce((sum, i) => sum + Number(i.amount), 0),
    [items],
  );

  const activeVariableMonthly = useMemo(
    () =>
      items
        .filter((i) => i.active && i.expenseType === 'VARIABLE')
        .reduce((sum, i) => sum + Number(i.amount), 0),
    [items],
  );

  const expensesForHourlyRate = includeVariable
    ? activeFixedMonthly + activeVariableMonthly
    : activeFixedMonthly;

  const fixedPct = totalMonthly > 0 ? Math.round((activeFixedMonthly / totalMonthly) * 100) : 0;
  const variablePct = totalMonthly > 0 ? 100 - fixedPct : 0;

  const dueStats = useMemo(() => {
    const today = dayjs().startOf('day');
    const dates = items
      .filter((i) => i.active)
      .map((i) => nextDueDate(i.dueDay))
      .sort((a, b) => a.valueOf() - b.valueOf());
    return {
      activeCount: dates.length,
      upcoming: dates.filter((d) => d.diff(today, 'day') <= UPCOMING_DAYS).length,
      next: dates[0] ?? null,
    };
  }, [items]);

  const hourlyCostTooltip = useMemo(() => {
    if (!hourlyCostSummary) return null;
    const financeDiff = includeVariable
      ? Math.abs(hourlyCostSummary.financeExpensesMonthly - expensesForHourlyRate)
      : Math.abs(hourlyCostSummary.financeExpensesMonthly - activeFixedMonthly);
    const expenseLabel = includeVariable ? 'fixas + variáveis' : 'fixas';

    return (
      <Stack spacing={0.75} sx={{ maxWidth: 300, p: 0.25 }}>
        <Typography variant="caption" display="block">
          Total de despesas {expenseLabel} ativas no cadastro, dividido pela carga horária mensal do
          profissional principal ({hourlyCostSummary.monthlyHours} h).
        </Typography>
        {includeVariable && activeVariableMonthly > 0 && (
          <Typography variant="caption" display="block">
            Composição: fixas {brl.format(activeFixedMonthly)} + variáveis{' '}
            {brl.format(activeVariableMonthly)}.
          </Typography>
        )}
        <Typography variant="caption" display="block">
          Procedimentos usam as despesas lançadas no financeiro do mês atual, não este cadastro.
        </Typography>
        {financeDiff > 0.01 && (
          <Typography variant="caption" display="block">
            Financeiro (mês atual): {brl.format(hourlyCostSummary.financeExpensesMonthly)} em despesas{' '}
            {expenseLabel}.
          </Typography>
        )}
      </Stack>
    );
  }, [
    hourlyCostSummary,
    includeVariable,
    expensesForHourlyRate,
    activeFixedMonthly,
    activeVariableMonthly,
  ]);

  const filteredItems = useMemo(
    () =>
      items.filter((i) => {
        if (!matchesActiveFilter(i.active, activeFilter)) return false;
        if (typeFilter !== 'ALL' && i.expenseType !== typeFilter) return false;
        return matchFields(search, i.name, i.category, i.description);
      }),
    [items, search, activeFilter, typeFilter],
  );

  useEffect(() => setPage(0), [search, activeFilter, typeFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const rows = filteredItems.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  const handleEdit = (expense: RecurringExpense) => {
    setEditing(expense);
    setFormOpen(true);
  };

  const handleDelete = async (expense: RecurringExpense) => {
    const ok = await confirm({
      title: 'Excluir despesa',
      message: `Excluir "${expense.name}"?`,
      confirmLabel: 'Excluir',
      confirmColor: 'error',
    });
    if (ok) deleteMutation.mutate(expense.id);
  };

  const hourlyCostLabel = hourlyCostSummary ? brl.format(hourlyCostSummary.hourlyCost) : '—';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2, sm: 2.25 } }}>
      {/* Resumo */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1.5fr 1fr 1fr' },
          gap: { xs: 1.5, sm: 2.25 },
        }}
      >
        <SummaryCard sx={{ gridColumn: { sm: '1 / -1', md: 'auto' } }}>
          <Stack direction="row" alignItems="baseline" justifyContent="space-between" spacing={1}>
            <Typography sx={{ fontSize: fontSizes.sm, color: 'text.secondary', fontWeight: 600 }}>
              Total mensal recorrente
            </Typography>
            <Typography sx={{ fontSize: fontSizes.xs, color: 'text.disabled', fontWeight: 600 }}>
              {isLoading ? <Skeleton width={90} /> : `${brl.format(totalMonthly * 12)} / ano`}
            </Typography>
          </Stack>
          <Typography
            sx={{ fontSize: fontSizes['6xl'], fontWeight: 800, letterSpacing: '-.6px', mt: 0.75, mb: 1.75 }}
          >
            {isLoading ? <Skeleton width={180} /> : brl.format(totalMonthly)}
          </Typography>
          <Box sx={{ display: 'flex', height: 8, borderRadius: '6px', overflow: 'hidden', bgcolor: 'grey.100' }}>
            <Box sx={{ width: `${fixedPct}%`, bgcolor: 'primary.main', transition: 'width .3s' }} />
            <Box sx={{ width: `${variablePct}%`, bgcolor: 'warning.main', transition: 'width .3s' }} />
          </Box>
          <Stack direction="row" flexWrap="wrap" useFlexGap columnGap={2} rowGap={0.5} sx={{ mt: 1.25 }}>
            {[
              { label: 'Fixo', pct: fixedPct, value: activeFixedMonthly, color: 'primary.main' },
              { label: 'Variável', pct: variablePct, value: activeVariableMonthly, color: 'warning.main' },
            ].map((s) => (
              <Stack key={s.label} direction="row" alignItems="center" spacing={0.75}>
                <Box sx={{ width: 9, height: 9, borderRadius: '3px', bgcolor: s.color }} />
                <Typography sx={{ fontSize: fontSizes.xs, color: 'text.secondary', fontWeight: 600 }}>
                  {s.label} {s.pct}% · {brl.format(s.value)}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </SummaryCard>

        <SummaryCard>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography sx={{ fontSize: fontSizes.sm, color: 'text.secondary', fontWeight: 600 }}>
              Contas ativas
            </Typography>
            <SummaryIcon tone="primary">
              <ReceiptLongOutlinedIcon sx={{ fontSize: 18 }} />
            </SummaryIcon>
          </Stack>
          <Box>
            <Typography sx={{ fontSize: fontSizes['7xl'], fontWeight: 800, letterSpacing: '-.8px', lineHeight: 1.2 }}>
              {isLoading ? <Skeleton width={50} /> : dueStats.activeCount}
            </Typography>
            <Typography sx={{ fontSize: fontSizes.xs, color: 'text.disabled', fontWeight: 600 }}>
              despesas recorrentes em vigor
            </Typography>
          </Box>
        </SummaryCard>

        <SummaryCard
          sx={{
            border: 1,
            borderColor: (t) => alpha(t.palette.warning.main, 0.3),
            background: (t) => `linear-gradient(155deg, ${alpha(t.palette.warning.main, 0.14)}, ${t.palette.background.paper})`,
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography sx={{ fontSize: fontSizes.sm, color: 'warning.dark', fontWeight: 700 }}>
              Vencem em {UPCOMING_DAYS} dias
            </Typography>
            <SummaryIcon tone="warning">
              <ScheduleIcon sx={{ fontSize: 18 }} />
            </SummaryIcon>
          </Stack>
          <Box>
            <Typography
              sx={{ fontSize: fontSizes['7xl'], fontWeight: 800, letterSpacing: '-.8px', lineHeight: 1.2, color: 'warning.dark' }}
            >
              {isLoading ? <Skeleton width={50} /> : dueStats.upcoming}
            </Typography>
            <Typography sx={{ fontSize: fontSizes.xs, color: 'warning.dark', fontWeight: 600, opacity: 0.85 }}>
              {dueStats.next ? `próximo: ${formatDue(dueStats.next)}` : 'nenhum vencimento'}
            </Typography>
          </Box>
        </SummaryCard>
      </Box>

      {/* Custo por hora */}
      {hourlyCostLoading && !hourlyCostSummary ? (
        <Skeleton variant="rounded" height={220} sx={{ borderRadius: '18px' }} />
      ) : null}
      {hourlyCostSummary && (
        <Card sx={{ borderRadius: '18px', overflow: 'hidden' }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            flexWrap="wrap"
            useFlexGap
            gap={1.25}
            sx={{
              px: { xs: 2, sm: '22px' },
              py: '18px',
              borderBottom: hourlyCostCollapsed ? 0 : 1,
              borderColor: 'divider',
            }}
          >
            <Box sx={{ minWidth: 0, lineHeight: 1.3 }}>
              <Stack direction="row" alignItems="center" spacing={0.25}>
                <Typography sx={{ fontSize: fontSizes.xl, fontWeight: 700 }}>
                  Custo por hora operacional
                </Typography>
                {hourlyCostTooltip && (
                  <Tooltip title={hourlyCostTooltip} arrow placement="top-start">
                    <IconButton
                      size="small"
                      aria-label="Detalhes do cálculo de custo por hora"
                      sx={{ color: 'text.disabled' }}
                    >
                      <InfoOutlinedIcon sx={{ fontSize: 17 }} />
                    </IconButton>
                  </Tooltip>
                )}
              </Stack>
              <Typography sx={{ fontSize: fontSizes.sm, color: 'text.disabled' }}>
                Base de cálculo: {includeVariable ? 'custos fixos + variáveis ativos' : 'apenas custos fixos ativos'}
              </Typography>
            </Box>

            <Stack direction="row" alignItems="center" spacing={2}>
              {hourlyCostCollapsed ? (
                <Stack direction="row" alignItems="baseline" spacing={0.75}>
                  <Typography sx={{ fontSize: fontSizes['3xl'], fontWeight: 800, color: 'primary.dark', letterSpacing: '-.5px' }}>
                    {hourlyCostLabel}
                  </Typography>
                  <Typography sx={{ fontSize: fontSizes.xs, color: 'text.disabled', fontWeight: 600 }}>
                    / hora
                  </Typography>
                </Stack>
              ) : (
                <Tooltip
                  title="Inclui despesas variáveis ativas no custo/hora e no cálculo dos procedimentos."
                  arrow
                  placement="left"
                >
                  <Stack
                    component="label"
                    direction="row"
                    alignItems="center"
                    spacing={0.75}
                    sx={{ cursor: 'pointer', userSelect: 'none' }}
                  >
                    <Typography sx={{ fontSize: fontSizes.sm, fontWeight: 600, color: 'text.secondary', whiteSpace: 'nowrap' }}>
                      Incluir custos variáveis
                    </Typography>
                    <Switch
                      size="small"
                      checked={includeVariable}
                      onChange={(e) => updateHourlySettingsMutation.mutate(e.target.checked)}
                      inputProps={{ 'aria-label': 'Incluir despesas variáveis no cálculo' }}
                    />
                  </Stack>
                </Tooltip>
              )}
              <Tooltip title={hourlyCostCollapsed ? 'Expandir' : 'Minimizar'}>
                <IconButton
                  onClick={() => setHourlyCostCollapsed((v) => !v)}
                  aria-label={hourlyCostCollapsed ? 'Expandir custo por hora' : 'Minimizar custo por hora'}
                  sx={{ ...ACTION_BUTTON_SX, width: 34, height: 34, borderRadius: '10px', bgcolor: 'grey.50' }}
                >
                  {hourlyCostCollapsed ? (
                    <KeyboardArrowDownIcon fontSize="small" />
                  ) : (
                    <KeyboardArrowUpIcon fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>

          {!hourlyCostCollapsed && (
            <>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr 1fr', md: '1.1fr 1fr 1fr 1.2fr' },
                  '& > div': { px: { xs: 2, sm: '22px' }, py: '20px', minWidth: 0 },
                  '& > div:not(:last-of-type)': (t) => ({
                    borderBottom: `1px solid ${t.palette.grey[100]}`,
                    [t.breakpoints.up('md')]: { borderBottom: 0, borderRight: `1px solid ${t.palette.grey[100]}` },
                  }),
                }}
              >
                <Box>
                  <Typography sx={CELL_LABEL_SX}>Carga horária / mês</Typography>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Box
                      sx={{
                        height: 46,
                        minWidth: 90,
                        px: 1.75,
                        borderRadius: '11px',
                        border: 1,
                        borderColor: 'divider',
                        bgcolor: 'grey.50',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: fontSizes['2xl'],
                        fontWeight: 800,
                      }}
                    >
                      {hours.format(hourlyCostSummary.monthlyHours)}
                    </Box>
                    <Typography sx={{ fontSize: fontSizes.sm, color: 'text.disabled', fontWeight: 600 }}>
                      horas
                    </Typography>
                  </Stack>
                  <Typography sx={{ fontSize: fontSizes.xs, color: 'text.disabled', mt: 1 }} noWrap>
                    {hourlyCostSummary.primaryProfessional
                      ? `Agenda de ${hourlyCostSummary.primaryProfessional.name}`
                      : 'Sem profissional principal'}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={CELL_LABEL_SX}>Custo fixo / mês</Typography>
                  <Typography sx={{ fontSize: fontSizes['4xl'], fontWeight: 800, letterSpacing: '-.5px' }}>
                    {brl.format(activeFixedMonthly)}
                  </Typography>
                  <Typography sx={{ fontSize: fontSizes.xs, color: 'warning.main', fontWeight: 600, mt: 1 }}>
                    + variável: {brl.format(activeVariableMonthly)}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={CELL_LABEL_SX}>Base de cálculo</Typography>
                  <Typography sx={{ fontSize: fontSizes['4xl'], fontWeight: 800, letterSpacing: '-.5px' }}>
                    {brl.format(hourlyCostSummary.recurringExpensesMonthly)}
                  </Typography>
                  <Typography sx={{ fontSize: fontSizes.xs, color: 'text.disabled', fontWeight: 600, mt: 1 }}>
                    ÷ {hours.format(hourlyCostSummary.monthlyHours)} horas
                  </Typography>
                </Box>
                <Box
                  sx={{
                    bgcolor: (t) => alpha(t.palette.primary.main, 0.08),
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                  }}
                >
                  <Typography sx={{ ...CELL_LABEL_SX, color: 'primary.main', mb: 0.75 }}>
                    Custo por hora
                  </Typography>
                  <Typography sx={{ fontSize: fontSizes['7xl'], fontWeight: 800, color: 'primary.dark', letterSpacing: '-1px', lineHeight: 1.15 }}>
                    {hourlyCostLabel}
                  </Typography>
                </Box>
              </Box>

              <Stack
                direction={{ xs: 'column', md: 'row' }}
                alignItems={{ xs: 'stretch', md: 'center' }}
                justifyContent="space-between"
                gap={1.5}
                sx={{ px: { xs: 2, sm: '22px' }, py: '15px', borderTop: 1, borderColor: 'grey.100', bgcolor: 'grey.50' }}
              >
                <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
                  <InfoOutlinedIcon sx={{ fontSize: 16, color: 'primary.main' }} />
                  <Typography sx={{ fontSize: fontSizes.sm, color: 'text.secondary', fontWeight: 600 }}>
                    Procedimentos usam o financeiro do mês atual:{' '}
                    <Box component="b" sx={{ color: 'text.primary' }}>
                      {brl.format(hourlyCostSummary.financeExpensesMonthly)}
                    </Box>{' '}
                    em despesas {includeVariable ? 'fixas + variáveis' : 'fixas'}
                  </Typography>
                </Stack>
                {!hourlyCostSummary.primaryProfessional && (
                  <Alert severity="warning" sx={{ py: 0 }}>
                    Nenhum profissional principal cadastrado.{' '}
                    <Button component={RouterLink} to="/profissionais" size="small">
                      Configurar
                    </Button>
                  </Alert>
                )}
                {hourlyCostSummary.primaryProfessional && hourlyCostSummary.monthlyHours <= 0 && (
                  <Alert severity="warning" sx={{ py: 0 }}>
                    Sem horários de atendimento na agenda.{' '}
                    <Button component={RouterLink} to="/horarios" size="small">
                      Configurar horários
                    </Button>
                  </Alert>
                )}
              </Stack>
            </>
          )}
        </Card>
      )}

      {/* Lista */}
      <Card sx={{ borderRadius: '18px', overflow: 'hidden' }}>
        <Stack
          direction={{ xs: 'column', lg: 'row' }}
          alignItems={{ xs: 'stretch', lg: 'center' }}
          justifyContent="space-between"
          gap={1.5}
          sx={{ px: { xs: 2, sm: '22px' }, py: '18px', borderBottom: 1, borderColor: 'divider' }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: fontSizes.xl, fontWeight: 700 }}>Despesas fixas &amp; variáveis</Typography>
            <Typography sx={{ fontSize: fontSizes.xs, color: 'text.disabled', fontWeight: 600 }}>
              {filteredItems.length === items.length
                ? `${items.length} ${items.length === 1 ? 'despesa cadastrada' : 'despesas cadastradas'}`
                : `${filteredItems.length} de ${items.length} despesas`}
            </Typography>
          </Box>

          <Stack
            direction="row"
            alignItems="center"
            spacing={1.25}
            flexWrap={{ xs: 'wrap', md: 'nowrap' }}
            useFlexGap
            justifyContent={{ lg: 'flex-end' }}
            sx={{ minWidth: 0 }}
          >
            <TextField
              select
              size="small"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
              sx={TOOLBAR_SELECT_SX}
              inputProps={{ 'aria-label': 'Tipo' }}
            >
              <MenuItem value="ALL">Todos os tipos</MenuItem>
              <MenuItem value="FIXED">Fixa</MenuItem>
              <MenuItem value="VARIABLE">Variável</MenuItem>
            </TextField>
            <TextField
              select
              size="small"
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value as ActiveFilter)}
              sx={TOOLBAR_SELECT_SX}
              inputProps={{ 'aria-label': 'Status' }}
            >
              <MenuItem value="ALL">Todos os status</MenuItem>
              <MenuItem value="ACTIVE">Ativas</MenuItem>
              <MenuItem value="INACTIVE">Inativas</MenuItem>
            </TextField>
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{
                height: 38,
                px: 1.75,
                borderRadius: '12px',
                border: 1,
                borderColor: 'divider',
                bgcolor: 'grey.50',
                width: { xs: '100%', sm: 250 },
                minWidth: 0,
              }}
            >
              <SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
              <InputBase
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar despesa, categoria..."
                sx={{ fontSize: fontSizes.sm, flex: 1 }}
              />
            </Stack>
            <Button
              variant="outlined"
              startIcon={<AutorenewIcon />}
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              sx={{ flexShrink: 0, whiteSpace: 'nowrap', height: 38, px: 2, borderRadius: '12px' }}
            >
              {generateMutation.isPending ? 'Gerando...' : 'Gerar lançamentos do mês'}
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
              sx={{ flexShrink: 0, whiteSpace: 'nowrap', height: 38, px: 2.25, borderRadius: '12px', boxShadow: (t) => `0 6px 16px -6px ${t.palette.primary.main}` }}
            >
              Nova despesa
            </Button>
          </Stack>
        </Stack>

        {/* Cabeçalho da tabela */}
        <Box
          sx={{
            display: { xs: 'none', md: 'grid' },
            gridTemplateColumns: TABLE_COLUMNS,
            gap: 1.5,
            px: '22px',
            py: '13px',
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'grey.50',
            fontSize: fontSizes['2xs'],
            fontWeight: 700,
            color: 'text.disabled',
            letterSpacing: '.4px',
            textTransform: 'uppercase',
          }}
        >
          <span>Descrição</span>
          <span>Tipo</span>
          <span>Categoria</span>
          <span>Valor</span>
          <span>Periodicidade</span>
          <span>Próx. venc.</span>
          <span>Status</span>
          <span />
        </Box>

        {isLoading ? (
          <Stack spacing={0}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Box key={i} sx={{ px: '22px', py: 1.5, borderBottom: 1, borderColor: 'grey.100' }}>
                <Skeleton variant="rounded" height={34} />
              </Box>
            ))}
          </Stack>
        ) : filteredItems.length === 0 ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <ReceiptLongOutlinedIcon sx={{ fontSize: 46, color: 'text.disabled', mb: 1 }} />
            <Typography sx={{ fontWeight: 700 }}>
              {items.length === 0 ? 'Nenhuma despesa recorrente cadastrada' : 'Nenhuma despesa encontrada com os filtros'}
            </Typography>
            <Typography color="text.secondary" sx={{ fontSize: fontSizes.md, mt: 0.5 }}>
              {items.length === 0
                ? 'Cadastre aluguel, salários e contas do mês para calcular o custo por hora.'
                : 'Tente ajustar a busca ou os filtros.'}
            </Typography>
          </Box>
        ) : (
          rows.map((d) => {
            const isFixed = d.expenseType === 'FIXED';
            const generated = d._count?.generatedEntries ?? 0;
            const due = d.active ? nextDueDate(d.dueDay) : null;
            const typeChip = isFixed ? (
              <SoftChip label="Fixa" tone="primary" />
            ) : (
              <SoftChip label="Variável" tone="warning" />
            );
            const statusChip = d.active ? (
              <SoftChip label="Ativa" tone="success" />
            ) : (
              <SoftChip label="Inativa" tone="neutral" />
            );
            return (
              <Box
                key={d.id}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr auto', md: TABLE_COLUMNS },
                  gap: { xs: 1, md: 1.5 },
                  alignItems: 'center',
                  px: { xs: 2, sm: '22px' },
                  py: '14px',
                  borderBottom: 1,
                  borderColor: 'grey.100',
                  '& > :not(:last-child)': { opacity: d.active ? 1 : 0.6 },
                  '&:hover': { bgcolor: 'grey.50' },
                  '& > .md-only': { display: { xs: 'none', md: 'block' } },
                }}
              >
                <Box sx={{ minWidth: 0, lineHeight: 1.3 }}>
                  <Typography noWrap title={d.name} sx={{ fontSize: fontSizes.md, fontWeight: 700 }}>
                    {d.name}
                  </Typography>
                  <Typography noWrap sx={{ fontSize: fontSizes.xs, color: 'text.disabled' }}>
                    {d.description || '—'}
                  </Typography>
                  <Stack direction="row" spacing={0.75} sx={{ display: { xs: 'flex', md: 'none' }, mt: 0.75 }}>
                    {typeChip}
                    {statusChip}
                  </Stack>
                </Box>
                <Box className="md-only">{typeChip}</Box>
                <Typography className="md-only" noWrap sx={{ fontSize: fontSizes.sm, color: 'text.secondary', fontWeight: 600 }}>
                  {d.category || '—'}
                </Typography>
                <Box className="md-only" sx={{ minWidth: 0, lineHeight: 1.25 }}>
                  <Typography sx={{ fontSize: fontSizes.md, fontWeight: 800 }}>{brl.format(Number(d.amount))}</Typography>
                  <Typography sx={{ fontSize: fontSizes['3xs'], color: 'text.disabled' }}>
                    {generated} {generated === 1 ? 'lançamento gerado' : 'lançamentos gerados'}
                  </Typography>
                </Box>
                <Box className="md-only">
                  <SoftChip label={`Mensal · dia ${d.dueDay}`} tone="neutral" />
                </Box>
                <Box className="md-only" sx={{ lineHeight: 1.25 }}>
                  <Typography sx={{ fontSize: fontSizes.sm, color: 'text.secondary', fontWeight: 600 }}>
                    {due ? formatDue(due) : '—'}
                  </Typography>
                  {due && (
                    <Typography sx={{ fontSize: fontSizes['3xs'], color: 'text.disabled' }}>{dueInLabel(due)}</Typography>
                  )}
                </Box>
                <Box className="md-only">{statusChip}</Box>
                <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={0.75}>
                  <Box sx={{ display: { xs: 'block', md: 'none' }, textAlign: 'right', mr: 0.5 }}>
                    <Typography sx={{ fontSize: fontSizes.md, fontWeight: 800 }}>{brl.format(Number(d.amount))}</Typography>
                    <Typography sx={{ fontSize: fontSizes['3xs'], color: 'text.disabled' }}>
                      {due ? `vence ${formatDue(due)}` : `dia ${d.dueDay}`}
                    </Typography>
                  </Box>
                  <Tooltip title="Editar">
                    <IconButton aria-label={`Editar ${d.name}`} onClick={() => handleEdit(d)} sx={ACTION_BUTTON_SX}>
                      <EditIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Excluir">
                    <IconButton
                      aria-label={`Excluir ${d.name}`}
                      onClick={() => handleDelete(d)}
                      sx={{
                        ...ACTION_BUTTON_SX,
                        borderColor: (t) => alpha(t.palette.error.main, 0.35),
                        bgcolor: (t) => alpha(t.palette.error.main, 0.06),
                        color: 'error.main',
                        '&:hover': { bgcolor: (t) => alpha(t.palette.error.main, 0.12) },
                      }}
                    >
                      <DeleteIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Box>
            );
          })
        )}

        {/* Paginação */}
        {!isLoading && filteredItems.length > 0 && (
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            flexWrap="wrap"
            useFlexGap
            gap={1.5}
            sx={{ px: { xs: 2, sm: '22px' }, py: '14px' }}
          >
            <Typography sx={{ fontSize: fontSizes.sm, color: 'text.disabled', fontWeight: 600 }}>
              Mostrando {current * PAGE_SIZE + 1}–{Math.min((current + 1) * PAGE_SIZE, filteredItems.length)} de{' '}
              {filteredItems.length}
            </Typography>
            {pageCount > 1 && (
              <Stack direction="row" alignItems="center" spacing={0.875}>
                <IconButton
                  aria-label="Página anterior"
                  disabled={current === 0}
                  onClick={() => setPage(current - 1)}
                  sx={{ ...ACTION_BUTTON_SX, width: 36, height: 36, borderRadius: '10px' }}
                >
                  <ChevronLeftIcon fontSize="small" />
                </IconButton>
                {Array.from({ length: pageCount }).map((_, i) => {
                  const activePage = i === current;
                  return (
                    <Box
                      key={i}
                      component="button"
                      type="button"
                      onClick={() => setPage(i)}
                      sx={{
                        minWidth: 36,
                        height: 36,
                        px: 1,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        fontSize: fontSizes.sm,
                        fontWeight: 700,
                        borderRadius: '10px',
                        border: 1,
                        borderColor: activePage ? 'primary.main' : 'divider',
                        color: activePage ? '#fff' : 'text.secondary',
                        bgcolor: activePage ? 'primary.main' : 'background.paper',
                        '&:hover': { bgcolor: activePage ? 'primary.main' : 'grey.50' },
                      }}
                    >
                      {i + 1}
                    </Box>
                  );
                })}
                <IconButton
                  aria-label="Próxima página"
                  disabled={current >= pageCount - 1}
                  onClick={() => setPage(current + 1)}
                  sx={{ ...ACTION_BUTTON_SX, width: 36, height: 36, borderRadius: '10px' }}
                >
                  <ChevronRightIcon fontSize="small" />
                </IconButton>
              </Stack>
            )}
          </Stack>
        )}
      </Card>

      <RecurringExpenseFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        expense={editing}
      />
    </Box>
  );
}

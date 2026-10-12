import { useMemo, useState, type ReactNode } from 'react';
import {
  Box,
  Button,
  Card,
  Checkbox,
  IconButton,
  InputBase,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import HistoryIcon from '@mui/icons-material/History';
import SearchIcon from '@mui/icons-material/Search';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { formatDateOnlyFromApi } from '../utils/dateOnly';

import { matchFields } from '../utils/listFilters';
import { financeApi } from '../api/finance';
import { recurringExpensesApi } from '../api/recurring-expenses';
import { appointmentsBackfillFinance } from '../api/appointments';
import { FinanceFormDialog } from '../components/finance/FinanceFormDialog';
import { AuditHistoryDialog } from '../components/audit/AuditHistoryDialog';
import type { ExpenseType, FinancialEntry } from '../types';
import { useAppDialog } from '../contexts/AppDialogContext';
import { useAppToast } from '../contexts/AppToastContext';
import { getApiErrorMessage } from '../utils/apiError';
import { usePermissions } from '../contexts/usePermissions';
import { downloadCsv } from '../utils/csv';
import { fontSizes } from '../theme/fontSizes';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const PAGE_SIZE = 10;

const EXPENSE_TYPE_LABEL: Record<ExpenseType, string> = {
  FIXED: 'Fixa',
  VARIABLE: 'Variável',
};

const TOOLBAR_ICON_SX = {
  flexShrink: 0,
  width: 38,
  height: 38,
  borderRadius: '11px',
  border: 1,
  borderColor: 'divider',
  bgcolor: 'background.paper',
  color: 'text.secondary',
} as const;

const TOOLBAR_SELECT_SX = {
  height: 38,
  minWidth: 150,
  borderRadius: '11px',
  bgcolor: 'grey.50',
  fontSize: fontSizes.sm,
  fontWeight: 600,
  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
} as const;

const ROW_ICON_SX = {
  width: 30,
  height: 30,
  borderRadius: '9px',
  border: 1,
  borderColor: 'divider',
} as const;

/** Números das páginas com reticências quando há muitas (ex.: 1 … 4 5 6 … 12). */
function pageWindow(current: number, count: number): (number | null)[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i);
  const pages = new Set([0, count - 1, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 0 && p < count).sort((a, b) => a - b);
  return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1] > 1 ? [null, p] : [p]));
}

function Pill({ tone, children }: { tone: string; children: ReactNode }) {
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        fontSize: fontSizes.xs,
        fontWeight: 700,
        color: tone,
        bgcolor: alpha(tone, 0.13),
        px: 1,
        py: '2px',
        borderRadius: '7px',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </Box>
  );
}

interface KpiCardProps {
  label: string;
  tone: string;
  loading?: boolean;
  value: ReactNode;
  valueColor?: string;
  footer?: ReactNode;
  active?: boolean;
  onClick?: () => void;
}

function KpiCard({ label, tone, loading, value, valueColor, footer, active, onClick }: KpiCardProps) {
  return (
    <Card
      onClick={onClick}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        p: 2.5,
        borderRadius: '18px',
        border: 1,
        borderColor: active ? tone : 'divider',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color .15s, box-shadow .15s',
        ...(onClick && { '&:hover': { borderColor: alpha(tone, 0.6) } }),
      }}
    >
      <Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, bgcolor: tone }} />
      <Typography sx={{ fontSize: fontSizes.sm, fontWeight: 600, color: 'text.secondary', mb: 1.5 }}>
        {label}
      </Typography>
      {loading ? (
        <Skeleton width={140} height={36} sx={{ mb: 1 }} />
      ) : (
        <Typography
          sx={{
            fontSize: fontSizes['6xl'],
            fontWeight: 800,
            letterSpacing: '-0.8px',
            lineHeight: 1.15,
            color: valueColor ?? 'text.primary',
            mb: 1.25,
          }}
        >
          {value}
        </Typography>
      )}
      <Box sx={{ minHeight: 22 }}>{!loading && footer}</Box>
    </Card>
  );
}

interface TransactionRowProps {
  entry: FinancialEntry;
  onEdit: () => void;
  onDelete: () => void;
  onToggleInvoice: (issued: boolean) => void;
}

function TransactionRow({ entry, onEdit, onDelete, onToggleInvoice }: TransactionRowProps) {
  const theme = useTheme();
  const isIncome = entry.type === 'INCOME';
  const tone = isIncome ? theme.palette.success.main : theme.palette.error.main;
  const typeLabel = isIncome ? 'Receita' : 'Despesa';

  const details: string[] = [];
  if (!isIncome) {
    if (entry.expenseType) details.push(EXPENSE_TYPE_LABEL[entry.expenseType]);
  } else if (entry.appointmentId) {
    details.push('Agendamento');
  }

  const refDate = entry.paidAt ?? entry.dueDate;
  const dateLabel = refDate
    ? `${!entry.paidAt ? 'vence ' : ''}${formatDateOnlyFromApi(refDate)}`
    : null;
  const meta = [entry.category || typeLabel, ...details, dateLabel].filter(Boolean).join(' · ');

  const tooltip = [
    typeLabel,
    [...details, entry.recurringExpenseId ? 'Recorrente' : null].filter(Boolean).join(' · ') || null,
    entry.appointment?.procedure?.name ? `Procedimento: ${entry.appointment.procedure.name}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const margin = isIncome ? entry.profitMargin : null;
  const marginLow = margin != null && margin < 50;
  const marginTone = marginLow ? theme.palette.error.main : theme.palette.success.main;
  const net = isIncome && entry.netAmount != null ? Number(entry.netAmount) : null;
  const fee = entry.feePercent ? `${Number(entry.feePercent)}%` : '';
  const materialCost = isIncome ? entry.materialCost : null;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: { xs: 'wrap', md: 'nowrap' },
        columnGap: 1.75,
        rowGap: 1,
        minHeight: 68,
        px: { xs: 2, sm: 2.75 },
        py: 1.5,
        borderBottom: 1,
        borderColor: 'grey.100',
        transition: 'background .12s',
        '&:hover': { bgcolor: 'grey.50' },
      }}
    >
      <Box sx={{ flex: { xs: '1 1 100%', md: 1 }, minWidth: 0, lineHeight: 1.3 }}>
        <Tooltip title={tooltip} placement="top-start" arrow>
          <Typography noWrap sx={{ fontSize: fontSizes.md, fontWeight: 700, lineHeight: 1.35 }}>
            {entry.description}
          </Typography>
        </Tooltip>
        <Typography noWrap sx={{ fontSize: fontSizes.xs, color: 'text.disabled', lineHeight: 1.35 }}>
          {meta}
        </Typography>
      </Box>

      <Stack direction="row" spacing={0.75} sx={{ flexShrink: 0, width: { md: 190 } }}>
        {entry.recurringExpenseId && <Pill tone={theme.palette.warning.main}>Recorrente</Pill>}
        {entry.paymentMethod?.name && (
          <Box
            component="span"
            sx={{
              fontSize: fontSizes['2xs'],
              fontWeight: 700,
              px: 1.1,
              py: '3px',
              borderRadius: '7px',
              color: 'text.secondary',
              bgcolor: 'grey.100',
              whiteSpace: 'nowrap',
            }}
          >
            {entry.paymentMethod.name}
          </Box>
        )}
      </Stack>

      <Box sx={{ width: { md: 64 }, flexShrink: 0, textAlign: { md: 'right' } }}>
        {margin != null && (
          <Tooltip
            title={
              marginLow
                ? 'Margem abaixo de 50% — considere revisar o preço ou os custos. Calculada com a maior taxa de pagamento.'
                : 'Margem de lucro (materiais + despesas fixas + maior taxa de pagamento)'
            }
          >
            <Box component="span">
              <Pill tone={marginTone}>{margin.toFixed(1)}%</Pill>
            </Box>
          </Tooltip>
        )}
      </Box>

      <Box sx={{ width: { md: 62 }, flexShrink: 0 }}>
        {isIncome && (
          <Tooltip title={entry.invoiceIssued ? 'Nota emitida. Click para reabrir.' : 'Marcar nota como emitida'}>
            <Stack
              component="label"
              direction="row"
              alignItems="center"
              sx={{ cursor: 'pointer', color: entry.invoiceIssued ? 'success.main' : 'text.disabled' }}
            >
              <Checkbox
                size="small"
                checked={!!entry.invoiceIssued}
                onChange={(e) => onToggleInvoice(e.target.checked)}
                sx={{ p: 0.5 }}
              />
              <Typography sx={{ fontSize: fontSizes['2xs'], fontWeight: 700, color: 'inherit' }}>NF</Typography>
            </Stack>
          </Tooltip>
        )}
      </Box>

      <Box sx={{ width: { md: 190 }, flexShrink: 0, textAlign: 'right', ml: { xs: 'auto', md: 0 } }}>
        <Typography sx={{ fontSize: fontSizes.md, fontWeight: 800, color: tone, whiteSpace: 'nowrap' }}>
          {isIncome ? '+' : '−'} {brl.format(Number(entry.amount))}
        </Typography>
        {(net != null || materialCost != null) && (
          <Stack direction="row" spacing={0.75} justifyContent="flex-end">
            {net != null && (
              <Tooltip title={fee ? `Taxa: ${fee}` : ''}>
                <Typography sx={{ fontSize: fontSizes['2xs'], color: 'text.secondary', whiteSpace: 'nowrap' }}>
                  líq. {brl.format(net)}
                </Typography>
              </Tooltip>
            )}
            {materialCost != null && (
              <Tooltip title="Custo de materiais do procedimento">
                <Typography sx={{ fontSize: fontSizes['2xs'], color: 'text.disabled', whiteSpace: 'nowrap' }}>
                  mat. {brl.format(materialCost)}
                </Typography>
              </Tooltip>
            )}
          </Stack>
        )}
      </Box>

      <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
        <Tooltip title="Editar">
          <IconButton aria-label="Editar" onClick={onEdit} sx={{ ...ROW_ICON_SX, color: 'text.secondary' }}>
            <EditIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Excluir">
          <IconButton aria-label="Excluir" onClick={onDelete} sx={{ ...ROW_ICON_SX, color: 'error.main' }}>
            <DeleteIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </Stack>
    </Box>
  );
}

function PeriodField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Stack
      component="label"
      direction="row"
      alignItems="center"
      spacing={1}
      sx={{
        height: 38,
        pl: 1.5,
        pr: 1,
        borderRadius: '11px',
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        flexShrink: 0,
      }}
    >
      <Typography sx={{ fontSize: fontSizes.xs, fontWeight: 700, color: 'text.disabled' }}>{label}</Typography>
      <InputBase
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputProps={{ 'aria-label': label }}
        sx={{ fontSize: fontSizes.sm, fontWeight: 600, width: 128 }}
      />
    </Stack>
  );
}

function monthsInRange(from: string, to: string): { year: number; month: number }[] {
  const start = dayjs(from).startOf('month');
  const end = dayjs(to).startOf('month');
  if (!start.isValid() || !end.isValid()) {
    const now = dayjs();
    return [{ year: now.year(), month: now.month() + 1 }];
  }

  const months: { year: number; month: number }[] = [];
  let current = start;
  while (current.isBefore(end) || current.isSame(end, 'month')) {
    months.push({ year: current.year(), month: current.month() + 1 });
    current = current.add(1, 'month');
  }
  return months;
}


type TypeFilter = 'ALL' | 'INCOME' | 'EXPENSE';
type InvoiceFilter = 'ALL' | 'PENDING' | 'ISSUED';

export function Finance() {
  const queryClient = useQueryClient();
  const { confirm, alert } = useAppDialog();
  const toast = useAppToast();
  const { isAdmin } = usePermissions();
  const theme = useTheme();
  const [from, setFrom] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [to, setTo] = useState(dayjs().endOf('month').format('YYYY-MM-DD'));
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [invoiceFilter, setInvoiceFilter] = useState<InvoiceFilter>('ALL');
  const [page, setPage] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FinancialEntry | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const fromIso = useMemo(() => {
    const parsed = dayjs(from);
    return (parsed.isValid() ? parsed : dayjs().startOf('month')).startOf('day').toISOString();
  }, [from]);
  const toIso = useMemo(() => {
    const parsed = dayjs(to);
    return (parsed.isValid() ? parsed : dayjs().endOf('month')).endOf('day').toISOString();
  }, [to]);

  useQuery({
    queryKey: ['recurring-generate', from, to],
    queryFn: async () => {
      const months = monthsInRange(from, to);
      await Promise.all(
        months.map(({ year, month }) => recurringExpensesApi.generate(year, month)),
      );
      await queryClient.invalidateQueries({ queryKey: ['finance'] });
      await queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      await queryClient.invalidateQueries({ queryKey: ['finance-upcoming-expenses'] });
      return true;
    },
    staleTime: 60_000,
  });

  useQuery({
    queryKey: ['backfill-finance'],
    queryFn: async () => {
      const result = await appointmentsBackfillFinance();
      if (result.created > 0) {
        await queryClient.invalidateQueries({ queryKey: ['finance'] });
        await queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
        await queryClient.invalidateQueries({ queryKey: ['finance-upcoming-expenses'] });
      }
      return result;
    },
    staleTime: 5 * 60_000,
  });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['finance', fromIso, toIso],
    queryFn: () => financeApi.list(fromIso, toIso),
  });

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['finance-summary', fromIso, toIso],
    queryFn: () => financeApi.summary(fromIso, toIso),
  });

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      if (typeFilter !== 'ALL' && e.type !== typeFilter) return false;
      if (invoiceFilter === 'PENDING' && (e.type !== 'INCOME' || e.invoiceIssued)) return false;
      if (invoiceFilter === 'ISSUED' && (e.type !== 'INCOME' || !e.invoiceIssued)) return false;
      return matchFields(
        search,
        e.description,
        e.category,
        e.paymentMethod?.name,
        e.type === 'INCOME' ? 'receita' : 'despesa',
      );
    });
  }, [entries, typeFilter, invoiceFilter, search]);

  const pendingInvoices = useMemo(
    () => entries.filter((e) => e.type === 'INCOME' && !e.invoiceIssued).length,
    [entries],
  );

  const profit = (summary?.balance ?? 0);
  const profitMarginPct = useMemo(() => {
    const income = summary?.totalIncome ?? 0;
    if (income <= 0) return null;
    return (profit / income) * 100;
  }, [summary?.totalIncome, profit]);

const deleteMutation = useMutation({
    mutationFn: (id: string) => financeApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      toast.success('Lançamento excluído.');
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Não foi possível excluir o lançamento.'));
    },
  });

  const invoiceMutation = useMutation({
    mutationFn: ({ id, issued }: { id: string; issued: boolean }) =>
      financeApi.setInvoiceIssued(id, issued),
    onSuccess: (_data, { issued }) => {
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      toast.success(issued ? 'Nota fiscal marcada como emitida.' : 'Nota fiscal desmarcada.');
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Não foi possível atualizar a nota fiscal.'));
    },
  });

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const rows = filtered.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  const expenseCount = useMemo(() => entries.filter((e) => e.type === 'EXPENSE').length, [entries]);

  const handleEdit = (entry: FinancialEntry) => {
    setEditing(entry);
    setFormOpen(true);
  };

  const handleDelete = async (entry: FinancialEntry) => {
    const ok = await confirm({
      title: 'Excluir lançamento',
      message: 'Excluir este lançamento?',
      confirmLabel: 'Excluir',
      confirmColor: 'error',
    });
    if (ok) deleteMutation.mutate(entry.id);
  };

  const exportPeriodCsv = async () => {
    if (entries.length === 0) {
      await alert({
        title: 'Exportar',
        message: 'Nenhum lançamento no período para exportar.',
        severity: 'info',
      });
      return;
    }

    const filename = `financeiro-${dayjs(from).format('YYYY-MM-DD')}_${dayjs(to).format('YYYY-MM-DD')}.csv`;
    downloadCsv(
      filename,
      entries.map((e) => {
        const refDate = e.paidAt ?? e.dueDate;
        return {
          Data: refDate ? formatDateOnlyFromApi(refDate) : '',
          Tipo: e.type === 'INCOME' ? 'Receita' : 'Despesa',
          Descrição: e.description,
          Categoria: e.category ?? '',
          'Forma de pagamento': e.paymentMethod?.name ?? '',
          Valor: Number(e.amount).toFixed(2),
          'Data pagamento': e.paidAt ? formatDateOnlyFromApi(e.paidAt) : '',
          Vencimento: e.dueDate ? formatDateOnlyFromApi(e.dueDate) : '',
          'Nota emitida':
            e.type === 'INCOME' ? (e.invoiceIssued ? 'Sim' : 'Não') : '',
          Recorrente: e.recurringExpenseId ? 'Sim' : 'Não',
        };
      }),
      [
        'Data',
        'Tipo',
        'Descrição',
        'Categoria',
        'Forma de pagamento',
        'Valor',
        'Data pagamento',
        'Vencimento',
        'Nota emitida',
        'Recorrente',
      ],
    );
  };

  return (
    <Box>
      <Stack spacing={2.25} sx={{ maxWidth: 1320, mx: 'auto' }}>
        {/* Resumo do período + ações */}
        <Stack
          direction={{ xs: 'column', lg: 'row' }}
          alignItems={{ xs: 'stretch', lg: 'center' }}
          justifyContent="space-between"
          spacing={1.5}
        >
          <Typography sx={{ fontSize: fontSizes.md, color: 'text.secondary', fontWeight: 600 }}>
            {isLoading ? (
              <Skeleton width={260} />
            ) : (
              <>
                <Box component="span" sx={{ color: 'text.primary', fontWeight: 800 }}>
                  {entries.length}
                </Box>{' '}
                {entries.length === 1 ? 'lançamento no período' : 'lançamentos no período'}
                {'  ·  '}
                <Box component="span" sx={{ color: 'text.primary', fontWeight: 800 }}>
                  {pendingInvoices}
                </Box>{' '}
                {pendingInvoices === 1 ? 'nota pendente' : 'notas pendentes'}
              </>
            )}
          </Typography>

          <Stack
            direction="row"
            alignItems="center"
            spacing={1.25}
            flexWrap="wrap"
            useFlexGap
            justifyContent={{ lg: 'flex-end' }}
          >
            <PeriodField
              label="De"
              value={from}
              onChange={(v) => {
                setFrom(v);
                setPage(0);
              }}
            />
            <PeriodField
              label="Até"
              value={to}
              onChange={(v) => {
                setTo(v);
                setPage(0);
              }}
            />
            {isAdmin && (
              <Tooltip title="Histórico de alterações">
                <IconButton onClick={() => setHistoryOpen(true)} sx={TOOLBAR_ICON_SX}>
                  <HistoryIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
              sx={{
                flexShrink: 0,
                whiteSpace: 'nowrap',
                height: 38,
                px: 2.25,
                borderRadius: '12px',
                boxShadow: (t) => `0 6px 16px -6px ${t.palette.primary.main}`,
              }}
            >
              Novo lançamento
            </Button>
          </Stack>
        </Stack>

        {/* Indicadores */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
            gap: { xs: 1.5, md: 2.25 },
          }}
        >
          <KpiCard
            label="Receitas"
            tone={theme.palette.success.main}
            loading={summaryLoading}
            value={brl.format(summary?.totalIncome ?? 0)}
            footer={
              summary?.totalFees != null && summary.totalFees > 0 ? (
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Pill tone={theme.palette.success.main}>
                    Líquido {brl.format(summary.totalNetIncome ?? 0)}
                  </Pill>
                  <Typography sx={{ fontSize: fontSizes.xs, color: 'text.disabled', fontWeight: 600 }}>
                    Taxas {brl.format(summary.totalFees)}
                  </Typography>
                </Stack>
              ) : null
            }
          />
          <KpiCard
            label="Despesas"
            tone={theme.palette.error.main}
            loading={summaryLoading}
            value={brl.format(summary?.totalExpense ?? 0)}
            footer={
              <Pill tone={theme.palette.error.main}>
                {expenseCount} {expenseCount === 1 ? 'lançamento' : 'lançamentos'}
              </Pill>
            }
          />
          <KpiCard
            label="Lucro"
            tone={profit >= 0 ? theme.palette.success.main : theme.palette.error.main}
            loading={summaryLoading}
            value={brl.format(profit)}
            valueColor={profit < 0 ? 'error.main' : undefined}
            footer={
              profitMarginPct != null ? (
                <Pill tone={profitMarginPct >= 0 ? theme.palette.success.main : theme.palette.error.main}>
                  Margem {profitMarginPct.toFixed(1)}%
                </Pill>
              ) : null
            }
          />
          <Tooltip title="Click para filtrar notas pendentes" arrow>
            <Box>
              <KpiCard
                label="Notas pendentes"
                tone={theme.palette.warning.main}
                loading={isLoading}
                value={pendingInvoices}
                active={invoiceFilter === 'PENDING'}
                onClick={() => {
                  setInvoiceFilter('PENDING');
                  setPage(0);
                }}
                footer={
                  <Pill tone={theme.palette.warning.main}>
                    {invoiceFilter === 'PENDING' ? 'Filtro aplicado' : 'Ver pendentes'}
                  </Pill>
                }
              />
            </Box>
          </Tooltip>
        </Box>

        {/* Transações */}
        <Card sx={{ borderRadius: '18px', border: 1, borderColor: 'divider', overflow: 'hidden' }}>
          <Stack
            direction={{ xs: 'column', lg: 'row' }}
            alignItems={{ xs: 'stretch', lg: 'center' }}
            justifyContent="space-between"
            spacing={1.5}
            sx={{ px: { xs: 2, sm: 2.75 }, py: 2.25, borderBottom: 1, borderColor: 'divider' }}
          >
            <Typography component="h3" sx={{ fontSize: fontSizes.xl, fontWeight: 700 }}>
              Transações
            </Typography>

            <Stack
              direction="row"
              alignItems="center"
              spacing={1.25}
              flexWrap="wrap"
              useFlexGap
              justifyContent={{ lg: 'flex-end' }}
            >
              <Stack
                direction="row"
                alignItems="center"
                spacing={1.1}
                sx={{
                  height: 38,
                  px: 1.6,
                  borderRadius: '11px',
                  border: 1,
                  borderColor: 'divider',
                  bgcolor: 'grey.50',
                  width: { xs: '100%', sm: 260 },
                }}
              >
                <SearchIcon sx={{ fontSize: 17, color: 'text.disabled' }} />
                <InputBase
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(0);
                  }}
                  placeholder="Buscar lançamento..."
                  inputProps={{ 'aria-label': 'Buscar por descrição, categoria ou forma de pagamento' }}
                  sx={{ fontSize: fontSizes.sm, flex: 1, minWidth: 0 }}
                />
              </Stack>
              <Select
                size="small"
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value as TypeFilter);
                  setPage(0);
                }}
                inputProps={{ 'aria-label': 'Tipo' }}
                sx={TOOLBAR_SELECT_SX}
              >
                <MenuItem value="ALL">Todos os tipos</MenuItem>
                <MenuItem value="INCOME">Receitas</MenuItem>
                <MenuItem value="EXPENSE">Despesas</MenuItem>
              </Select>
              <Select
                size="small"
                value={invoiceFilter}
                onChange={(e) => {
                  setInvoiceFilter(e.target.value as InvoiceFilter);
                  setPage(0);
                }}
                inputProps={{ 'aria-label': 'Nota' }}
                sx={TOOLBAR_SELECT_SX}
              >
                <MenuItem value="ALL">Todas as notas</MenuItem>
                <MenuItem value="PENDING">Notas pendentes</MenuItem>
                <MenuItem value="ISSUED">Notas emitidas</MenuItem>
              </Select>
              <Button
                variant="text"
                onClick={exportPeriodCsv}
                sx={{ flexShrink: 0, whiteSpace: 'nowrap', fontSize: fontSizes.sm, fontWeight: 700 }}
              >
                Exportar período
              </Button>
            </Stack>
          </Stack>

          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Box key={i} sx={{ px: 2.75, py: 1.5, borderBottom: 1, borderColor: 'grey.100' }}>
                <Skeleton height={36} />
              </Box>
            ))
          ) : rows.length === 0 ? (
            <Box sx={{ py: 7, textAlign: 'center' }}>
              <ReceiptLongOutlinedIcon sx={{ fontSize: 46, color: 'text.disabled', mb: 1 }} />
              <Typography sx={{ fontWeight: 700 }}>
                {entries.length === 0 ? 'Nenhum lançamento no período' : 'Nenhum lançamento encontrado com os filtros'}
              </Typography>
              <Typography color="text.secondary" sx={{ fontSize: fontSizes.md, mt: 0.5 }}>
                {entries.length === 0 ? 'Ajuste o período ou registre um novo lançamento.' : 'Tente ajustar a busca ou os filtros.'}
              </Typography>
            </Box>
          ) : (
            rows.map((entry) => (
              <TransactionRow
                key={entry.id}
                entry={entry}
                onEdit={() => handleEdit(entry)}
                onDelete={() => handleDelete(entry)}
                onToggleInvoice={(issued) => invoiceMutation.mutate({ id: entry.id, issued })}
              />
            ))
          )}

          {!isLoading && filtered.length > 0 && (
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              flexWrap="wrap"
              useFlexGap
              spacing={1.5}
              sx={{ px: { xs: 2, sm: 2.75 }, py: 1.75 }}
            >
              <Typography sx={{ fontSize: fontSizes.sm, color: 'text.disabled', fontWeight: 600 }}>
                Mostrando {current * PAGE_SIZE + 1}–{Math.min((current + 1) * PAGE_SIZE, filtered.length)} de{' '}
                {filtered.length} {filtered.length === 1 ? 'lançamento' : 'lançamentos'}
                {filtered.length !== entries.length && ` (de ${entries.length})`}
              </Typography>
              {pageCount > 1 && (
                <Stack direction="row" spacing={0.9} alignItems="center">
                  <IconButton
                    size="small"
                    aria-label="Página anterior"
                    disabled={current === 0}
                    onClick={() => setPage(current - 1)}
                    sx={{ width: 34, height: 34, border: 1, borderColor: 'divider', borderRadius: '9px' }}
                  >
                    <ChevronLeftIcon fontSize="small" />
                  </IconButton>
                  {pageWindow(current, pageCount).map((p, i) =>
                    p == null ? (
                      <Typography key={`gap-${i}`} sx={{ color: 'text.disabled', px: 0.25 }}>
                        …
                      </Typography>
                    ) : (
                      <Box
                        key={p}
                        component="button"
                        type="button"
                        onClick={() => setPage(p)}
                        aria-current={p === current ? 'page' : undefined}
                        sx={{
                          minWidth: 34,
                          height: 34,
                          px: 0.75,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          fontSize: fontSizes.sm,
                          fontWeight: 700,
                          borderRadius: '9px',
                          border: 1,
                          borderColor: p === current ? 'primary.main' : 'divider',
                          color: p === current ? '#fff' : 'text.secondary',
                          bgcolor: p === current ? 'primary.main' : 'background.paper',
                          '&:hover': { bgcolor: p === current ? 'primary.main' : 'grey.50' },
                        }}
                      >
                        {p + 1}
                      </Box>
                    ),
                  )}
                  <IconButton
                    size="small"
                    aria-label="Próxima página"
                    disabled={current >= pageCount - 1}
                    onClick={() => setPage(current + 1)}
                    sx={{ width: 34, height: 34, border: 1, borderColor: 'divider', borderRadius: '9px' }}
                  >
                    <ChevronRightIcon fontSize="small" />
                  </IconButton>
                </Stack>
              )}
            </Stack>
          )}
        </Card>
      </Stack>

      <FinanceFormDialog open={formOpen} onClose={() => setFormOpen(false)} entry={editing} />
      <AuditHistoryDialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        entity="FinancialEntry"
        title="Financeiro"
      />
    </Box>
  );
}

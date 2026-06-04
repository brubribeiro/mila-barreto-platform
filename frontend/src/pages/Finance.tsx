import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import ReceiptIcon from '@mui/icons-material/Receipt';
import ShowChartOutlinedIcon from '@mui/icons-material/ShowChartOutlined';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { formatDateOnlyFromApi } from '../utils/dateOnly';

import { PageHeader } from '../components/PageHeader';
import { ListFiltersBar } from '../components/ListFiltersBar';
import { AppDataGrid } from '../components/AppDataGrid';
import { matchFields } from '../utils/listFilters';
import { financeApi } from '../api/finance';
import { recurringExpensesApi } from '../api/recurring-expenses';
import { appointmentsBackfillFinance } from '../api/appointments';
import { FinanceFormDialog } from '../components/finance/FinanceFormDialog';
import type { FinancialEntry } from '../types';
import { useAppDialog } from '../contexts/AppDialogContext';
import { downloadCsv } from '../utils/csv';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

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
  const [from, setFrom] = useState(dayjs().startOf('month').format('YYYY-MM-DD'));
  const [to, setTo] = useState(dayjs().endOf('month').format('YYYY-MM-DD'));
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [invoiceFilter, setInvoiceFilter] = useState<InvoiceFilter>('ALL');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FinancialEntry | null>(null);

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
      return true;
    },
    staleTime: 60_000,
  });

  // Gera receitas retroativas de agendamentos concluídos que ainda não têm lançamento
  useQuery({
    queryKey: ['backfill-finance'],
    queryFn: async () => {
      const result = await appointmentsBackfillFinance();
      if (result.created > 0) {
        await queryClient.invalidateQueries({ queryKey: ['finance'] });
        await queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      }
      return result;
    },
    staleTime: 5 * 60_000,
  });

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['finance', fromIso, toIso],
    queryFn: () => financeApi.list(fromIso, toIso),
  });

  const { data: summary } = useQuery({
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
    },
  });

  const invoiceMutation = useMutation({
    mutationFn: ({ id, issued }: { id: string; issued: boolean }) =>
      financeApi.setInvoiceIssued(id, issued),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['finance'] }),
  });

  const columns = useMemo<GridColDef<FinancialEntry>[]>(
    () => [
      {
        field: 'paidAt',
        headerName: 'Data',
        flex: 0.55,
        minWidth: 130,
        renderCell: (params) => {
          const date = params.row.paidAt ?? params.row.dueDate;
          if (!date) return '—';
          return (
            <Stack spacing={0.25}>
              <Typography variant="body2">{formatDateOnlyFromApi(date)}</Typography>
              {!params.row.paidAt && params.row.dueDate && (
                <Typography variant="caption" color="text.secondary">
                  vencimento
                </Typography>
              )}
            </Stack>
          );
        },
      },
      {
        field: 'type',
        headerName: 'Tipo',
        flex: 0.55,
        minWidth: 120,
        renderCell: (params) => (
          <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
            {params.value === 'INCOME' ? (
              <Chip size="small" label="Receita" color="success" variant="outlined" />
            ) : (
              <Chip size="small" label="Despesa" color="error" variant="outlined" />
            )}
            {params.row.recurringExpenseId && (
              <Chip size="small" label="Recorrente" color="info" variant="outlined" />
            )}
          </Stack>
        ),
      },
      { field: 'description', headerName: 'Descrição', flex: 1.3, minWidth: 200 },
      {
        field: 'category',
        headerName: 'Categoria',
        flex: 0.7,
        minWidth: 120,
        valueGetter: (params) => params.row.category ?? '—',
      },
      {
        field: 'paymentMethod',
        headerName: 'Forma',
        flex: 0.6,
        minWidth: 110,
        valueGetter: (params) =>
          params.row.paymentMethod?.name ?? '—',
      },
      {
        field: 'amount',
        headerName: 'Bruto',
        flex: 0.55,
        minWidth: 110,
        align: 'right',
        headerAlign: 'right',
        renderCell: (params) => (
          <Typography
            variant="body2"
            fontWeight={600}
            color={params.row.type === 'INCOME' ? 'success.main' : 'error.main'}
          >
            {params.row.type === 'INCOME' ? '+' : '-'} {brl.format(Number(params.row.amount))}
          </Typography>
        ),
      },
      {
        field: 'materialCost',
        headerName: 'Custo Mat.',
        flex: 0.55,
        minWidth: 110,
        align: 'right',
        headerAlign: 'right',
        renderCell: (params) => {
          const cost = params.row.materialCost;
          if (cost == null || params.row.type !== 'INCOME') return '—';
          return (
            <Tooltip title="Custo de materiais do procedimento">
              <Typography variant="body2" fontWeight={500} color="text.secondary">
                {brl.format(cost)}
              </Typography>
            </Tooltip>
          );
        },
      },
      {
        field: 'profitMargin',
        headerName: 'Margem',
        flex: 0.5,
        minWidth: 100,
        align: 'right',
        headerAlign: 'right',
        renderCell: (params) => {
          const margin = params.row.profitMargin;
          if (margin == null || params.row.type !== 'INCOME') return '—';
          const isLow = margin < 50;
          return (
            <Tooltip
              title={
                isLow
                  ? 'Margem abaixo de 50% — considere revisar o preço ou os custos. Calculada com a maior taxa de pagamento.'
                  : 'Margem de lucro (materiais + despesas fixas + maior taxa de pagamento)'
              }
            >
              <Chip
                size="small"
                label={`${margin.toFixed(1)}%`}
                color={isLow ? 'error' : 'success'}
                variant="outlined"
                sx={{ fontWeight: 600 }}
              />
            </Tooltip>
          );
        },
      },
      {
        field: 'netAmount',
        headerName: 'Líquido',
        flex: 0.55,
        minWidth: 110,
        align: 'right',
        headerAlign: 'right',
        renderCell: (params) => {
          if (params.row.type !== 'INCOME' || params.row.netAmount == null) return '—';
          const fee = params.row.feePercent ? `${Number(params.row.feePercent)}%` : '';
          return (
            <Tooltip title={fee ? `Taxa: ${fee}` : ''}>
              <Typography variant="body2" fontWeight={500} color="text.secondary">
                {brl.format(Number(params.row.netAmount))}
              </Typography>
            </Tooltip>
          );
        },
      },
      {
        field: 'invoiceIssued',
        headerName: 'Nota',
        flex: 0.5,
        minWidth: 110,
        renderCell: (params) => {
          if (params.row.type !== 'INCOME') return <span>—</span>;
          return (
            <Tooltip
              title={
                params.row.invoiceIssued
                  ? 'Nota emitida. Click para reabrir.'
                  : 'Marcar nota como emitida'
              }
            >
              <Checkbox
                size="small"
                checked={!!params.row.invoiceIssued}
                onChange={(e) =>
                  invoiceMutation.mutate({ id: params.row.id, issued: e.target.checked })
                }
              />
            </Tooltip>
          );
        },
      },
      {
        field: 'actions',
        type: 'actions',
        headerName: '',
        width: 80,
        getActions: (params) => [
          <GridActionsCellItem
            key="edit"
            icon={
              <Tooltip title="Editar">
                <EditIcon fontSize="small" />
              </Tooltip>
            }
            label="Editar"
            onClick={() => {
              setEditing(params.row);
              setFormOpen(true);
            }}
          />,
          <GridActionsCellItem
            key="delete"
            icon={
              <Tooltip title="Excluir">
                <DeleteIcon fontSize="small" />
              </Tooltip>
            }
            label="Excluir"
            onClick={async () => {
              const ok = await confirm({
                title: 'Excluir lançamento',
                message: 'Excluir este lançamento?',
                confirmLabel: 'Excluir',
                confirmColor: 'error',
              });
              if (ok) deleteMutation.mutate(params.row.id);
            }}
          />,
        ],
      },
    ],
    [confirm, deleteMutation, invoiceMutation],
  );

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
      <PageHeader
        title="Financeiro"
        subtitle="Receitas, despesas, fluxo de caixa e notas de serviço"
        action={
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={exportPeriodCsv}>
              Exportar período
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              Novo lançamento
            </Button>
          </Stack>
        }
      />

      <Grid container spacing={{ xs: 1.5, sm: 3 }} sx={{ mb: 1 }} alignItems="stretch">
        <Grid item xs={6} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                  Receitas
                </Typography>
                <TrendingUpIcon sx={{ color: 'success.main' }} />
              </Stack>
              <Typography variant="h4" fontWeight={700} color="success.main">
                {brl.format(summary?.totalIncome ?? 0)}
              </Typography>
              {summary?.totalFees != null && summary.totalFees > 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  Líquido: {brl.format(summary.totalNetIncome ?? 0)} · Taxas: {brl.format(summary.totalFees)}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                  Despesas
                </Typography>
                <TrendingDownIcon sx={{ color: 'error.main' }} />
              </Stack>
              <Typography variant="h4" fontWeight={700} color="error.main">
                {brl.format(summary?.totalExpense ?? 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                  Lucro
                </Typography>
                <ShowChartOutlinedIcon sx={{ color: profit >= 0 ? 'success.main' : 'error.main' }} />
              </Stack>
              <Typography
                variant="h4"
                fontWeight={700}
                color={profit >= 0 ? 'success.main' : 'error.main'}
              >
                {brl.format(profit)}
              </Typography>
              {profitMarginPct != null && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  Margem: {profitMarginPct.toFixed(1)}%
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={6} md={3}>
          <Tooltip title="Click para filtrar notas pendentes" arrow>
            <Box sx={{ height: '100%' }}>
              <Card
                sx={{ height: '100%', cursor: 'pointer' }}
                onClick={() => setInvoiceFilter('PENDING')}
              >
                <CardContent>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                    <Typography variant="body2" color="text.secondary" fontWeight={500}>
                      Notas pendentes
                    </Typography>
                    <ReceiptIcon sx={{ color: 'warning.main' }} />
                  </Stack>
                  <Typography variant="h4" fontWeight={700} color="warning.main">
                    {pendingInvoices}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </Tooltip>
        </Grid>
      </Grid>

      <Card sx={{ p: { xs: 1.5, sm: 2 } }}>
        <ListFiltersBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar por descrição, categoria ou forma de pagamento"
          filteredCount={filtered.length}
          totalCount={entries.length}
          countLabel={filtered.length === 1 ? 'lançamento' : 'lançamentos'}
        >
          <TextField
            size="small"
            type="date"
            label="De"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ flex: { xs: '1 1 calc(50% - 4px)', sm: '0 0 auto' }, minWidth: { sm: 150 } }}
          />
          <TextField
            size="small"
            type="date"
            label="Até"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ flex: { xs: '1 1 calc(50% - 4px)', sm: '0 0 auto' }, minWidth: { sm: 150 } }}
          />
          <TextField
            size="small"
            select
            label="Tipo"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
            sx={{ flex: { xs: '1 1 calc(50% - 4px)', sm: '0 0 auto' }, minWidth: { xs: 100, sm: 130 } }}
          >
            <MenuItem value="ALL">Todos</MenuItem>
            <MenuItem value="INCOME">Receitas</MenuItem>
            <MenuItem value="EXPENSE">Despesas</MenuItem>
          </TextField>
          <TextField
            size="small"
            select
            label="Nota"
            value={invoiceFilter}
            onChange={(e) => setInvoiceFilter(e.target.value as InvoiceFilter)}
            sx={{ flex: { xs: '1 1 calc(50% - 4px)', sm: '0 0 auto' }, minWidth: { xs: 100, sm: 150 } }}
          >
            <MenuItem value="ALL">Todas</MenuItem>
            <MenuItem value="PENDING">Pendentes</MenuItem>
            <MenuItem value="ISSUED">Emitidas</MenuItem>
          </TextField>
        </ListFiltersBar>

        <AppDataGrid
          height={480}
          rows={filtered}
          columns={columns}
          loading={isLoading}
          localeText={{
            noRowsLabel:
              entries.length === 0
                ? 'Nenhum lançamento no período'
                : 'Nenhum lançamento encontrado com os filtros',
          }}
        />
      </Card>

      <FinanceFormDialog open={formOpen} onClose={() => setFormOpen(false)} entry={editing} />
    </Box>
  );
}

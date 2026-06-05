import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  MenuItem,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { Link as RouterLink } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { PageHeader } from '../components/PageHeader';
import { ListFiltersBar, ActiveFilterSelect } from '../components/ListFiltersBar';
import { AppDataGrid } from '../components/AppDataGrid';
import { FILTER_FIELD_SX, matchFields, matchesActiveFilter, type ActiveFilter } from '../utils/listFilters';
import { recurringExpensesApi, type HourlyCostSettings } from '../api/recurring-expenses';
import { RecurringExpenseFormDialog } from '../components/finance/RecurringExpenseFormDialog';
import { useAppDialog } from '../contexts/AppDialogContext';
import type { RecurringExpense } from '../types';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function RecurringExpensesPage() {
  const queryClient = useQueryClient();
  const { confirm } = useAppDialog();
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'FIXED' | 'VARIABLE'>('ALL');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringExpense | null>(null);
  const [snack, setSnack] = useState<string | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['recurring-expenses'],
    queryFn: () => recurringExpensesApi.list(),
  });

  const { data: hourlyCostSettings } = useQuery({
    queryKey: ['recurring-expenses', 'hourly-cost-settings'],
    queryFn: () => recurringExpensesApi.getHourlyCostSettings(),
  });

  const includeVariable = hourlyCostSettings?.includeVariable ?? false;

  const { data: hourlyCostSummary } = useQuery({
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
    },
  });

  const generateMutation = useMutation({
    mutationFn: () => recurringExpensesApi.generate(),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      if (result.generated === 0) {
        setSnack('Todos os lançamentos do mês já foram gerados.');
      } else {
        setSnack(
          `${result.generated} lançamento${result.generated > 1 ? 's' : ''} gerado${result.generated > 1 ? 's' : ''} para ${result.month}.`,
        );
      }
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

  const columns = useMemo<GridColDef<RecurringExpense>[]>(
    () => [
      { field: 'name', headerName: 'Nome', flex: 1, minWidth: 180 },
      {
        field: 'amount',
        headerName: 'Valor',
        flex: 0.6,
        minWidth: 120,
        align: 'right',
        headerAlign: 'right',
        renderCell: (p) => (
          <Typography variant="body2" fontWeight={600} color="error.main">
            {brl.format(Number(p.row.amount))}
          </Typography>
        ),
      },
      {
        field: 'expenseType',
        headerName: 'Tipo',
        flex: 0.5,
        minWidth: 100,
        renderCell: (p) =>
          p.value === 'FIXED' ? (
            <Chip size="small" label="Fixa" color="info" variant="outlined" />
          ) : (
            <Chip size="small" label="Variável" color="warning" variant="outlined" />
          ),
      },
      {
        field: 'category',
        headerName: 'Categoria',
        flex: 0.7,
        minWidth: 120,
        valueGetter: (p) => p.row.category ?? '---',
      },
      {
        field: 'dueDay',
        headerName: 'Vencimento',
        flex: 0.5,
        minWidth: 100,
        valueGetter: (p) => `Dia ${p.row.dueDay}`,
      },
      {
        field: 'active',
        headerName: 'Status',
        flex: 0.4,
        minWidth: 90,
        renderCell: (p) =>
          p.value ? (
            <Chip size="small" label="Ativa" color="success" variant="outlined" />
          ) : (
            <Chip size="small" label="Inativa" variant="outlined" />
          ),
      },
      {
        field: '_count',
        headerName: 'Gerados',
        flex: 0.4,
        minWidth: 80,
        valueGetter: (p) => p.row._count?.generatedEntries ?? 0,
      },
      {
        field: 'actions',
        type: 'actions',
        headerName: 'Ações',
        width: 100,
        getActions: (p) => [
          <GridActionsCellItem
            key="edit"
            icon={
              <Tooltip title="Editar">
                <EditIcon fontSize="small" />
              </Tooltip>
            }
            label="Editar"
            onClick={() => {
              setEditing(p.row);
              setFormOpen(true);
            }}
          />,
          <GridActionsCellItem
            key="del"
            icon={
              <Tooltip title="Excluir">
                <DeleteIcon fontSize="small" />
              </Tooltip>
            }
            label="Excluir"
            onClick={async () => {
              const ok = await confirm({
                title: 'Excluir despesa',
                message: `Excluir "${p.row.name}"?`,
                confirmLabel: 'Excluir',
                confirmColor: 'error',
              });
              if (ok) deleteMutation.mutate(p.row.id);
            }}
          />,
        ],
      },
    ],
    [confirm, deleteMutation],
  );

  return (
    <Box>
      <PageHeader
        title="Despesas recorrentes"
        subtitle="Cadastre despesas fixas e variáveis que se repetem mensalmente"
        action={
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<AutorenewIcon />}
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? 'Gerando...' : 'Gerar lançamentos do mes'}
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              Nova despesa
            </Button>
          </Stack>
        }
      />

      {hourlyCostSummary && (
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: { xs: 2, sm: 2.5 }, '&:last-child': { pb: { xs: 2, sm: 2.5 } } }}>
            <Stack spacing={1.5}>
              <Stack
                direction="row"
                alignItems="flex-start"
                justifyContent="space-between"
                spacing={1}
              >
                <Stack direction="row" spacing={0.5} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
                  <ScheduleIcon color="primary" fontSize="small" />
                  <Typography variant="subtitle1" fontWeight={700}>
                    Custo/hora do profissional principal
                  </Typography>
                  {hourlyCostTooltip && (
                    <Tooltip title={hourlyCostTooltip} arrow placement="top-start">
                      <IconButton
                        size="small"
                        aria-label="Detalhes do cálculo de custo por hora"
                        sx={{ color: 'text.secondary' }}
                      >
                        <InfoOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>

                <Tooltip
                  title="Inclui despesas variáveis ativas no custo/hora e no cálculo dos procedimentos."
                  arrow
                  placement="left"
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={0.75}
                    sx={{ flexShrink: 0, mt: -0.25, mr: -1 }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ lineHeight: 1.2, whiteSpace: 'nowrap' }}
                    >
                      Incluir despesas variáveis
                    </Typography>
                    <Switch
                      size="small"
                      checked={includeVariable}
                      onChange={(e) => updateHourlySettingsMutation.mutate(e.target.checked)}
                      inputProps={{ 'aria-label': 'Incluir despesas variáveis no cálculo' }}
                    />
                  </Stack>
                </Tooltip>
              </Stack>

              <Box>
                <Typography variant="h4" fontWeight={700} color="primary.main">
                  {brl.format(hourlyCostSummary.hourlyCost)}/h
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {brl.format(hourlyCostSummary.recurringExpensesMonthly)} em despesas{' '}
                  {includeVariable ? 'fixas + variáveis' : 'fixas'} ÷{' '}
                  {hourlyCostSummary.monthlyHours} h/mês
                </Typography>
              </Box>

              {!hourlyCostSummary.primaryProfessional && (
                <Alert severity="warning">
                  Nenhum profissional principal cadastrado.{' '}
                  <Button component={RouterLink} to="/profissionais" size="small">
                    Configurar
                  </Button>
                </Alert>
              )}
              {hourlyCostSummary.primaryProfessional && hourlyCostSummary.monthlyHours <= 0 && (
                <Alert severity="warning">
                  Sem horários de atendimento na agenda.{' '}
                  <Button component={RouterLink} to="/horarios" size="small">
                    Configurar horários
                  </Button>
                </Alert>
              )}
            </Stack>
          </CardContent>
        </Card>
      )}

      <Card sx={{ p: { xs: 1.5, sm: 2 } }}>
        <ListFiltersBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar por nome ou categoria"
          filteredCount={filteredItems.length}
          totalCount={items.length}
          countLabel={
            filteredItems.length === 1 ? 'despesa cadastrada' : 'despesas cadastradas'
          }
          trailing={
            <Typography variant="body2" fontWeight={600} color="error.main">
              Total mensal (ativas): {brl.format(totalMonthly)}
            </Typography>
          }
        >
          <TextField
            select
            size="small"
            label="Tipo"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
            sx={FILTER_FIELD_SX}
          >
            <MenuItem value="ALL">Todos</MenuItem>
            <MenuItem value="FIXED">Fixa</MenuItem>
            <MenuItem value="VARIABLE">Variável</MenuItem>
          </TextField>
          <ActiveFilterSelect value={activeFilter} onChange={setActiveFilter} />
        </ListFiltersBar>
        <AppDataGrid
          height={480}
          rows={filteredItems}
          columns={columns}
          loading={isLoading}
          localeText={{
            noRowsLabel:
              items.length === 0
                ? 'Nenhuma despesa recorrente cadastrada'
                : 'Nenhuma despesa encontrada com os filtros',
          }}
        />
      </Card>

      <RecurringExpenseFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        expense={editing}
      />

      <Snackbar
        open={!!snack}
        autoHideDuration={5000}
        onClose={() => setSnack(null)}
        message={snack}
      />
    </Box>
  );
}

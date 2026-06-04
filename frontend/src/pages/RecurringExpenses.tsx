import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import ScheduleIcon from '@mui/icons-material/Schedule';
import { Link as RouterLink } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { PageHeader } from '../components/PageHeader';
import { ListFiltersBar, ActiveFilterSelect } from '../components/ListFiltersBar';
import { AppDataGrid } from '../components/AppDataGrid';
import { FILTER_FIELD_SX, matchFields, matchesActiveFilter, type ActiveFilter } from '../utils/listFilters';
import { recurringExpensesApi } from '../api/recurring-expenses';
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

  const { data: hourlyCostSummary } = useQuery({
    queryKey: ['recurring-expenses', 'hourly-cost-summary'],
    queryFn: () => recurringExpensesApi.getHourlyCostSummary(),
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

  const totalFixedMonthly = useMemo(
    () =>
      items
        .filter((i) => i.active && i.expenseType === 'FIXED')
        .reduce((sum, i) => sum + Number(i.amount), 0),
    [items],
  );

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
        valueGetter: (p) => p.row.category ?? '—',
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
              {generateMutation.isPending ? 'Gerando...' : 'Gerar lançamentos do mês'}
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
            <Stack
              direction={{ xs: 'column', md: 'row' }}
              spacing={2}
              alignItems={{ md: 'center' }}
              justifyContent="space-between"
            >
              <Box>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                  <ScheduleIcon color="primary" fontSize="small" />
                  <Typography variant="subtitle1" fontWeight={700}>
                    Custo/hora do profissional principal
                  </Typography>
                </Stack>
                <Typography variant="h4" fontWeight={700} color="primary.main">
                  {brl.format(hourlyCostSummary.hourlyCost)}/h
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Despesas fixas recorrentes ({brl.format(totalFixedMonthly)}) ÷ carga horária
                  mensal ({hourlyCostSummary.monthlyHours} h)
                </Typography>
              </Box>

              <Stack spacing={1} alignItems={{ xs: 'flex-start', md: 'flex-end' }}>
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
                    Sem horários de atendimento.{' '}
                    <Button component={RouterLink} to="/horarios" size="small">
                      Configurar agenda
                    </Button>
                  </Alert>
                )}
                {hourlyCostSummary.financeFixedMonthly !== totalFixedMonthly && (
                  <Tooltip
                    title="Após gerar os lançamentos do mês, os procedimentos usam o total de despesas fixas no financeiro."
                  >
                    <Typography variant="caption" color="text.secondary">
                      No financeiro (mês atual): {brl.format(hourlyCostSummary.financeFixedMonthly)}{' '}
                      em despesas fixas
                    </Typography>
                  </Tooltip>
                )}
              </Stack>
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

import { useMemo, useState } from 'react';
import { Box, Button, Card, Chip, Stack, Tooltip, Typography } from '@mui/material';
import { GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import HistoryIcon from '@mui/icons-material/History';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { PageHeader } from '../components/PageHeader';
import { ListFiltersBar, ActiveFilterSelect } from '../components/ListFiltersBar';
import { AppDataGrid } from '../components/AppDataGrid';
import { matchFields, matchesActiveFilter, type ActiveFilter } from '../utils/listFilters';
import { proceduresApi } from '../api/procedures';
import { ProcedureFormDialog } from '../components/procedures/ProcedureFormDialog';
import { AuditHistoryDialog } from '../components/audit/AuditHistoryDialog';
import { useAppDialog } from '../contexts/AppDialogContext';
import { usePermissions } from '../contexts/usePermissions';
import type { Procedure } from '../types';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function Procedures() {
  const queryClient = useQueryClient();
  const { confirm } = useAppDialog();
  const { has, isAdmin } = usePermissions();
  const canCreate = has('procedures:create');
  const canEdit = has('procedures:edit');
  const canDelete = has('procedures:delete');

  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('ALL');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Procedure | null>(null);
  const [auditTarget, setAuditTarget] = useState<{ id: string; name: string } | null>(null);

  const { data: procedures = [], isLoading } = useQuery({
    queryKey: ['procedures'],
    queryFn: () => proceduresApi.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => proceduresApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['procedures'] }),
  });

  const filteredProcedures = useMemo(
    () =>
      procedures.filter(
        (p) =>
          matchesActiveFilter(p.active, activeFilter) &&
          matchFields(search, p.name, p.description),
      ),
    [procedures, search, activeFilter],
  );

  const columns = useMemo<GridColDef<Procedure>[]>(
    () => [
      { field: 'name', headerName: 'Nome', flex: 1.2, minWidth: 200 },
      {
        field: 'durationMinutes',
        headerName: 'Duração',
        flex: 0.5,
        minWidth: 100,
        valueGetter: (params) => `${params.row.durationMinutes} min`,
      },
      {
        field: 'price',
        headerName: 'Preço',
        flex: 0.6,
        minWidth: 120,
        align: 'right',
        headerAlign: 'right',
        renderCell: (params) => (
          <Typography variant="body2" fontWeight={600} color="success.main">
            {brl.format(Number(params.row.price))}
          </Typography>
        ),
      },
      {
        field: 'baseCost',
        headerName: 'Custo Mat.',
        flex: 0.55,
        minWidth: 110,
        align: 'right',
        headerAlign: 'right',
        renderCell: (params) => {
          const cost = params.row.baseCost;
          if (cost == null || cost === 0) return '—';
          return (
            <Typography variant="body2" fontWeight={500} color="text.secondary">
              {brl.format(cost)}
            </Typography>
          );
        },
      },
      {
        field: 'maxFeeCost',
        headerName: 'Taxa Pgto.',
        flex: 0.55,
        minWidth: 110,
        align: 'right',
        headerAlign: 'right',
        renderCell: (params) => {
          const fee = params.row.maxFeeCost;
          const pct = params.row.maxFeePercent;
          if (fee == null || fee === 0) return '—';
          return (
            <Tooltip title={`Maior taxa ativa: ${pct?.toFixed(1)}%`}>
              <Typography variant="body2" fontWeight={500} color="text.secondary">
                {brl.format(fee)}
              </Typography>
            </Tooltip>
          );
        },
      },
      {
        field: 'fixedCostShare',
        headerName: 'Desp. Fixa',
        flex: 0.55,
        minWidth: 110,
        align: 'right',
        headerAlign: 'right',
        renderCell: (params) => {
          const share = params.row.fixedCostShare;
          const hourly = params.row.hourlyCost;
          const duration = params.row.durationMinutes;
          if (share == null || share === 0) return '—';
          const tip = hourly
            ? `Custo/hora: ${brl.format(hourly)} × ${duration} min`
            : 'Despesa fixa do procedimento';
          return (
            <Tooltip title={tip}>
              <Typography variant="body2" fontWeight={500} color="text.secondary">
                {brl.format(share)}
              </Typography>
            </Tooltip>
          );
        },
      },
      {
        field: 'totalCost',
        headerName: 'Custo Total',
        flex: 0.55,
        minWidth: 110,
        align: 'right',
        headerAlign: 'right',
        renderCell: (params) => {
          const total = params.row.totalCost;
          if (total == null) return '—';
          return (
            <Typography variant="body2" fontWeight={600} color="error.main">
              {brl.format(total)}
            </Typography>
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
          if (margin == null) return '—';
          const isLow = margin < 50;
          return (
            <Tooltip
              title={isLow ? 'Margem abaixo de 50% — revise preço ou custos' : 'Margem de lucro'}
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
        field: 'recurrenceDays',
        headerName: 'Retorno',
        flex: 0.4,
        minWidth: 90,
        valueGetter: (params) =>
          params.row.recurrenceDays ? `${params.row.recurrenceDays}d` : '—',
      },
      {
        field: 'active',
        headerName: 'Status',
        flex: 0.35,
        minWidth: 90,
        renderCell: (params) => (
          <Chip
            size="small"
            label={params.row.active ? 'Ativo' : 'Inativo'}
            color={params.row.active ? 'success' : 'default'}
            variant="outlined"
          />
        ),
      },
      {
        field: 'actions',
        type: 'actions',
        headerName: 'Ações',
        width: 140,
        getActions: (params) => {
          const actions = [];
          if (isAdmin) {
            actions.push(
              <GridActionsCellItem
                key="history"
                icon={
                  <Tooltip title="Histórico de alterações">
                    <HistoryIcon fontSize="small" />
                  </Tooltip>
                }
                label="Histórico"
                onClick={() => setAuditTarget({ id: params.row.id, name: params.row.name ?? '' })}
              />,
            );
          }
          if (canEdit) {
            actions.push(
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
            );
          }
          if (canDelete) {
            actions.push(
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
                    title: 'Excluir procedimento',
                    message: `Excluir procedimento ${params.row.name}?`,
                    confirmLabel: 'Excluir',
                    confirmColor: 'error',
                  });
                  if (ok) {
                    deleteMutation.mutate(params.row.id);
                  }
                }}
              />,
            );
          }
          return actions;
        },
      },
    ],
    [confirm, deleteMutation, canEdit, canDelete, isAdmin],
  );

  return (
    <Box>
      <PageHeader
        title="Procedimentos"
        subtitle="Cadastro de procedimentos e valores"
        action={
          canCreate && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              Novo procedimento
            </Button>
          )
        }
      />

      <Card sx={{ p: { xs: 1.5, sm: 2 } }}>
        <ListFiltersBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar por nome ou descrição"
          filteredCount={filteredProcedures.length}
          totalCount={procedures.length}
          countLabel={filteredProcedures.length === 1 ? 'procedimento' : 'procedimentos'}
        >
          <ActiveFilterSelect value={activeFilter} onChange={setActiveFilter} />
        </ListFiltersBar>

        <AppDataGrid
          rows={filteredProcedures}
          columns={columns}
          loading={isLoading}
          localeText={{
            noRowsLabel:
              procedures.length === 0
                ? 'Nenhum procedimento cadastrado'
                : 'Nenhum procedimento encontrado com os filtros',
            footerRowSelected: (count) => `${count} selecionado(s)`,
          }}
        />
      </Card>

      <ProcedureFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        procedure={editing}
      />
      {auditTarget && (
        <AuditHistoryDialog
          open={!!auditTarget}
          onClose={() => setAuditTarget(null)}
          entity="Procedure"
          entityId={auditTarget.id}
          title={auditTarget.name}
        />
      )}
    </Box>
  );
}

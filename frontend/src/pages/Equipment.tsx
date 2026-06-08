import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
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
import HistoryIcon from '@mui/icons-material/History';
import BuildIcon from '@mui/icons-material/Build';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { dayjsFromDateOnlyApi, formatDateOnlyFromApi } from '../utils/dateOnly';

import { PageHeader } from '../components/PageHeader';
import { ListFiltersBar, ActiveFilterSelect } from '../components/ListFiltersBar';
import { AppDataGrid } from '../components/AppDataGrid';
import {
  FILTER_FIELD_SX,
  matchFields,
  matchesActiveFilter,
  type ActiveFilter,
  type MaintenanceFilter,
} from '../utils/listFilters';
import { equipmentApi } from '../api/equipment';
import { EquipmentFormDialog } from '../components/equipment/EquipmentFormDialog';
import { AuditHistoryDialog } from '../components/audit/AuditHistoryDialog';
import { useAppDialog } from '../contexts/AppDialogContext';
import { usePermissions } from '../contexts/usePermissions';
import type { Equipment } from '../types';

function formatCurrency(value?: number | null) {
  if (value == null) return '—';
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function EquipmentPage() {
  const queryClient = useQueryClient();
  const { confirm } = useAppDialog();
  const { has, isAdmin } = usePermissions();
  const canCreate = has('equipment:create');
  const canEdit = has('equipment:edit');
  const canDelete = has('equipment:delete');

  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('ALL');
  const [maintenanceFilter, setMaintenanceFilter] = useState<MaintenanceFilter>('ALL');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Equipment | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => equipmentApi.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => equipmentApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['equipment'] }),
  });

  const maintenanceMutation = useMutation({
    mutationFn: (id: string) => equipmentApi.registerMaintenance(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['equipment'] }),
  });

  // Itens com manutenção em até 30 dias ou já vencida
  const isMaintenanceDue = (e: Equipment) => {
    const next = e.scheduledMaintenanceAt ?? e.nextMaintenanceAt;
    const d = dayjsFromDateOnlyApi(next);
    return !!d && d.diff(dayjs(), 'day') <= 30;
  };

  const dueSoon = useMemo(() => items.filter(isMaintenanceDue), [items]);

  const filteredItems = useMemo(
    () =>
      items.filter((e) => {
        if (!matchesActiveFilter(e.active, activeFilter)) return false;
        if (maintenanceFilter === 'DUE' && !isMaintenanceDue(e)) return false;
        return matchFields(search, e.name, e.brand, e.model);
      }),
    [items, search, activeFilter, maintenanceFilter],
  );

  const columns = useMemo<GridColDef<Equipment>[]>(
    () => [
      { field: 'name', headerName: 'Nome', flex: 1, minWidth: 160 },
      {
        field: 'brand',
        headerName: 'Marca / Modelo',
        flex: 0.7,
        minWidth: 140,
        valueGetter: (p) => [p.row.brand, p.row.model].filter(Boolean).join(' · ') || '—',
      },
      {
        field: 'purchaseValue',
        headerName: 'Valor máquina',
        flex: 0.6,
        minWidth: 120,
        valueGetter: (p) => formatCurrency(p.row.purchaseValue),
      },
      {
        field: 'maintenanceValue',
        headerName: 'Valor manut.',
        flex: 0.6,
        minWidth: 110,
        valueGetter: (p) => formatCurrency(p.row.maintenanceValue),
      },
      {
        field: 'scheduledMaintenanceAt',
        headerName: 'Manut. agendada',
        flex: 0.7,
        minWidth: 140,
        renderCell: (p) => {
          if (!p.row.scheduledMaintenanceAt) return <span>—</span>;
          const d = dayjsFromDateOnlyApi(p.row.scheduledMaintenanceAt);
          if (!d) return '—';
          const days = d.diff(dayjs(), 'day');
          const overdue = days < 0;
          const soon = days >= 0 && days <= 30;
          return (
            <Chip
              size="small"
              label={formatDateOnlyFromApi(p.row.scheduledMaintenanceAt)}
              color={overdue ? 'error' : soon ? 'warning' : 'success'}
              variant="outlined"
            />
          );
        },
      },
      {
        field: 'nextMaintenanceAt',
        headerName: 'Próxima (auto)',
        flex: 0.7,
        minWidth: 140,
        renderCell: (p) => {
          if (!p.row.nextMaintenanceAt) return <span>—</span>;
          const d = dayjsFromDateOnlyApi(p.row.nextMaintenanceAt);
          if (!d) return '—';
          const days = d.diff(dayjs(), 'day');
          const overdue = days < 0;
          const soon = days >= 0 && days <= 30;
          return (
            <Chip
              size="small"
              label={formatDateOnlyFromApi(p.row.nextMaintenanceAt)}
              color={overdue ? 'error' : soon ? 'warning' : 'default'}
              variant="outlined"
            />
          );
        },
      },
      {
        field: 'maintenanceNotifyDaysBefore',
        headerName: 'Aviso',
        flex: 0.4,
        minWidth: 80,
        valueGetter: (p) =>
          p.row.maintenanceNotifyDaysBefore
            ? `${p.row.maintenanceNotifyDaysBefore}d antes`
            : '—',
      },
      {
        field: 'active',
        headerName: 'Status',
        flex: 0.3,
        minWidth: 80,
        renderCell: (p) =>
          p.value ? (
            <Chip size="small" label="Ativo" color="success" variant="outlined" />
          ) : (
            <Chip size="small" label="Inativo" variant="outlined" />
          ),
      },
      {
        field: 'actions',
        type: 'actions',
        headerName: 'Ações',
        width: 180,
        getActions: (p) => {
          const actions = [];
          if (canEdit) {
            actions.push(
              <GridActionsCellItem
                key="maint"
                icon={
                  <Tooltip title="Registrar manutenção agora">
                    <BuildIcon fontSize="small" />
                  </Tooltip>
                }
                label="Manutenção"
                onClick={async () => {
                  const ok = await confirm({
                    title: 'Registrar manutenção',
                    message: `Registrar manutenção de ${p.row.name} agora?`,
                    confirmLabel: 'Registrar',
                  });
                  if (ok) {
                    maintenanceMutation.mutate(p.row.id);
                  }
                }}
              />,
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
            );
          }
          if (canDelete) {
            actions.push(
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
                    title: 'Excluir equipamento',
                    message: `Excluir ${p.row.name}?`,
                    confirmLabel: 'Excluir',
                    confirmColor: 'error',
                  });
                  if (ok) deleteMutation.mutate(p.row.id);
                }}
              />,
            );
          }
          return actions;
        },
      },
    ],
    [confirm, deleteMutation, maintenanceMutation, canEdit, canDelete],
  );

  return (
    <Box>
      <PageHeader
        title="Equipamentos"
        subtitle="Cadastro de máquinas e controle de manutenção preventiva"
        action={
          <Stack direction="row" spacing={1}>
            {isAdmin && (
              <Button
                variant="outlined"
                startIcon={<HistoryIcon />}
                onClick={() => setHistoryOpen(true)}
              >
                Histórico
              </Button>
            )}
            {canCreate && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                Novo equipamento
              </Button>
            )}
          </Stack>
        }
      />

      {dueSoon.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {dueSoon.length} equipamento{dueSoon.length === 1 ? '' : 's'} com manutenção próxima ou
          atrasada.
        </Alert>
      )}

      <Card sx={{ p: { xs: 1.5, sm: 2 } }}>
        <ListFiltersBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar por nome, marca ou modelo"
          filteredCount={filteredItems.length}
          totalCount={items.length}
          countLabel={filteredItems.length === 1 ? 'equipamento' : 'equipamentos'}
        >
          <TextField
            select
            size="small"
            label="Manutenção"
            value={maintenanceFilter}
            onChange={(e) => setMaintenanceFilter(e.target.value as MaintenanceFilter)}
            sx={FILTER_FIELD_SX}
          >
            <MenuItem value="ALL">Todas</MenuItem>
            <MenuItem value="DUE">Próxima ou atrasada</MenuItem>
          </TextField>
          <ActiveFilterSelect value={activeFilter} onChange={setActiveFilter} />
        </ListFiltersBar>
        <AppDataGrid
          rows={filteredItems}
          columns={columns}
          loading={isLoading}
          localeText={{
            noRowsLabel:
              items.length === 0
                ? 'Nenhum equipamento cadastrado'
                : 'Nenhum equipamento encontrado com os filtros',
          }}
        />
      </Card>

      <EquipmentFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        equipment={editing}
      />
      <AuditHistoryDialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        entity="Equipment"
        title="Equipamentos"
      />
    </Box>
  );
}

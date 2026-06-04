import { useMemo, useState } from 'react';
import { Box, Button, Card, Chip, Tooltip, Typography } from '@mui/material';
import { GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { PageHeader } from '../components/PageHeader';
import { ListFiltersBar, ActiveFilterSelect } from '../components/ListFiltersBar';
import { AppDataGrid } from '../components/AppDataGrid';
import { matchFields, matchesActiveFilter, type ActiveFilter } from '../utils/listFilters';
import { paymentMethodsApi } from '../api/paymentMethods';
import { PaymentMethodFormDialog } from '../components/payment-methods/PaymentMethodFormDialog';
import { useAppDialog } from '../contexts/AppDialogContext';
import { usePermissions } from '../contexts/usePermissions';
import type { PaymentMethodEntry } from '../types';

export function PaymentMethods() {
  const queryClient = useQueryClient();
  const { confirm } = useAppDialog();
  const { has } = usePermissions();
  const canCreate = has('payment-methods:create');
  const canEdit = has('payment-methods:edit');
  const canDelete = has('payment-methods:delete');
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('ALL');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentMethodEntry | null>(null);

  const { data: methods = [], isLoading } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: () => paymentMethodsApi.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => paymentMethodsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['payment-methods'] }),
  });

  const filteredMethods = useMemo(
    () =>
      methods.filter(
        (m) =>
          matchesActiveFilter(m.active, activeFilter) && matchFields(search, m.name),
      ),
    [methods, search, activeFilter],
  );

  const columns = useMemo<GridColDef<PaymentMethodEntry>[]>(
    () => [
      { field: 'name', headerName: 'Nome', flex: 1.2, minWidth: 200 },
      {
        field: 'feePercent',
        headerName: 'Taxa',
        flex: 0.5,
        minWidth: 110,
        renderCell: (params) => {
          const fee = Number(params.value);
          if (fee === 0) {
            return <Chip size="small" label="Sem taxa" color="success" variant="outlined" />;
          }
          return (
            <Chip
              size="small"
              label={`${fee.toFixed(2)}%`}
              color="warning"
              variant="outlined"
            />
          );
        },
      },
      {
        field: 'active',
        headerName: 'Status',
        flex: 0.4,
        minWidth: 100,
        renderCell: (params) => (
          <Chip
            size="small"
            label={params.row.active ? 'Ativa' : 'Inativa'}
            color={params.row.active ? 'success' : 'default'}
            variant="outlined"
          />
        ),
      },
      {
        field: '_count',
        headerName: 'Usos',
        flex: 0.3,
        minWidth: 80,
        align: 'center',
        headerAlign: 'center',
        valueGetter: (params) => params.row._count?.financialEntries ?? 0,
      },
      {
        field: 'actions',
        type: 'actions',
        headerName: 'Ações',
        width: 100,
        getActions: (params) => {
          const actions = [];
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
                    title: 'Excluir forma de pagamento',
                    message: `Excluir a forma de pagamento "${params.row.name}"?`,
                    confirmLabel: 'Excluir',
                    confirmColor: 'error',
                  });
                  if (ok) deleteMutation.mutate(params.row.id);
                }}
              />,
            );
          }
          return actions;
        },
      },
    ],
    [confirm, canEdit, canDelete, deleteMutation],
  );

  return (
    <Box>
      <PageHeader
        title="Formas de pagamento"
        subtitle="Cadastre as formas de pagamento e suas taxas de maquininha"
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
              Nova forma de pagamento
            </Button>
          )
        }
      />

      <Card sx={{ p: { xs: 1.5, sm: 2 } }}>
        <ListFiltersBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar por nome"
          filteredCount={filteredMethods.length}
          totalCount={methods.length}
          countLabel={
            filteredMethods.length === 1 ? 'forma de pagamento' : 'formas de pagamento'
          }
        >
          <ActiveFilterSelect value={activeFilter} onChange={setActiveFilter} />
        </ListFiltersBar>

        <AppDataGrid
          rows={filteredMethods}
          columns={columns}
          loading={isLoading}
          localeText={{
            noRowsLabel:
              methods.length === 0
                ? 'Nenhuma forma de pagamento cadastrada'
                : 'Nenhuma forma de pagamento encontrada com os filtros',
            footerRowSelected: (count) => `${count} selecionado(s)`,
          }}
        />
      </Card>

      <PaymentMethodFormDialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        editing={editing}
      />
    </Box>
  );
}

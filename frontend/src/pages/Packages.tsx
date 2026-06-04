import { useMemo, useState } from 'react';
import { Box, Button, Card, Chip, MenuItem, TextField, Tooltip, Typography } from '@mui/material';
import { GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { PageHeader } from '../components/PageHeader';
import { ListFiltersBar, ActiveFilterSelect } from '../components/ListFiltersBar';
import { AppDataGrid } from '../components/AppDataGrid';
import { FILTER_FIELD_SX, matchFields, matchesActiveFilter, type ActiveFilter } from '../utils/listFilters';
import { packagesApi } from '../api/packages';
import { PackageFormDialog } from '../components/packages/PackageFormDialog';
import { useAppDialog } from '../contexts/AppDialogContext';
import { usePermissions } from '../contexts/usePermissions';
import type { Package } from '../types';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function Packages() {
  const queryClient = useQueryClient();
  const { confirm } = useAppDialog();
  const { has } = usePermissions();
  const canManage = has('packages:edit');
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'COMBO' | 'SESSIONS'>('ALL');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Package | null>(null);

  const { data: packages = [], isLoading } = useQuery({
    queryKey: ['packages'],
    queryFn: () => packagesApi.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => packagesApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['packages'] }),
  });

  const filteredPackages = useMemo(
    () =>
      packages.filter((p) => {
        if (!matchesActiveFilter(p.active, activeFilter)) return false;
        if (typeFilter !== 'ALL' && p.type !== typeFilter) return false;
        return matchFields(search, p.name, p.description);
      }),
    [packages, search, activeFilter, typeFilter],
  );

  const columns = useMemo<GridColDef<Package>[]>(
    () => [
      { field: 'name', headerName: 'Nome', flex: 1.2, minWidth: 200 },
      {
        field: 'type',
        headerName: 'Tipo',
        flex: 0.5,
        minWidth: 110,
        renderCell: (params) => (
          <Chip
            size="small"
            label={params.value === 'COMBO' ? 'Combo' : 'Sessões'}
            color={params.value === 'COMBO' ? 'secondary' : 'primary'}
            variant="outlined"
          />
        ),
      },
      {
        field: 'sessionCount',
        headerName: 'Sessões',
        flex: 0.4,
        minWidth: 90,
        align: 'center',
        headerAlign: 'center',
      },
      {
        field: 'totalPrice',
        headerName: 'Preço fixo',
        flex: 0.6,
        minWidth: 120,
        valueFormatter: (params) =>
          params.value ? brl.format(Number(params.value)) : '—',
      },
      {
        field: 'discountPercent',
        headerName: 'Desconto',
        flex: 0.5,
        minWidth: 100,
        valueFormatter: (params) =>
          params.value ? `${Number(params.value)}%` : '—',
      },
      {
        field: 'validityDays',
        headerName: 'Validade',
        flex: 0.5,
        minWidth: 110,
        valueFormatter: (params) =>
          params.value ? `${params.value} dias` : 'Sem validade',
      },
      {
        field: 'items',
        headerName: 'Procedimentos',
        flex: 0.6,
        minWidth: 130,
        renderCell: (params) => {
          const count = params.row.items?.length ?? 0;
          return (
            <Chip
              size="small"
              label={`${count} ${count === 1 ? 'proc.' : 'procs.'}`}
              variant="outlined"
              color="info"
            />
          );
        },
      },
      {
        field: '_count',
        headerName: 'Vendidos',
        flex: 0.4,
        minWidth: 90,
        align: 'center',
        headerAlign: 'center',
        valueGetter: (params) => params.row._count?.patientPackages ?? 0,
      },
      {
        field: 'active',
        headerName: 'Status',
        flex: 0.5,
        minWidth: 100,
        renderCell: (params) =>
          params.value ? (
            <Chip size="small" label="Ativo" color="success" variant="outlined" />
          ) : (
            <Chip size="small" label="Inativo" variant="outlined" />
          ),
      },
      {
        field: 'actions',
        type: 'actions',
        headerName: 'Ações',
        width: 100,
        getActions: (params) => {
          if (!canManage) return [];
          return [
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
                  title: 'Excluir pacote',
                  message: `Excluir o pacote "${params.row.name}"?`,
                  confirmLabel: 'Excluir',
                  confirmColor: 'error',
                });
                if (ok) deleteMutation.mutate(params.row.id);
              }}
            />,
          ];
        },
      },
    ],
    [confirm, deleteMutation, canManage],
  );

  return (
    <Box>
      <PageHeader
        title="Pacotes"
        subtitle={
          canManage
            ? 'Monte combos e pacotes de sessões para oferecer aos pacientes'
            : 'Catálogo de pacotes disponíveis (apenas leitura)'
        }
        action={
          canManage && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              Novo pacote
            </Button>
          )
        }
      />

      <Card sx={{ p: { xs: 1.5, sm: 2 } }}>
        <ListFiltersBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar por nome"
          filteredCount={filteredPackages.length}
          totalCount={packages.length}
          countLabel={filteredPackages.length === 1 ? 'pacote' : 'pacotes'}
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
            <MenuItem value="COMBO">Combo</MenuItem>
            <MenuItem value="SESSIONS">Sessões</MenuItem>
          </TextField>
          <ActiveFilterSelect value={activeFilter} onChange={setActiveFilter} />
        </ListFiltersBar>
        <AppDataGrid
          rows={filteredPackages}
          columns={columns}
          loading={isLoading}
          localeText={{
            noRowsLabel:
              packages.length === 0
                ? 'Nenhum pacote cadastrado'
                : 'Nenhum pacote encontrado com os filtros',
          }}
        />
      </Card>

      <PackageFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        pkg={editing}
      />
    </Box>
  );
}

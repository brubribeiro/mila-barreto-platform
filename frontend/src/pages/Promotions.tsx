import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Box, Button, Card, Chip, MenuItem, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import HistoryIcon from '@mui/icons-material/History';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDateOnlyFromApi } from '../utils/dateOnly';

import { PageHeader } from '../components/PageHeader';
import { ListFiltersBar } from '../components/ListFiltersBar';
import { AppDataGrid } from '../components/AppDataGrid';
import {
  FILTER_FIELD_SX,
  isPromotionActive,
  matchFields,
  matchesPromotionStatusFilter,
  type PromotionStatusFilter,
} from '../utils/listFilters';
import { promotionsApi } from '../api/promotions';
import { PromotionFormDialog } from '../components/promotions/PromotionFormDialog';
import { AuditHistoryDialog } from '../components/audit/AuditHistoryDialog';
import { useAppDialog } from '../contexts/AppDialogContext';
import { usePermissions } from '../contexts/usePermissions';
import type { Promotion } from '../types';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function Promotions() {
  const queryClient = useQueryClient();
  const { confirm } = useAppDialog();
  const { has, isAdmin } = usePermissions();
  const canCreate = has('promotions:create');
  const canEdit = has('promotions:edit');
  const canDelete = has('promotions:delete');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PromotionStatusFilter>('ALL');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [initialCommemorativeDate, setInitialCommemorativeDate] = useState<string | undefined>();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const data = searchParams.get('data');
    if (data && canCreate) {
      setInitialCommemorativeDate(data);
      setEditing(null);
      setFormOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, canCreate, setSearchParams]);

  const { data: promotions = [], isLoading } = useQuery({
    queryKey: ['promotions'],
    queryFn: () => promotionsApi.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => promotionsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['promotions'] }),
  });

  const filteredPromotions = useMemo(
    () =>
      promotions.filter(
        (p) =>
          matchesPromotionStatusFilter(p, statusFilter) &&
          matchFields(search, p.name, p.commemorativeDate, p.description),
      ),
    [promotions, search, statusFilter],
  );

  const columns = useMemo<GridColDef<Promotion>[]>(
    () => [
      { field: 'name', headerName: 'Nome', flex: 1.2, minWidth: 200 },
      {
        field: 'commemorativeDate',
        headerName: 'Data comemorativa',
        flex: 0.8,
        minWidth: 160,
        valueGetter: (params) => params.row.commemorativeDate || '—',
      },
      {
        field: 'discountType',
        headerName: 'Desconto',
        flex: 0.6,
        minWidth: 130,
        renderCell: (params) => {
          const row = params.row;
          if (row.discountType === 'PERCENTAGE') {
            return <Chip size="small" label={`${Number(row.discountValue)}%`} color="secondary" variant="outlined" />;
          }
          return <Chip size="small" label={brl.format(Number(row.discountValue))} color="primary" variant="outlined" />;
        },
      },
      {
        field: 'startAt',
        headerName: 'Início',
        flex: 0.5,
        minWidth: 110,
        valueFormatter: (params) => formatDateOnlyFromApi(params.value as string),
      },
      {
        field: 'endAt',
        headerName: 'Fim',
        flex: 0.5,
        minWidth: 110,
        valueFormatter: (params) => formatDateOnlyFromApi(params.value as string),
      },
      {
        field: 'procedures',
        headerName: 'Procedimentos',
        flex: 0.5,
        minWidth: 130,
        renderCell: (params) => {
          const count = params.row.procedures?.length ?? 0;
          if (count === 0) return <Typography variant="body2" color="text.secondary">—</Typography>;
          return (
            <Tooltip title={params.row.procedures!.map((p) => p.procedure.name).join(', ')}>
              <Chip size="small" label={`${count}`} variant="outlined" />
            </Tooltip>
          );
        },
      },
      {
        field: 'packages',
        headerName: 'Pacotes',
        flex: 0.5,
        minWidth: 110,
        renderCell: (params) => {
          const count = params.row.packages?.length ?? 0;
          if (count === 0) return <Typography variant="body2" color="text.secondary">—</Typography>;
          return (
            <Tooltip title={params.row.packages!.map((p) => p.package.name).join(', ')}>
              <Chip size="small" label={`${count}`} variant="outlined" />
            </Tooltip>
          );
        },
      },
      {
        field: 'active',
        headerName: 'Status',
        flex: 0.5,
        minWidth: 110,
        renderCell: (params) => {
          const promo = params.row;
          if (isPromotionActive(promo)) {
            return <Chip size="small" label="Ativa" color="success" variant="outlined" />;
          }
          if (promo.active && new Date(promo.startAt) > new Date()) {
            return <Chip size="small" label="Futura" color="info" variant="outlined" />;
          }
          if (!promo.active) {
            return <Chip size="small" label="Inativa" color="default" variant="outlined" />;
          }
          return <Chip size="small" label="Expirada" color="warning" variant="outlined" />;
        },
      },
      {
        field: '_count',
        headerName: 'Usos',
        flex: 0.3,
        minWidth: 80,
        align: 'center',
        headerAlign: 'center',
        valueGetter: (params) => params.row._count?.appointments ?? 0,
      },
      {
        field: 'actions',
        type: 'actions',
        headerName: 'Ações',
        width: 140,
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
                    title: 'Excluir promoção',
                    message: `Excluir a promoção "${params.row.name}"?`,
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
        title="Promoções"
        subtitle="Gerencie promoções e descontos para datas comemorativas"
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
                  setInitialCommemorativeDate(undefined);
                  setFormOpen(true);
                }}
              >
                Nova promoção
              </Button>
            )}
          </Stack>
        }
      />

      <Card sx={{ p: { xs: 1.5, sm: 2 } }}>
        <ListFiltersBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar por nome ou data comemorativa"
          filteredCount={filteredPromotions.length}
          totalCount={promotions.length}
          countLabel={filteredPromotions.length === 1 ? 'promoção' : 'promoções'}
        >
          <TextField
            select
            size="small"
            label="Situação"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as PromotionStatusFilter)}
            sx={FILTER_FIELD_SX}
          >
            <MenuItem value="ALL">Todas</MenuItem>
            <MenuItem value="ACTIVE">Ativas</MenuItem>
            <MenuItem value="FUTURE">Futuras</MenuItem>
            <MenuItem value="EXPIRED">Expiradas</MenuItem>
            <MenuItem value="INACTIVE">Inativas</MenuItem>
          </TextField>
        </ListFiltersBar>

        <AppDataGrid
          rows={filteredPromotions}
          columns={columns}
          loading={isLoading}
          localeText={{
            noRowsLabel:
              promotions.length === 0
                ? 'Nenhuma promoção cadastrada'
                : 'Nenhuma promoção encontrada com os filtros',
            footerRowSelected: (count) => `${count} selecionado(s)`,
          }}
          initialState={{
            sorting: { sortModel: [{ field: 'startAt', sort: 'desc' }] },
          }}
        />
      </Card>

      <PromotionFormDialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
          setInitialCommemorativeDate(undefined);
        }}
        editing={editing}
        initialCommemorativeDate={initialCommemorativeDate}
      />
      <AuditHistoryDialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        entity="Promotion"
        title="Promoções"
      />
    </Box>
  );
}

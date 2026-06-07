import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import VisibilityIcon from '@mui/icons-material/Visibility';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { downloadCsv } from '../utils/csv';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { PageHeader } from '../components/PageHeader';
import { ListFiltersBar } from '../components/ListFiltersBar';
import { AppDataGrid } from '../components/AppDataGrid';
import { FILTER_FIELD_SX, matchFields, type StockFilter } from '../utils/listFilters';
import { inventoryApi } from '../api/inventory';
import { InventoryFormDialog } from '../components/inventory/InventoryFormDialog';
import { MovementDialog } from '../components/inventory/MovementDialog';
import { BulkPurchaseDialog } from '../components/inventory/BulkPurchaseDialog';
import { AuditHistoryDialog } from '../components/audit/AuditHistoryDialog';
import { useAppDialog } from '../contexts/AppDialogContext';
import { usePermissions } from '../contexts/usePermissions';
import type { InventoryItem } from '../types';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function Inventory() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { confirm, alert } = useAppDialog();
  const { has, isAdmin } = usePermissions();
  const canCreate = has('inventory:create');
  const canEdit = has('inventory:edit');
  const canDelete = has('inventory:delete');

  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilter>('ALL');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [movementItem, setMovementItem] = useState<InventoryItem | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [auditTarget, setAuditTarget] = useState<{ id: string; name: string } | null>(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => inventoryApi.list(),
  });

  const isLowStock = (i: InventoryItem) => Number(i.quantity) <= Number(i.minQuantity);

  const lowStockCount = useMemo(() => items.filter(isLowStock).length, [items]);

  const filteredItems = useMemo(
    () =>
      items.filter((i) => {
        if (stockFilter === 'LOW' && !isLowStock(i)) return false;
        return matchFields(search, i.name, i.sku, i.description);
      }),
    [items, search, stockFilter],
  );

  const deleteMutation = useMutation({
    mutationFn: (id: string) => inventoryApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inventory'] }),
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Não foi possível excluir o item.';
      void alert({ title: 'Erro', message: msg, severity: 'error' });
    },
  });

  const exportCsv = async () => {
    const ok = downloadCsv(
      'estoque.csv',
      items.map((i) => ({
        Nome: i.name,
        SKU: i.sku ?? '',
        Quantidade: String(i.quantity),
        'Qtd Mínima': String(i.minQuantity),
        Unidade: i.unit ?? '',
        'Custo Unitário': i.costPrice != null ? Number(i.costPrice).toFixed(2) : '',
      })),
      ['Nome', 'SKU', 'Quantidade', 'Qtd Mínima', 'Unidade', 'Custo Unitário'],
    );
    if (!ok) {
      await alert({
        title: 'Exportar',
        message: 'Nenhum item para exportar.',
        severity: 'info',
      });
    }
  };

  const columns = useMemo<GridColDef<InventoryItem>[]>(
    () => [
      { field: 'name', headerName: 'Nome', flex: 1.2, minWidth: 200 },
      {
        field: 'sku',
        headerName: 'SKU',
        flex: 0.5,
        minWidth: 100,
        valueGetter: (params) => params.row.sku ?? '—',
      },
      {
        field: 'quantity',
        headerName: 'Quantidade',
        flex: 0.5,
        minWidth: 110,
        renderCell: (params) => {
          const qty = Number(params.row.quantity);
          const min = Number(params.row.minQuantity);
          const low = qty <= min;
          return (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Typography
                variant="body2"
                fontWeight={600}
                color={low ? 'error.main' : 'text.primary'}
              >
                {qty}
                {params.row.unit ? ` ${params.row.unit}` : ''}
              </Typography>
              {low && (
                <Tooltip title="Abaixo do estoque mínimo">
                  <WarningAmberIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                </Tooltip>
              )}
            </Stack>
          );
        },
      },
      {
        field: 'minQuantity',
        headerName: 'Mínimo',
        flex: 0.4,
        minWidth: 90,
        valueGetter: (params) =>
          `${params.row.minQuantity}${params.row.unit ? ` ${params.row.unit}` : ''}`,
      },
      {
        field: 'costPrice',
        headerName: 'Custo unit.',
        flex: 0.5,
        minWidth: 110,
        align: 'right',
        headerAlign: 'right',
        valueGetter: (params) =>
          params.row.costPrice != null ? brl.format(Number(params.row.costPrice)) : '—',
      },
      {
        field: 'actions',
        type: 'actions',
        headerName: 'Ações',
        width: 200,
        getActions: (params) => {
          const actions = [
            <GridActionsCellItem
              key="view"
              icon={
                <Tooltip title="Ver detalhes">
                  <VisibilityIcon fontSize="small" />
                </Tooltip>
              }
              label="Ver"
              onClick={() => navigate(`/estoque/${params.row.id}`)}
            />,
            <GridActionsCellItem
              key="movement"
              icon={
                <Tooltip title="Movimentação">
                  <SwapHorizIcon fontSize="small" />
                </Tooltip>
              }
              label="Movimentação"
              onClick={() => setMovementItem(params.row)}
            />,
          ];
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
                  let preview;
                  try {
                    preview = await inventoryApi.getDeletionPreview(params.row.id);
                  } catch (err: unknown) {
                    const msg =
                      (err as { response?: { data?: { message?: string } } })?.response?.data
                        ?.message ?? 'Não foi possível verificar o item.';
                    await alert({ title: 'Erro', message: msg, severity: 'error' });
                    return;
                  }

                  const procedureNames = preview.procedures.map((p) => p.name);
                  const extraLines: string[] = [];
                  if (preview.appointmentCount > 0) {
                    extraLines.push(
                      `${preview.appointmentCount} agendamento(s) com este material`,
                    );
                  }
                  if (preview.movementsCount > 0 && preview.canDelete) {
                    extraLines.push(
                      `${preview.movementsCount} movimentação(ões) de estoque serão removidas`,
                    );
                  }

                  let message = preview.canDelete
                    ? `Excluir o item "${params.row.name}"? Esta ação não pode ser desfeita.`
                    : `O item "${params.row.name}" não pode ser excluído enquanto estiver em uso.`;
                  if (preview.appointmentCount > 0 && !preview.canDelete) {
                    message += ` Há ${preview.appointmentCount} agendamento(s) com este material.`;
                  }

                  const ok = await confirm({
                    title: 'Excluir item',
                    message,
                    detailsTitle:
                      procedureNames.length > 0 ? 'Procedimentos que usam este item:' : undefined,
                    details:
                      procedureNames.length > 0 || extraLines.length > 0
                        ? [...procedureNames, ...extraLines]
                        : undefined,
                    confirmLabel: 'Excluir',
                    confirmColor: 'error',
                    disableConfirm: !preview.canDelete,
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
    [alert, confirm, deleteMutation, canEdit, canDelete, navigate, isAdmin],
  );

  return (
    <Box>
      <PageHeader
        title="Estoque"
        subtitle="Controle de materiais e insumos"
        action={
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={exportCsv}>
              Exportar CSV
            </Button>
            {canEdit && (
              <Button
                variant="outlined"
                startIcon={<ShoppingCartIcon />}
                onClick={() => setBulkOpen(true)}
              >
                Compra em lote
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
                Novo item
              </Button>
            )}
          </Stack>
        }
      />

      {lowStockCount > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {lowStockCount} ite{lowStockCount === 1 ? 'm' : 'ns'} abaixo do estoque mínimo.
        </Alert>
      )}

      <Card sx={{ p: { xs: 1.5, sm: 2 } }}>
        <ListFiltersBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar por nome ou SKU"
          filteredCount={filteredItems.length}
          totalCount={items.length}
          countLabel={filteredItems.length === 1 ? 'item' : 'itens'}
        >
          <TextField
            select
            size="small"
            label="Estoque"
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value as StockFilter)}
            sx={FILTER_FIELD_SX}
          >
            <MenuItem value="ALL">Todos</MenuItem>
            <MenuItem value="LOW">Abaixo do mínimo</MenuItem>
          </TextField>
        </ListFiltersBar>

        <AppDataGrid
          rows={filteredItems}
          columns={columns}
          loading={isLoading}
          localeText={{
            noRowsLabel:
              items.length === 0
                ? 'Nenhum item no estoque'
                : 'Nenhum item encontrado com os filtros',
            footerRowSelected: (count) => `${count} selecionado(s)`,
          }}
        />
      </Card>

      <InventoryFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        item={editing}
      />
      <MovementDialog
        open={!!movementItem}
        onClose={() => setMovementItem(null)}
        item={movementItem}
      />
      <BulkPurchaseDialog open={bulkOpen} onClose={() => setBulkOpen(false)} />
      {auditTarget && (
        <AuditHistoryDialog
          open={!!auditTarget}
          onClose={() => setAuditTarget(null)}
          entity="InventoryItem"
          entityId={auditTarget.id}
          title={auditTarget.name}
        />
      )}
    </Box>
  );
}

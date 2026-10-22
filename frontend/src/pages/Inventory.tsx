import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  IconButton,
  InputBase,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import PostAddOutlinedIcon from '@mui/icons-material/PostAddOutlined';
import SearchIcon from '@mui/icons-material/Search';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import { downloadCsv } from '../utils/csv';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { urlPage, useUrlState } from '../hooks/useUrlState';
import { STOCK_FILTER_CODEC, matchFields, type StockFilter } from '../utils/listFilters';
import { inventoryApi } from '../api/inventory';
import { InventoryFormDialog } from '../components/inventory/InventoryFormDialog';
import { MovementDialog } from '../components/inventory/MovementDialog';
import { BulkPurchaseDialog } from '../components/inventory/BulkPurchaseDialog';
import { InventoryDetailDrawer } from '../components/inventory/InventoryDetailDrawer';
import { StatusPill } from '../components/inventory/InventoryDetailParts';
import {
  EXPIRING_DAYS,
  STOCK_STATUS_COLOR,
  daysToExpiry,
  isLowStock,
} from '../components/inventory/inventoryStatus';
import { useAppDialog } from '../contexts/AppDialogContext';
import { useAppToast } from '../contexts/AppToastContext';
import { getApiErrorMessage } from '../utils/apiError';
import { usePermissions } from '../contexts/usePermissions';
import { formatDateOnlyFromApi } from '../utils/dateOnly';
import type { InventoryItem } from '../types';
import { fontSizes } from '../theme/fontSizes';
import { brl, moneyFormatter } from '../utils/money';

const brlRounded = moneyFormatter({
  maximumFractionDigits: 0,
});
const PAGE_SIZE = 10;
const GRID_COLUMNS = '2.4fr 1fr 1.2fr 1fr 1fr 1fr';

const TOOLBAR_BUTTON_SX = {
  flexShrink: 0,
  whiteSpace: 'nowrap',
  height: 38,
  px: 1.9,
  borderRadius: '11px',
  borderColor: 'divider',
  bgcolor: 'background.paper',
  color: 'text.primary',
  fontSize: fontSizes.sm,
} as const;

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

function formatQty(value: number | string) {
  return Number(Number(value).toFixed(3)).toLocaleString('pt-BR');
}

/** Números das páginas com reticências quando há muitas (ex.: 1 … 4 5 6 … 12). */
function pageWindow(current: number, count: number): (number | null)[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i);
  const pages = new Set([0, count - 1, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 0 && p < count).sort((a, b) => a - b);
  return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1] > 1 ? [null, p] : [p]));
}

export function Inventory() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { confirm, alert } = useAppDialog();
  const toast = useAppToast();
  const { has } = usePermissions();
  const canCreate = has('inventory:create');
  const canEdit = has('inventory:edit');
  const canDelete = has('inventory:delete');

  const [search, setSearch] = useUrlState('busca', '');
  const [stockFilter, setStockFilter] = useUrlState<StockFilter>('estoque', 'ALL', STOCK_FILTER_CODEC);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<InventoryItem | null>(null);
  const [movementOpen, setMovementOpen] = useState(false);
  const [movementItem, setMovementItem] = useState<InventoryItem | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [page, setPage] = useUrlState('pagina', 0, urlPage);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => inventoryApi.list(),
  });

  const stats = useMemo(() => {
    const lowStock = items.filter(isLowStock).length;
    const expiring = items.filter((i) => {
      const days = daysToExpiry(i.expiresAt);
      return days != null && days >= 0 && days <= EXPIRING_DAYS;
    }).length;
    const stockValue = items.reduce(
      (sum, i) => sum + Math.max(0, Number(i.quantity)) * Number(i.costPrice ?? 0),
      0,
    );
    return [
      { label: 'Itens cadastrados', value: String(items.length) },
      { label: 'Estoque baixo', value: String(lowStock), color: lowStock > 0 ? STOCK_STATUS_COLOR.LOW : undefined },
      { label: `Vencendo (${EXPIRING_DAYS}d)`, value: String(expiring), color: expiring > 0 ? STOCK_STATUS_COLOR.EXPIRING : undefined },
      { label: 'Valor em estoque', value: brlRounded.format(stockValue) },
    ];
  }, [items]);

  const filteredItems = useMemo(
    () =>
      items.filter((i) => {
        if (stockFilter === 'LOW' && !isLowStock(i)) return false;
        return matchFields(search, i.name, i.sku, i.description);
      }),
    [items, search, stockFilter],
  );


  const pageCount = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const rows = filteredItems.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => inventoryApi.remove(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setDetailId((open) => (open === id ? null : open));
      toast.success('Item excluído.');
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Não foi possível excluir o item.'));
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

  const openMovement = (item: InventoryItem | null) => {
    setMovementItem(item);
    setMovementOpen(true);
  };

  const openEdit = (item: InventoryItem) => {
    setEditing(item);
    setFormOpen(true);
  };

  const handleDelete = async (item: InventoryItem) => {
    let preview;
    try {
      preview = await inventoryApi.getDeletionPreview(item.id);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Não foi possível verificar o item.';
      await alert({ title: 'Erro', message: msg, severity: 'error' });
      return;
    }

    const procedureNames = preview.procedures.map((p) => p.name);
    const extraLines: string[] = [];
    if (preview.appointmentCount > 0) {
      extraLines.push(`${preview.appointmentCount} agendamento(s) com este material`);
    }
    if (preview.movementsCount > 0 && preview.canDelete) {
      extraLines.push(`${preview.movementsCount} movimentação(ões) de estoque serão removidas`);
    }

    let message = preview.canDelete
      ? `Excluir o item "${item.name}"? Esta ação não pode ser desfeita.`
      : `O item "${item.name}" não pode ser excluído enquanto estiver em uso.`;
    if (preview.appointmentCount > 0 && !preview.canDelete) {
      message += ` Há ${preview.appointmentCount} agendamento(s) com este material.`;
    }

    const ok = await confirm({
      title: 'Excluir item',
      message,
      detailsTitle: procedureNames.length > 0 ? 'Procedimentos que usam este item:' : undefined,
      details:
        procedureNames.length > 0 || extraLines.length > 0
          ? [...procedureNames, ...extraLines]
          : undefined,
      confirmLabel: 'Excluir',
      confirmColor: 'error',
      disableConfirm: !preview.canDelete,
    });
    if (ok) deleteMutation.mutate(item.id);
  };

  return (
    <Box>
      <Stack spacing={2.25}>
        {/* Indicadores */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
            gap: { xs: 1.5, md: 2.25 },
          }}
        >
          {stats.map((s) => (
            <Card
              key={s.label}
              sx={{ px: 2.5, py: 2.25, borderRadius: '16px', border: 1, borderColor: 'divider' }}
            >
              {isLoading ? (
                <Skeleton width={70} height={34} />
              ) : (
                <Typography
                  sx={{
                    fontSize: fontSizes['6xl'],
                    fontWeight: 800,
                    letterSpacing: '-0.5px',
                    lineHeight: 1.2,
                    color: s.color ?? 'text.primary',
                  }}
                >
                  {s.value}
                </Typography>
              )}
              <Typography sx={{ fontSize: fontSizes.sm, color: 'text.secondary', fontWeight: 600, mt: 0.25 }}>
                {s.label}
              </Typography>
            </Card>
          ))}
        </Box>

        {/* Tabela de produtos */}
        <Card sx={{ borderRadius: '18px', border: 1, borderColor: 'divider', overflow: 'hidden' }}>
          <Stack
            direction={{ xs: 'column', lg: 'row' }}
            alignItems={{ xs: 'stretch', lg: 'center' }}
            justifyContent="space-between"
            spacing={1.5}
            sx={{ px: { xs: 2, sm: 2.75 }, py: 2.25, borderBottom: 1, borderColor: 'divider' }}
          >
            <Typography component="h3" sx={{ fontSize: fontSizes.xl, fontWeight: 700 }}>
              Produtos &amp; insumos
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
                  width: { xs: '100%', sm: 210 },
                }}
              >
                <SearchIcon sx={{ fontSize: 17, color: 'text.disabled' }} />
                <InputBase
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(0);
                  }}
                  placeholder="Buscar produto..."
                  inputProps={{ 'aria-label': 'Buscar por nome ou SKU' }}
                  sx={{ fontSize: fontSizes.sm, flex: 1, minWidth: 0 }}
                />
              </Stack>
              <Select
                size="small"
                value={stockFilter}
                onChange={(e) => {
                  setStockFilter(e.target.value as StockFilter);
                  setPage(0);
                }}
                inputProps={{ 'aria-label': 'Filtrar estoque' }}
                sx={{
                  height: 38,
                  minWidth: 160,
                  borderRadius: '11px',
                  bgcolor: 'grey.50',
                  fontSize: fontSizes.sm,
                  fontWeight: 600,
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
                }}
              >
                <MenuItem value="ALL">Todo o estoque</MenuItem>
                <MenuItem value="LOW">Abaixo do mínimo</MenuItem>
              </Select>
              <Tooltip title="Exportar CSV">
                <IconButton onClick={exportCsv} aria-label="Exportar CSV" sx={TOOLBAR_ICON_SX}>
                  <FileDownloadOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              {canCreate && (
                <Button
                  variant="outlined"
                  startIcon={<PostAddOutlinedIcon />}
                  onClick={() => {
                    setEditing(null);
                    setFormOpen(true);
                  }}
                  sx={TOOLBAR_BUTTON_SX}
                >
                  Cadastrar produto
                </Button>
              )}
              <Button
                variant="outlined"
                startIcon={<SwapVertIcon />}
                onClick={() => openMovement(null)}
                disabled={items.length === 0}
                sx={TOOLBAR_BUTTON_SX}
              >
                Movimentar
              </Button>
              {canEdit && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setBulkOpen(true)}
                  sx={{ ...TOOLBAR_BUTTON_SX, border: 0, bgcolor: undefined, color: undefined }}
                >
                  Adicionar item
                </Button>
              )}
            </Stack>
          </Stack>

          <Box sx={{ overflowX: 'auto' }}>
            <Box sx={{ minWidth: 760 }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: GRID_COLUMNS,
                  gap: 1.5,
                  px: 2.75,
                  py: 1.6,
                  borderBottom: 1,
                  borderColor: 'divider',
                  bgcolor: 'grey.50',
                  fontSize: fontSizes['2xs'],
                  fontWeight: 700,
                  color: 'text.disabled',
                  letterSpacing: '0.4px',
                  textTransform: 'uppercase',
                }}
              >
                <span>Produto</span>
                <span>SKU</span>
                <span>Validade</span>
                <span>Qtd / Mín</span>
                <span>Status</span>
                <Box component="span" sx={{ textAlign: 'right' }}>
                  Valor un.
                </Box>
              </Box>

              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <Box key={i} sx={{ px: 2.75, py: 1.25, borderBottom: 1, borderColor: 'grey.100' }}>
                    <Skeleton height={28} />
                  </Box>
                ))
              ) : rows.length === 0 ? (
                <Box sx={{ py: 7, textAlign: 'center' }}>
                  <Inventory2OutlinedIcon sx={{ fontSize: 46, color: 'text.disabled', mb: 1 }} />
                  <Typography sx={{ fontWeight: 700 }}>
                    {items.length === 0 ? 'Nenhum item no estoque' : 'Nenhum item encontrado com os filtros'}
                  </Typography>
                  <Typography color="text.secondary" sx={{ fontSize: fontSizes.md, mt: 0.5 }}>
                    {items.length === 0
                      ? 'Cadastre produtos e insumos para controlar o estoque.'
                      : 'Tente ajustar a busca ou o filtro.'}
                  </Typography>
                </Box>
              ) : (
                rows.map((item) => {
                  const low = isLowStock(item);
                  const days = daysToExpiry(item.expiresAt);
                  return (
                    <Box
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setDetailId(item.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setDetailId(item.id);
                        }
                      }}
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: GRID_COLUMNS,
                        gap: 1.5,
                        px: 2.75,
                        py: 1.75,
                        alignItems: 'center',
                        borderBottom: 1,
                        borderColor: 'grey.100',
                        cursor: 'pointer',
                        transition: 'background .12s',
                        '&:hover, &:focus-visible': { bgcolor: 'grey.50', outline: 'none' },
                      }}
                    >
                      <Typography noWrap title={item.name} sx={{ fontSize: fontSizes.md, fontWeight: 700 }}>
                        {item.name}
                      </Typography>
                      <Typography noWrap sx={{ fontSize: fontSizes.sm, color: 'text.secondary', fontWeight: 600 }}>
                        {item.sku || '—'}
                      </Typography>
                      <Box sx={{ lineHeight: 1.3, minWidth: 0 }}>
                        <Typography sx={{ fontSize: fontSizes.sm, fontWeight: 600 }}>
                          {item.expiresAt ? formatDateOnlyFromApi(item.expiresAt) : '—'}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: fontSizes['2xs'],
                            color:
                              days != null && days < 0
                                ? STOCK_STATUS_COLOR.EXPIRED
                                : days != null && days <= EXPIRING_DAYS
                                  ? STOCK_STATUS_COLOR.EXPIRING
                                  : 'text.disabled',
                          }}
                        >
                          {days == null
                            ? 'sem validade'
                            : days < 0
                              ? `vencido há ${-days} ${days === -1 ? 'dia' : 'dias'}`
                              : days === 0
                                ? 'vence hoje'
                                : `em ${days} ${days === 1 ? 'dia' : 'dias'}`}
                        </Typography>
                      </Box>
                      <Typography
                        sx={{ fontSize: fontSizes.sm, fontWeight: 700, color: low ? 'error.main' : 'text.primary' }}
                      >
                        {formatQty(item.quantity)} / {formatQty(item.minQuantity)}
                        {item.unit && (
                          <Box component="span" sx={{ color: 'text.disabled', fontWeight: 600 }}>
                            {' '}
                            {item.unit}
                          </Box>
                        )}
                      </Typography>
                      <Box>
                        <StatusPill item={item} />
                      </Box>
                      <Typography sx={{ fontSize: fontSizes.md, fontWeight: 800, textAlign: 'right' }}>
                        {item.costPrice != null ? brl.format(Number(item.costPrice)) : '—'}
                      </Typography>
                    </Box>
                  );
                })
              )}
            </Box>
          </Box>

          {/* Paginação */}
          {!isLoading && filteredItems.length > 0 && (
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              flexWrap="wrap"
              useFlexGap
              spacing={1.5}
              sx={{ px: 2.75, py: 1.75 }}
            >
              <Typography sx={{ fontSize: fontSizes.sm, color: 'text.disabled', fontWeight: 600 }}>
                Mostrando {current * PAGE_SIZE + 1}–{Math.min((current + 1) * PAGE_SIZE, filteredItems.length)} de{' '}
                {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'itens'}
                {filteredItems.length !== items.length && ` (de ${items.length})`}
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

      <InventoryDetailDrawer
        itemId={detailId}
        onClose={() => setDetailId(null)}
        onMovement={openMovement}
        onEdit={canEdit ? openEdit : undefined}
        onDelete={canDelete ? handleDelete : undefined}
        onOpenPage={(id) => navigate(`/estoque/${id}`)}
      />
      <InventoryFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        item={editing}
      />
      <MovementDialog
        open={movementOpen}
        onClose={() => setMovementOpen(false)}
        item={movementItem}
        items={items}
      />
      <BulkPurchaseDialog open={bulkOpen} onClose={() => setBulkOpen(false)} />
    </Box>
  );
}

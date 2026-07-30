import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  IconButton,
  InputBase,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
  alpha,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import HistoryIcon from '@mui/icons-material/History';
import SearchIcon from '@mui/icons-material/Search';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { proceduresApi } from '../api/procedures';
import { ProcedureFormDialog } from '../components/procedures/ProcedureFormDialog';
import { AuditHistoryDialog } from '../components/audit/AuditHistoryDialog';
import { useAppDialog } from '../contexts/AppDialogContext';
import { useAppToast } from '../contexts/AppToastContext';
import { getApiErrorMessage } from '../utils/apiError';
import { usePermissions } from '../contexts/usePermissions';
import type { Procedure } from '../types';
import { fontSizes } from '../theme/fontSizes';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const PAGE_SIZE = 8;
const AVATAR_COLORS = ['#15998B', '#5BA8DE', '#D46B8A', '#E0915B', '#9B7BD4', '#4FB3A8'];
const GRID_COLS = '2fr 1fr 0.7fr 0.7fr 0.9fr 0.9fr 0.9fr 0.95fr 0.95fr 0.75fr 52px';
const GRID_MIN_WIDTH = 1180;
const CATEGORY_SUGGESTIONS = ['Facial', 'Injetáveis', 'Laser', 'Corporal', 'Peeling', 'Depilação', 'Capilar'];

function colorFor(text: string) {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = text.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function initialsFor(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Procedures() {
  const queryClient = useQueryClient();
  const { confirm } = useAppDialog();
  const toast = useAppToast();
  const { has, isAdmin } = usePermissions();
  const canCreate = has('procedures:create');
  const canEdit = has('procedures:edit');
  const canDelete = has('procedures:delete');

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Todos');
  const [page, setPage] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Procedure | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const { data: procedures = [], isLoading } = useQuery({
    queryKey: ['procedures'],
    queryFn: () => proceduresApi.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => proceduresApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['procedures'] });
      toast.success('Procedimento excluído.');
    },
    onError: (err) => toast.error(getApiErrorMessage(err, 'Não foi possível excluir o procedimento.')),
  });

  const categories = useMemo(() => {
    const set = new Set<string>(CATEGORY_SUGGESTIONS);
    procedures.forEach((p) => p.category?.trim() && set.add(p.category.trim()));
    return ['Todos', ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [procedures]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return procedures.filter((p) => {
      if (category !== 'Todos' && (p.category ?? '') !== category) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q) ||
        (p.category ?? '').toLowerCase().includes(q)
      );
    });
  }, [procedures, search, category]);

  useEffect(() => setPage(0), [search, category]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const rows = filtered.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  const handleDelete = async (p: Procedure) => {
    const ok = await confirm({
      title: 'Excluir procedimento',
      message: `Excluir procedimento ${p.name}?`,
      confirmLabel: 'Excluir',
      confirmColor: 'error',
    });
    if (ok) deleteMutation.mutate(p.id);
  };

  return (
    <Box>
      {/* Cabeçalho: abas de categoria + busca + ações (acima do card) */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        alignItems={{ xs: 'stretch', md: 'center' }}
        justifyContent="space-between"
        spacing={1.5}
        sx={{ mb: 2.5 }}
      >
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {categories.map((c) => {
            const active = category === c;
            return (
              <Box
                key={c}
                component="button"
                type="button"
                onClick={() => setCategory(c)}
                sx={{
                  border: 0,
                  cursor: 'pointer',
                  px: 2,
                  height: 36,
                  borderRadius: '10px',
                  fontFamily: 'inherit',
                  fontSize: fontSizes.sm,
                  fontWeight: active ? 700 : 600,
                  color: active ? '#fff' : 'text.secondary',
                  bgcolor: active ? 'primary.main' : 'grey.50',
                  '&:hover': { bgcolor: active ? 'primary.main' : 'grey.100' },
                }}
              >
                {c}
              </Box>
            );
          })}
        </Box>
        <Stack
          direction="row"
          alignItems="center"
          spacing={1.25}
          flexWrap={{ xs: 'wrap', md: 'nowrap' }}
          useFlexGap
          justifyContent={{ md: 'flex-end' }}
          sx={{ minWidth: 0 }}
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{
              height: 38,
              px: 1.75,
              borderRadius: '12px',
              border: 1,
              borderColor: 'divider',
              bgcolor: 'grey.50',
              width: { xs: '100%', sm: 220 },
              minWidth: 0,
            }}
          >
            <SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
            <InputBase
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar procedimento..."
              sx={{ fontSize: fontSizes.sm, flex: 1 }}
            />
          </Stack>
          {isAdmin && (
            <Tooltip title="Histórico de alterações">
              <IconButton
                onClick={() => setHistoryOpen(true)}
                sx={{ flexShrink: 0, width: 38, height: 38, borderRadius: '12px', border: 1, borderColor: 'divider', bgcolor: 'background.paper', color: 'text.secondary' }}
              >
                <HistoryIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {canCreate && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
              sx={{ flexShrink: 0, whiteSpace: 'nowrap', height: 38, px: 2.25, borderRadius: '12px', boxShadow: (t) => `0 6px 16px -6px ${t.palette.primary.main}` }}
            >
              Novo procedimento
            </Button>
          )}
        </Stack>
      </Stack>

      <Card sx={{ p: 0, overflow: 'hidden' }}>
        <Box sx={{ overflowX: 'auto' }}>
        {/* Cabeçalho de colunas */}
        <Box
          sx={{
            display: { xs: 'none', md: 'grid' },
            gridTemplateColumns: GRID_COLS,
            minWidth: GRID_MIN_WIDTH,
            gap: 1.5,
            px: 2.75,
            py: 1.5,
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'grey.50',
            fontSize: fontSizes['2xs'],
            fontWeight: 800,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: 'text.secondary',
          }}
        >
          <span>Procedimento</span>
          <span>Categoria</span>
          <span>Duração</span>
          <span>Realizados</span>
          <span>Custo mat.</span>
          <span>Taxa pgto.</span>
          <span>Desp. fixa</span>
          <span>Custo total</span>
          <span>Valor</span>
          <span>Margem</span>
          <span />
        </Box>

        {/* Linhas */}
        {isLoading ? (
          <Box sx={{ px: 2.75, py: 2 }}>
            <Stack spacing={1.25}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} variant="rounded" height={52} />
              ))}
            </Stack>
          </Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ px: 2.75, py: 6, textAlign: 'center' }}>
            <Typography color="text.secondary">
              {procedures.length === 0
                ? 'Nenhum procedimento cadastrado.'
                : 'Nenhum procedimento encontrado.'}
            </Typography>
          </Box>
        ) : (
          rows.map((p) => {
            const color = colorFor(p.name);
            const catColor = p.category ? colorFor(p.category) : '#8B8680';
            const margin = p.profitMargin;
            const marginTone = margin == null ? '#8B8680' : margin < 50 ? '#C25A4C' : '#15998B';
            return (
              <Box
                key={p.id}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr auto', md: GRID_COLS },
                  minWidth: { md: GRID_MIN_WIDTH },
                  gap: 1.5,
                  px: { xs: 2, md: 2.75 },
                  py: 1.5,
                  borderBottom: 1,
                  borderColor: 'divider',
                  alignItems: 'center',
                  opacity: p.active ? 1 : 0.55,
                  '&:hover': { bgcolor: 'grey.50' },
                  '&:last-of-type': { borderBottom: 0 },
                }}
              >
                {/* Procedimento */}
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '11px',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: fontSizes.sm,
                      fontWeight: 800,
                      color: '#fff',
                      bgcolor: color,
                    }}
                  >
                    {initialsFor(p.name)}
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: fontSizes.md, fontWeight: 700 }} noWrap title={p.name}>
                      {p.name}
                    </Typography>
                    <Typography sx={{ fontSize: fontSizes.xs, color: 'text.secondary' }} noWrap>
                      {p.recurrenceDays ? `Retorno: ${p.recurrenceDays} dias` : 'Sem retorno'}
                      {!p.active ? ' · Inativo' : ''}
                    </Typography>
                  </Box>
                </Stack>

                {/* Categoria */}
                <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                  {p.category ? (
                    <Box
                      component="span"
                      sx={{
                        display: 'inline-block',
                        fontSize: fontSizes.xs,
                        fontWeight: 700,
                        px: 1,
                        py: 0.4,
                        borderRadius: '8px',
                        color: catColor,
                        bgcolor: alpha(catColor, 0.14),
                      }}
                    >
                      {p.category}
                    </Box>
                  ) : (
                    <Typography sx={{ fontSize: fontSizes.sm, color: 'text.disabled' }}>—</Typography>
                  )}
                </Box>

                {/* Duração */}
                <Typography sx={{ display: { xs: 'none', md: 'block' }, fontSize: fontSizes.sm, color: 'text.secondary', fontWeight: 600 }}>
                  {p.durationMinutes} min
                </Typography>

                {/* Realizados */}
                <Typography sx={{ display: { xs: 'none', md: 'block' }, fontSize: fontSizes.sm, color: 'text.secondary', fontWeight: 600 }}>
                  {p.appointmentsCount ?? 0}×
                </Typography>

                {/* Custo mat. */}
                <Typography sx={{ display: { xs: 'none', md: 'block' }, fontSize: fontSizes.sm, color: 'text.secondary', fontWeight: 700 }}>
                  {p.baseCost ? brl.format(p.baseCost) : '—'}
                </Typography>

                {/* Taxa pgto. */}
                <Tooltip title={p.maxFeePercent ? `Maior taxa ativa: ${p.maxFeePercent.toFixed(1)}%` : ''}>
                  <Typography sx={{ display: { xs: 'none', md: 'block' }, fontSize: fontSizes.sm, color: 'text.secondary', fontWeight: 600 }}>
                    {p.maxFeeCost ? brl.format(p.maxFeeCost) : '—'}
                  </Typography>
                </Tooltip>

                {/* Desp. fixa */}
                <Tooltip
                  title={
                    p.hourlyCost
                      ? `Custo/hora: ${brl.format(p.hourlyCost)} × ${p.durationMinutes} min`
                      : 'Despesa fixa proporcional ao tempo'
                  }
                >
                  <Typography sx={{ display: { xs: 'none', md: 'block' }, fontSize: fontSizes.sm, color: 'text.secondary', fontWeight: 600 }}>
                    {p.fixedCostShare ? brl.format(p.fixedCostShare) : '—'}
                  </Typography>
                </Tooltip>

                {/* Custo total */}
                <Typography sx={{ display: { xs: 'none', md: 'block' }, fontSize: fontSizes.sm, fontWeight: 800, color: 'error.main' }}>
                  {p.totalCost != null ? brl.format(p.totalCost) : '—'}
                </Typography>

                {/* Valor */}
                <Typography sx={{ display: { xs: 'none', md: 'block' }, fontSize: fontSizes.md, fontWeight: 800 }}>
                  {brl.format(Number(p.price))}
                </Typography>

                {/* Margem */}
                <Box sx={{ display: { xs: 'none', md: 'flex' }, justifyContent: 'flex-start' }}>
                  <Box
                    component="span"
                    sx={{
                      fontSize: fontSizes.xs,
                      fontWeight: 800,
                      px: 1,
                      py: 0.4,
                      borderRadius: '8px',
                      color: marginTone,
                      bgcolor: alpha(marginTone, 0.14),
                    }}
                  >
                    {margin == null ? '—' : `${margin.toFixed(0)}%`}
                  </Box>
                </Box>

                {/* Ações */}
                <Stack direction="row" spacing={0.25} justifyContent="flex-end">
                  {canEdit && (
                    <Tooltip title="Editar">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditing(p);
                          setFormOpen(true);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {canDelete && (
                    <Tooltip title="Excluir">
                      <IconButton size="small" onClick={() => handleDelete(p)} sx={{ color: 'error.main' }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
              </Box>
            );
          })
        )}
        </Box>

        {/* Paginação */}
        {!isLoading && filtered.length > 0 && (
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ px: 2.75, py: 1.75, borderTop: 1, borderColor: 'divider' }}
          >
            <Typography sx={{ fontSize: fontSizes.xs, color: 'text.secondary', fontWeight: 600 }}>
              {current * PAGE_SIZE + 1}–{Math.min((current + 1) * PAGE_SIZE, filtered.length)} de {filtered.length}
            </Typography>
            <Stack direction="row" spacing={0.75}>
              <IconButton
                size="small"
                disabled={current === 0}
                onClick={() => setPage((v) => Math.max(0, v - 1))}
                sx={{ border: 1, borderColor: 'divider', borderRadius: '9px' }}
              >
                <ChevronLeftIcon fontSize="small" />
              </IconButton>
              <IconButton
                size="small"
                disabled={current >= pageCount - 1}
                onClick={() => setPage((v) => Math.min(pageCount - 1, v + 1))}
                sx={{ border: 1, borderColor: 'divider', borderRadius: '9px' }}
              >
                <ChevronRightIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>
        )}
      </Card>

      <ProcedureFormDialog open={formOpen} onClose={() => setFormOpen(false)} procedure={editing} />
      <AuditHistoryDialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        entity="Procedure"
        title="Procedimentos"
      />
    </Box>
  );
}

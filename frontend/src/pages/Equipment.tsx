import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import {
  Box,
  Button,
  Card,
  IconButton,
  InputBase,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import HistoryIcon from '@mui/icons-material/History';
import BuildIcon from '@mui/icons-material/Build';
import SearchIcon from '@mui/icons-material/Search';
import MemoryOutlinedIcon from '@mui/icons-material/MemoryOutlined';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { dayjsFromDateOnlyApi, formatDateOnlyFromApi } from '../utils/dateOnly';

import {
  matchFields,
  matchesActiveFilter,
  type ActiveFilter,
  type MaintenanceFilter,
} from '../utils/listFilters';
import { equipmentApi } from '../api/equipment';
import { EquipmentFormDialog } from '../components/equipment/EquipmentFormDialog';
import { AuditHistoryDialog } from '../components/audit/AuditHistoryDialog';
import { useAppDialog } from '../contexts/AppDialogContext';
import { useAppToast } from '../contexts/AppToastContext';
import { getApiErrorMessage } from '../utils/apiError';
import { usePermissions } from '../contexts/usePermissions';
import type { Equipment } from '../types';
import { fontSizes } from '../theme/fontSizes';

const ICON_COLORS = ['#15998B', '#E0915B', '#5BA8DE', '#D46B8A', '#9B7BD4', '#4FB3A8'];
const PAGE_SIZE = 12;

const TOOLBAR_SELECT_SX = {
  flexShrink: 0,
  width: { xs: 'calc(50% - 5px)', sm: 'auto' },
  minWidth: { sm: 150 },
  '& .MuiOutlinedInput-root': {
    height: 38,
    borderRadius: '12px',
    fontSize: fontSizes.sm,
    bgcolor: 'background.paper',
  },
} as const;

const ACTION_BUTTON_SX = {
  width: 30,
  height: 30,
  borderRadius: '9px',
  border: 1,
  borderColor: 'divider',
  color: 'text.secondary',
} as const;

function colorFor(text: string) {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = text.charCodeAt(i) + ((hash << 5) - hash);
  return ICON_COLORS[Math.abs(hash) % ICON_COLORS.length];
}

function formatCurrency(value?: number | null) {
  if (value == null) return '—';
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Dias até a data (negativo = atrasada); null se não houver data. */
function daysUntil(value?: string | null) {
  const d = dayjsFromDateOnlyApi(value);
  return d ? d.diff(dayjs(), 'day') : null;
}

function nextMaintenanceOf(e: Equipment) {
  return e.scheduledMaintenanceAt ?? e.nextMaintenanceAt;
}

/** Percentual decorrido do ciclo entre a última manutenção (ou aquisição) e a próxima. */
function maintenanceCyclePct(e: Equipment) {
  const next = dayjsFromDateOnlyApi(nextMaintenanceOf(e));
  if (!next) return null;
  const today = dayjs();
  if (next.diff(today, 'day') < 0) return 100;
  const start =
    dayjsFromDateOnlyApi(e.lastMaintenanceAt) ??
    (e.maintenanceIntervalMonths ? next.subtract(e.maintenanceIntervalMonths, 'month') : null) ??
    dayjsFromDateOnlyApi(e.purchaseDate);
  if (!start) return null;
  const total = next.diff(start, 'day');
  if (total <= 0) return 100;
  return Math.round(Math.min(100, Math.max(0, (today.diff(start, 'day') / total) * 100)));
}

function dueLabel(days: number | null) {
  if (days == null) return 'Sem previsão';
  if (days < 0) return `Atrasada há ${-days} ${-days === 1 ? 'dia' : 'dias'}`;
  if (days === 0) return 'Hoje';
  return `Em ${days} ${days === 1 ? 'dia' : 'dias'}`;
}

type Tone = 'success' | 'warning' | 'error' | 'default';

function dateTone(days: number | null, okTone: Tone): Tone {
  if (days == null) return 'default';
  if (days < 0) return 'error';
  if (days <= 30) return 'warning';
  return okTone;
}

function toneColor(tone: Tone) {
  return tone === 'default' ? 'text.primary' : `${tone}.main`;
}

function StatCard({
  label,
  value,
  tone = 'default',
  loading,
}: {
  label: string;
  value: number;
  tone?: Tone;
  loading?: boolean;
}) {
  return (
    <Card sx={{ p: { xs: 2, sm: 2.25 }, borderRadius: '16px' }}>
      {loading ? (
        <Skeleton variant="text" width={60} sx={{ fontSize: fontSizes['6xl'] }} />
      ) : (
        <Typography
          sx={{
            fontSize: { xs: '1.4rem', sm: '1.65rem' },
            fontWeight: 800,
            letterSpacing: '-0.5px',
            color: toneColor(tone),
          }}
        >
          {value}
        </Typography>
      )}
      <Typography sx={{ fontSize: fontSizes.xs, color: 'text.secondary', fontWeight: 600, mt: 0.25 }}>
        {label}
      </Typography>
    </Card>
  );
}

function DetailItem({ label, value, tone = 'default' }: { label: string; value: string; tone?: Tone }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={{ fontSize: fontSizes['2xs'], color: 'text.disabled', fontWeight: 600 }}>
        {label}
      </Typography>
      <Typography noWrap sx={{ fontSize: fontSizes.sm, fontWeight: 700, color: toneColor(tone) }}>
        {value}
      </Typography>
    </Box>
  );
}

export function EquipmentPage() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { confirm } = useAppDialog();
  const toast = useAppToast();
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      toast.success('Equipamento excluído.');
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Não foi possível excluir o equipamento.'));
    },
  });

  const maintenanceMutation = useMutation({
    mutationFn: (id: string) => equipmentApi.registerMaintenance(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipment'] });
      toast.success('Manutenção registrada.');
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Não foi possível registrar a manutenção.'));
    },
  });

  const isMaintenanceDue = (e: Equipment) => {
    const days = daysUntil(nextMaintenanceOf(e));
    return days != null && days <= 30;
  };

  const stats = useMemo(() => {
    let overdue = 0;
    let upcoming = 0;
    for (const e of items) {
      const days = daysUntil(nextMaintenanceOf(e));
      if (days == null) continue;
      if (days < 0) overdue += 1;
      else if (days <= 30) upcoming += 1;
    }
    return { total: items.length, active: items.filter((e) => e.active).length, overdue, upcoming };
  }, [items]);

  const filteredItems = useMemo(
    () =>
      items.filter((e) => {
        if (!matchesActiveFilter(e.active, activeFilter)) return false;
        if (maintenanceFilter === 'DUE' && !isMaintenanceDue(e)) return false;
        return matchFields(search, e.name, e.brand, e.model);
      }),
    [items, search, activeFilter, maintenanceFilter],
  );

  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [search, activeFilter, maintenanceFilter]);

  const pageCount = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const rows = filteredItems.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  const handleEdit = (e: Equipment) => {
    setEditing(e);
    setFormOpen(true);
  };

  const handleMaintenance = async (ev: MouseEvent, e: Equipment) => {
    ev.stopPropagation();
    const ok = await confirm({
      title: 'Registrar manutenção',
      message: `Registrar manutenção de ${e.name} agora?`,
      confirmLabel: 'Registrar',
    });
    if (ok) maintenanceMutation.mutate(e.id);
  };

  const handleDelete = async (ev: MouseEvent, e: Equipment) => {
    ev.stopPropagation();
    const ok = await confirm({
      title: 'Excluir equipamento',
      message: `Excluir ${e.name}?`,
      confirmLabel: 'Excluir',
      confirmColor: 'error',
    });
    if (ok) deleteMutation.mutate(e.id);
  };

  return (
    <Box>
      {/* Cards de estatística */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: { xs: 1.5, sm: 2 },
          mb: { xs: 2, sm: 2.5 },
        }}
      >
        <StatCard label="Equipamentos" value={stats.total} loading={isLoading} />
        <StatCard label="Operacionais" value={stats.active} tone="success" loading={isLoading} />
        <StatCard label="Manut. atrasada" value={stats.overdue} tone="warning" loading={isLoading} />
        <StatCard label="Manut. próx. 30d" value={stats.upcoming} loading={isLoading} />
      </Box>

      {/* Título + filtros + ações */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        alignItems={{ xs: 'stretch', md: 'center' }}
        justifyContent="space-between"
        spacing={1.5}
        sx={{ mb: 2.5 }}
      >
        <Typography sx={{ fontSize: fontSizes.xl, fontWeight: 700 }}>Equipamentos</Typography>

        <Stack
          direction="row"
          alignItems="center"
          spacing={1.25}
          flexWrap={{ xs: 'wrap', md: 'nowrap' }}
          useFlexGap
          justifyContent={{ md: 'flex-end' }}
          sx={{ minWidth: 0 }}
        >
          <TextField
            select
            size="small"
            value={maintenanceFilter}
            onChange={(e) => setMaintenanceFilter(e.target.value as MaintenanceFilter)}
            sx={TOOLBAR_SELECT_SX}
            inputProps={{ 'aria-label': 'Manutenção' }}
          >
            <MenuItem value="ALL">Todas as manutenções</MenuItem>
            <MenuItem value="DUE">Próxima ou atrasada</MenuItem>
          </TextField>
          <TextField
            select
            size="small"
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value as ActiveFilter)}
            sx={TOOLBAR_SELECT_SX}
            inputProps={{ 'aria-label': 'Status' }}
          >
            <MenuItem value="ALL">Todos os status</MenuItem>
            <MenuItem value="ACTIVE">Ativos</MenuItem>
            <MenuItem value="INACTIVE">Inativos</MenuItem>
          </TextField>
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
              width: { xs: '100%', sm: 230 },
              minWidth: 0,
            }}
          >
            <SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
            <InputBase
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar equipamento..."
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
              Adicionar equipamento
            </Button>
          )}
        </Stack>
      </Stack>

      {/* Lista de cards */}
      {isLoading ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 2.25 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={250} sx={{ borderRadius: '18px' }} />
          ))}
        </Box>
      ) : filteredItems.length === 0 ? (
        <Card sx={{ p: 6, textAlign: 'center', borderRadius: '18px' }}>
          <MemoryOutlinedIcon sx={{ fontSize: 46, color: 'text.disabled', mb: 1 }} />
          <Typography sx={{ fontWeight: 700 }}>
            {items.length === 0 ? 'Nenhum equipamento cadastrado' : 'Nenhum equipamento encontrado'}
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: fontSizes.md, mt: 0.5 }}>
            {items.length === 0
              ? 'Cadastre as máquinas da clínica para controlar a manutenção preventiva.'
              : 'Tente ajustar a busca ou os filtros.'}
          </Typography>
        </Card>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 2.25 }}>
          {rows.map((e) => {
            const color = colorFor(e.name);
            const nextDays = daysUntil(nextMaintenanceOf(e));
            const scheduledDays = daysUntil(e.scheduledMaintenanceAt);
            const autoDays = daysUntil(e.nextMaintenanceAt);
            const pct = maintenanceCyclePct(e);
            const cycleTone: Tone =
              nextDays != null && nextDays < 0
                ? 'error'
                : pct == null
                  ? 'default'
                  : pct >= 85
                    ? 'error'
                    : pct >= 70
                      ? 'warning'
                      : 'default';
            const barColor =
              cycleTone === 'default' ? theme.palette.primary.main : theme.palette[cycleTone].main;
            const status: { label: string; tone: Tone } = !e.active
              ? { label: 'Inativo', tone: 'default' }
              : nextDays != null && nextDays < 0
                ? { label: 'Manut. atrasada', tone: 'warning' }
                : { label: 'Operacional', tone: 'success' };
            const statusColor =
              status.tone === 'default' ? theme.palette.text.secondary : theme.palette[status.tone].dark;
            const statusBg =
              status.tone === 'default'
                ? theme.palette.grey[100]
                : alpha(theme.palette[status.tone].main, 0.14);
            return (
              <Card
                key={e.id}
                onClick={canEdit ? () => handleEdit(e) : undefined}
                sx={{
                  p: 2.5,
                  borderRadius: '18px',
                  border: 1,
                  borderColor: 'divider',
                  boxShadow: '0 1px 2px rgba(16,40,37,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.75,
                  cursor: canEdit ? 'pointer' : 'default',
                  transition: 'box-shadow .15s, border-color .15s',
                  '&:hover': {
                    boxShadow: '0 12px 30px -20px rgba(16,40,37,0.45)',
                    borderColor: canEdit ? 'primary.main' : alpha(color, 0.5),
                  },
                }}
              >
                {/* Cabeçalho */}
                <Stack direction="row" alignItems="flex-start" spacing={1.6}>
                  <Box
                    sx={{
                      width: 46,
                      height: 46,
                      borderRadius: '13px',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: alpha(color, 0.12),
                      color,
                    }}
                  >
                    <MemoryOutlinedIcon />
                  </Box>
                  <Box sx={{ minWidth: 0, flex: 1, lineHeight: 1.3 }}>
                    <Typography
                      title={e.name}
                      sx={{
                        fontSize: fontSizes.lg,
                        fontWeight: 800,
                        lineHeight: 1.25,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {e.name}
                    </Typography>
                    <Typography noWrap sx={{ fontSize: fontSizes.xs, color: 'text.secondary' }}>
                      {[e.brand, e.model].filter(Boolean).join(' · ') || '—'}
                    </Typography>
                  </Box>
                  <Box
                    component="span"
                    sx={{
                      flexShrink: 0,
                      px: 1.1,
                      py: 0.35,
                      borderRadius: 99,
                      fontSize: fontSizes['2xs'],
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      bgcolor: statusBg,
                      color: statusColor,
                    }}
                  >
                    {status.label}
                  </Box>
                </Stack>

                {/* Ciclo de manutenção */}
                <Box>
                  <Stack direction="row" justifyContent="space-between" spacing={1} sx={{ mb: 0.9 }}>
                    <Typography sx={{ fontSize: fontSizes.xs, color: 'text.secondary', fontWeight: 600 }}>
                      Próxima manutenção
                    </Typography>
                    <Typography sx={{ fontSize: fontSizes.xs, fontWeight: 700, color: nextDays == null ? 'text.disabled' : toneColor(cycleTone) }}>
                      {dueLabel(nextDays)}
                    </Typography>
                  </Stack>
                  <Box sx={{ height: 7, borderRadius: '7px', bgcolor: 'grey.100', overflow: 'hidden' }}>
                    <Box sx={{ height: '100%', width: `${pct ?? 0}%`, borderRadius: '7px', bgcolor: barColor }} />
                  </Box>
                </Box>

                {/* Datas e valores */}
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 2, rowGap: 1.25 }}>
                  <DetailItem
                    label="Manut. agendada"
                    value={formatDateOnlyFromApi(e.scheduledMaintenanceAt) || '—'}
                    tone={dateTone(scheduledDays, 'success')}
                  />
                  <DetailItem
                    label="Próxima (auto)"
                    value={formatDateOnlyFromApi(e.nextMaintenanceAt) || '—'}
                    tone={dateTone(autoDays, 'default')}
                  />
                  <DetailItem label="Valor da máquina" value={formatCurrency(e.purchaseValue)} />
                  <DetailItem label="Valor da manutenção" value={formatCurrency(e.maintenanceValue)} />
                </Box>

                {/* Rodapé */}
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  spacing={1}
                  sx={{ mt: 'auto', pt: 1.5, borderTop: 1, borderColor: 'divider' }}
                >
                  <Typography noWrap sx={{ fontSize: fontSizes.xs, color: 'text.secondary', fontWeight: 600 }}>
                    {e.maintenanceNotifyDaysBefore
                      ? `Aviso ${e.maintenanceNotifyDaysBefore}d antes`
                      : 'Sem aviso'}
                  </Typography>
                  {(canEdit || canDelete) && (
                    <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
                      {canEdit && (
                        <>
                          <Tooltip title="Registrar manutenção agora">
                            <IconButton onClick={(ev) => handleMaintenance(ev, e)} sx={ACTION_BUTTON_SX}>
                              <BuildIcon sx={{ fontSize: 15 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Editar">
                            <IconButton
                              onClick={(ev) => {
                                ev.stopPropagation();
                                handleEdit(e);
                              }}
                              sx={ACTION_BUTTON_SX}
                            >
                              <EditIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                      {canDelete && (
                        <Tooltip title="Excluir">
                          <IconButton onClick={(ev) => handleDelete(ev, e)} sx={{ ...ACTION_BUTTON_SX, color: 'error.main' }}>
                            <DeleteIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  )}
                </Stack>
              </Card>
            );
          })}
        </Box>
      )}

      {/* Paginação */}
      {!isLoading && filteredItems.length > 0 && (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems="center"
          justifyContent="space-between"
          spacing={1.5}
          sx={{ mt: 3 }}
        >
          <Typography sx={{ fontSize: fontSizes.sm, color: 'text.secondary' }}>
            Mostrando {current * PAGE_SIZE + 1}–{Math.min((current + 1) * PAGE_SIZE, filteredItems.length)} de{' '}
            {filteredItems.length}
            {filteredItems.length !== items.length && ` (${items.length} no total)`}
          </Typography>
          {pageCount > 1 && (
            <Stack
              direction="row"
              spacing={1}
              flexWrap="wrap"
              useFlexGap
              justifyContent={{ xs: 'center', sm: 'flex-end' }}
            >
              {Array.from({ length: pageCount }).map((_, i) => {
                const activePage = i === current;
                return (
                  <Box
                    key={i}
                    component="button"
                    type="button"
                    onClick={() => setPage(i)}
                    sx={{
                      minWidth: 38,
                      height: 38,
                      px: 1,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      fontSize: fontSizes.md,
                      fontWeight: 700,
                      borderRadius: '10px',
                      border: 1,
                      borderColor: activePage ? 'primary.main' : 'divider',
                      color: activePage ? '#fff' : 'text.secondary',
                      bgcolor: activePage ? 'primary.main' : 'background.paper',
                      '&:hover': { bgcolor: activePage ? 'primary.main' : 'grey.50' },
                    }}
                  >
                    {i + 1}
                  </Box>
                );
              })}
            </Stack>
          )}
        </Stack>
      )}

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

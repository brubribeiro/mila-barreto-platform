import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Dialog,
  IconButton,
  InputBase,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  TextField,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { auditLogsApi, type AuditLogFilters } from '../../api/auditLogs';
import { AuroraIcon } from '../AuroraIcon';
import { DialogHeader } from '../DialogCloseButton';
import { actionConfig, flattenAuditLogs, type AuditChangeRow } from './auditUtils';
import { fontSizes } from '../../theme/fontSizes';

const ACTION_OPTIONS = [
  { value: '', label: 'Todas as ações' },
  { value: 'CREATE', label: 'Criação' },
  { value: 'UPDATE', label: 'Edição' },
  { value: 'DELETE', label: 'Exclusão' },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const GRID_COLS = '128px minmax(0, 1.1fr) 96px minmax(0, 0.9fr) minmax(0, 1fr) minmax(0, 1fr)';

// Mesmo visual dos selects das barras de filtro das telas (ex.: Usuários)
const TOOLBAR_SELECT_SX = {
  flexShrink: 0,
  '& .MuiOutlinedInput-root': {
    height: 38,
    borderRadius: '12px',
    bgcolor: 'grey.50',
    fontSize: fontSizes.sm,
    fontWeight: 600,
    color: 'text.secondary',
  },
  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
} as const;

interface AuditHistoryDialogProps {
  open: boolean;
  onClose: () => void;
  entity: string;
  title?: string;
}

const AUDIT_DIALOG_HEIGHT = 720;

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

const PAGER_BUTTON_SX = { border: 1, borderColor: 'divider', borderRadius: '9px' } as const;

export function AuditHistoryDialog({ open, onClose, entity, title }: AuditHistoryDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [filters, setFilters] = useState<Omit<AuditLogFilters, 'entity'>>({});
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });

  const queryFilters: AuditLogFilters = {
    entity,
    ...filters,
    page: paginationModel.page + 1,
    limit: paginationModel.pageSize,
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['audit-logs', queryFilters],
    queryFn: () => auditLogsApi.findAll(queryFilters).then((r) => r.data),
    enabled: open,
    staleTime: 15_000,
  });

  const rows = useMemo(() => flattenAuditLogs(data?.data ?? []), [data?.data]);

  const total = data?.total ?? 0;
  const { page, pageSize } = paginationModel;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const updateFilter = (patch: Partial<AuditLogFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPaginationModel((p) => ({ ...p, page: 0 }));
  };

  const handleClose = () => {
    onClose();
    setFilters({});
    setPaginationModel({ page: 0, pageSize: 25 });
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : '20px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          ...(isMobile
            ? { height: '100%', maxHeight: '100dvh' }
            : { height: AUDIT_DIALOG_HEIGHT, maxHeight: '94dvh' }),
        },
      }}
    >
      <DialogHeader
        onClose={handleClose}
        isMobile={isMobile}
        title="Histórico de alterações"
        subtitle={title ?? 'Registro de criações, edições e exclusões'}
        subtitleTitle={title}
        icon={<AuroraIcon name="clock" size={20} strokeWidth={1.9} />}
        trailing={
          data?.total != null ? (
            <Box
              component="span"
              sx={{
                flexShrink: 0,
                px: 1.25,
                py: 0.5,
                borderRadius: 999,
                bgcolor: (t) => alpha(t.palette.primary.main, 0.1),
                color: 'primary.dark',
                fontSize: fontSizes.xs,
                fontWeight: 700,
                whiteSpace: 'nowrap',
              }}
            >
              {data.total} {data.total === 1 ? 'registro' : 'registros'}
            </Box>
          ) : undefined
        }
      />

      {/* Filtros */}
      <Stack
        direction="row"
        spacing={1.25}
        useFlexGap
        flexWrap={{ xs: 'wrap', md: 'nowrap' }}
        alignItems="center"
        sx={{ px: { xs: 2, sm: 3 }, py: 1.75, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}
      >
        <TextField
          select
          size="small"
          value={filters.action ?? ''}
          onChange={(e) => updateFilter({ action: e.target.value || undefined })}
          inputProps={{ 'aria-label': 'Ação' }}
          SelectProps={{ displayEmpty: true }}
          sx={{ ...TOOLBAR_SELECT_SX, width: { xs: '100%', md: 180 } }}
        >
          {ACTION_OPTIONS.map((o) => (
            <MenuItem key={o.value} value={o.value}>
              {o.label}
            </MenuItem>
          ))}
        </TextField>
        <Box sx={{ flex: 1, display: { xs: 'none', md: 'block' } }} />
        <PeriodField label="De" value={filters.startDate ?? ''} onChange={(v) => updateFilter({ startDate: v || undefined })} />
        <PeriodField label="Até" value={filters.endDate ?? ''} onChange={(v) => updateFilter({ endDate: v || undefined })} />
      </Stack>

      {/* Tabela */}
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <Box
          sx={{
            display: { xs: 'none', md: 'grid' },
            gridTemplateColumns: GRID_COLS,
            gap: 1.5,
            px: 3,
            py: 1.5,
            position: 'sticky',
            top: 0,
            zIndex: 1,
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'grey.50',
            fontSize: fontSizes['2xs'],
            fontWeight: 800,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: 'text.disabled',
          }}
        >
          <span>Data/hora</span>
          <span>Usuário</span>
          <span>Ação</span>
          <span>Campo</span>
          <span>Valor anterior</span>
          <span>Valor novo</span>
        </Box>

        {error ? (
          <Box sx={{ p: { xs: 2, sm: 3 } }}>
            <Alert severity="error">Erro ao carregar histórico</Alert>
          </Box>
        ) : isLoading ? (
          <Stack spacing={1.25} sx={{ px: { xs: 2, sm: 3 }, py: 2 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" height={44} />
            ))}
          </Stack>
        ) : rows.length === 0 ? (
          <Box sx={{ px: 2.5, py: 6, textAlign: 'center' }}>
            <Typography color="text.secondary">Nenhuma alteração registrada</Typography>
          </Box>
        ) : (
          rows.map((row) => <AuditRow key={row.id} row={row} />)
        )}
      </Box>

      {/* Paginação */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={1}
        sx={{ px: { xs: 2, sm: 3 }, py: 1.25, borderTop: 1, borderColor: 'divider', flexShrink: 0, bgcolor: 'background.paper' }}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography sx={{ fontSize: fontSizes.xs, color: 'text.secondary', fontWeight: 600, display: { xs: 'none', sm: 'block' } }}>
            Por página
          </Typography>
          <Select
            size="small"
            value={pageSize}
            onChange={(e) => setPaginationModel({ page: 0, pageSize: Number(e.target.value) })}
            inputProps={{ 'aria-label': 'Registros por página' }}
            sx={{
              height: 30,
              borderRadius: '9px',
              fontSize: fontSizes.xs,
              fontWeight: 700,
              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
            }}
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <MenuItem key={n} value={n}>
                {n}
              </MenuItem>
            ))}
          </Select>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography sx={{ fontSize: fontSizes.xs, color: 'text.secondary', fontWeight: 600 }}>
            {total === 0 ? 'Nenhum registro' : `Mostrando ${page * pageSize + 1}–${Math.min((page + 1) * pageSize, total)} de ${total}`}
          </Typography>
          <IconButton
            size="small"
            aria-label="Página anterior"
            disabled={page === 0}
            onClick={() => setPaginationModel((p) => ({ ...p, page: p.page - 1 }))}
            sx={PAGER_BUTTON_SX}
          >
            <AuroraIcon name="chevronLeft" size={18} strokeWidth={2} />
          </IconButton>
          <IconButton
            size="small"
            aria-label="Próxima página"
            disabled={page >= pageCount - 1}
            onClick={() => setPaginationModel((p) => ({ ...p, page: p.page + 1 }))}
            sx={PAGER_BUTTON_SX}
          >
            <AuroraIcon name="chevronRight" size={18} strokeWidth={2} />
          </IconButton>
        </Stack>
      </Stack>
    </Dialog>
  );
}

function PeriodField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Stack
      component="label"
      direction="row"
      alignItems="center"
      spacing={1}
      sx={{
        flex: { xs: 1, md: 'none' },
        minWidth: 0,
        height: 38,
        pl: 1.5,
        pr: 1,
        borderRadius: '12px',
        border: 1,
        borderColor: 'divider',
        bgcolor: 'grey.50',
      }}
    >
      <Typography sx={{ fontSize: fontSizes.xs, fontWeight: 700, color: 'text.disabled' }}>{label}</Typography>
      <InputBase
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputProps={{ 'aria-label': label }}
        sx={{ flex: 1, minWidth: 0, fontSize: fontSizes.sm, fontWeight: 600, width: { md: 128 } }}
      />
    </Stack>
  );
}

function AuditRow({ row }: { row: AuditChangeRow }) {
  const cfg = actionConfig[row.action];
  const date = dayjs(row.createdAt).format('DD/MM/YYYY HH:mm');
  const pill = (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        fontSize: fontSizes.xs,
        fontWeight: 700,
        px: 1,
        py: 0.4,
        borderRadius: '8px',
        whiteSpace: 'nowrap',
        color: `${cfg.color}.dark`,
        bgcolor: (t) => alpha(t.palette[cfg.color].main, 0.12),
      }}
    >
      {cfg.label}
    </Box>
  );

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'minmax(0, 1fr) auto', md: GRID_COLS },
        gap: { xs: 0.5, md: 1.5 },
        px: { xs: 2, md: 3 },
        py: 1.5,
        borderBottom: 1,
        borderColor: 'grey.100',
        alignItems: 'center',
        '&:hover': { bgcolor: 'grey.50' },
      }}
    >
      {/* Desktop: uma coluna por campo */}
      <Typography sx={{ display: { xs: 'none', md: 'block' }, fontSize: fontSizes.sm, color: 'text.secondary' }}>{date}</Typography>
      <Stack direction="row" alignItems="center" spacing={1.25} sx={{ display: { xs: 'none', md: 'flex' }, minWidth: 0 }}>
        <Box
          sx={{
            width: 30,
            height: 30,
            borderRadius: '9px',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: fontSizes['2xs'],
            fontWeight: 800,
            color: 'primary.main',
            bgcolor: (t) => alpha(t.palette.primary.main, 0.09),
          }}
        >
          {initials(row.userName)}
        </Box>
        <Typography noWrap title={row.userName} sx={{ fontSize: fontSizes.sm, fontWeight: 600 }}>
          {row.userName}
        </Typography>
      </Stack>
      <Box sx={{ display: { xs: 'none', md: 'block' } }}>{pill}</Box>
      <Typography noWrap title={row.fieldLabel} sx={{ display: { xs: 'none', md: 'block' }, fontSize: fontSizes.sm, fontWeight: 700 }}>
        {row.fieldLabel}
      </Typography>
      <Box sx={{ display: { xs: 'none', md: 'block' }, minWidth: 0 }}>
        <ChangeValue value={row.oldValue} sx={{ color: 'error.main', textDecoration: 'line-through' }} />
      </Box>
      <Box sx={{ display: { xs: 'none', md: 'block' }, minWidth: 0 }}>
        <ChangeValue value={row.newValue} sx={{ color: 'success.dark', fontWeight: 600 }} />
      </Box>

      {/* Mobile: campo + ação, valores e autoria empilhados */}
      <Box sx={{ display: { xs: 'block', md: 'none' }, minWidth: 0 }}>
        <Typography noWrap sx={{ fontSize: fontSizes.sm, fontWeight: 700 }}>
          {row.fieldLabel}
        </Typography>
        <Stack direction="row" alignItems="baseline" spacing={0.75} sx={{ minWidth: 0, flexWrap: 'wrap' }}>
          {row.oldValue != null && <ChangeValue value={row.oldValue} sx={{ color: 'error.main', textDecoration: 'line-through' }} />}
          {row.oldValue != null && row.newValue != null && (
            <Typography component="span" sx={{ color: 'text.disabled', fontSize: fontSizes.sm }}>
              →
            </Typography>
          )}
          {row.newValue != null && <ChangeValue value={row.newValue} sx={{ color: 'success.dark', fontWeight: 600 }} />}
        </Stack>
        <Typography noWrap sx={{ fontSize: fontSizes.xs, color: 'text.secondary' }}>
          {row.userName} · {date}
        </Typography>
      </Box>
      <Box sx={{ display: { xs: 'block', md: 'none' }, alignSelf: 'start' }}>{pill}</Box>
    </Box>
  );
}

function ChangeValue({ value, sx }: { value: string | null; sx: object }) {
  if (value == null || value === '—') {
    return (
      <Typography component="span" sx={{ fontSize: fontSizes.sm, color: 'text.disabled' }}>
        —
      </Typography>
    );
  }
  return (
    <Typography component="span" title={value} sx={{ display: 'block', fontSize: fontSizes.sm, wordBreak: 'break-word', minWidth: 0, ...sx }}>
      {value}
    </Typography>
  );
}

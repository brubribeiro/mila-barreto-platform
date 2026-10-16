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
  { value: '', label: 'Todas' },
  { value: 'CREATE', label: 'Criação' },
  { value: 'UPDATE', label: 'Edição' },
  { value: 'DELETE', label: 'Exclusão' },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50];

interface AuditHistoryDialogProps {
  open: boolean;
  onClose: () => void;
  entity: string;
  title?: string;
}

const AUDIT_DIALOG_HEIGHT = 720;

type AuditEvent = Pick<AuditChangeRow, 'logId' | 'createdAt' | 'userName' | 'action'> & {
  changes: AuditChangeRow[];
};

/** Agrupa as linhas por registro de log (um card por evento, na ordem da API). */
function groupByLog(rows: AuditChangeRow[]): AuditEvent[] {
  const events: AuditEvent[] = [];
  for (const row of rows) {
    const last = events[events.length - 1];
    if (last?.logId === row.logId) {
      last.changes.push(row);
    } else {
      events.push({ logId: row.logId, createdAt: row.createdAt, userName: row.userName, action: row.action, changes: [row] });
    }
  }
  return events;
}

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

  const events = useMemo(() => groupByLog(flattenAuditLogs(data?.data ?? [])), [data?.data]);

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
        direction={{ xs: 'column', md: 'row' }}
        spacing={1.25}
        alignItems={{ xs: 'stretch', md: 'center' }}
        sx={{ px: { xs: 2, sm: 3 }, py: 1.75, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}
      >
        <Stack
          direction="row"
          role="group"
          aria-label="Ação"
          sx={{
            p: 0.5,
            gap: 0.5,
            borderRadius: '12px',
            bgcolor: 'grey.50',
            border: 1,
            borderColor: 'divider',
            overflowX: 'auto',
            flexShrink: 0,
          }}
        >
          {ACTION_OPTIONS.map((o) => {
            const active = (filters.action ?? '') === o.value;
            return (
              <Box
                key={o.value}
                component="button"
                type="button"
                aria-pressed={active}
                onClick={() => updateFilter({ action: o.value || undefined })}
                sx={{
                  flex: { xs: 1, md: 'none' },
                  height: 30,
                  px: 1.5,
                  border: 0,
                  borderRadius: '9px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  fontFamily: 'inherit',
                  fontSize: fontSizes.sm,
                  fontWeight: 700,
                  bgcolor: active ? 'background.paper' : 'transparent',
                  color: active ? 'primary.dark' : 'text.secondary',
                  boxShadow: active ? '0 1px 3px rgba(16,40,37,.12)' : 'none',
                  '&:hover': { color: 'primary.dark' },
                }}
              >
                {o.label}
              </Box>
            );
          })}
        </Stack>

        <Box sx={{ flex: 1, display: { xs: 'none', md: 'block' } }} />

        <Stack direction="row" spacing={1}>
          <PeriodField label="De" value={filters.startDate ?? ''} onChange={(v) => updateFilter({ startDate: v || undefined })} />
          <PeriodField label="Até" value={filters.endDate ?? ''} onChange={(v) => updateFilter({ endDate: v || undefined })} />
        </Stack>
      </Stack>

      {/* Linha do tempo */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          px: { xs: 2, sm: 3 },
          py: 2,
          bgcolor: 'background.default',
        }}
      >
        {error ? (
          <Alert severity="error">Erro ao carregar histórico</Alert>
        ) : isLoading ? (
          <Stack spacing={1.25}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} variant="rounded" height={104} sx={{ borderRadius: '16px' }} />
            ))}
          </Stack>
        ) : events.length === 0 ? (
          <Stack alignItems="center" justifyContent="center" spacing={1.25} sx={{ height: '100%', minHeight: 220, color: 'text.secondary' }}>
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'background.paper',
                border: 1,
                borderColor: 'divider',
                color: 'text.disabled',
              }}
            >
              <AuroraIcon name="clock" size={24} />
            </Box>
            <Typography sx={{ fontSize: fontSizes.sm, fontWeight: 700 }}>Nenhuma alteração registrada</Typography>
          </Stack>
        ) : (
          <Stack spacing={1.25}>
            {events.map((ev) => (
              <AuditEventCard key={ev.logId} event={ev} isMobile={isMobile} />
            ))}
          </Stack>
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
            {total === 0 ? '0 de 0' : `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, total)} de ${total}`}
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
        borderRadius: '11px',
        border: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
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

function AuditEventCard({ event, isMobile }: { event: AuditEvent; isMobile: boolean }) {
  const cfg = actionConfig[event.action];

  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        borderRadius: '16px',
        border: 1,
        borderColor: 'divider',
        boxShadow: '0 1px 2px rgba(16,40,37,.04)',
        overflow: 'hidden',
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.25} sx={{ px: 2, pt: 1.5, pb: 1.25 }}>
        <Box
          sx={{
            width: 34,
            height: 34,
            borderRadius: '10px',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: (t) => alpha(t.palette.primary.main, 0.12),
            color: 'primary.dark',
            fontSize: fontSizes.xs,
            fontWeight: 800,
          }}
        >
          {initials(event.userName)}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography noWrap sx={{ fontSize: fontSizes.sm, fontWeight: 700, lineHeight: 1.25 }}>
            {event.userName}
          </Typography>
          <Typography sx={{ fontSize: fontSizes.xs, color: 'text.secondary', lineHeight: 1.25 }}>
            {dayjs(event.createdAt).format('DD/MM/YYYY [às] HH:mm')}
          </Typography>
        </Box>
        <Box
          component="span"
          sx={{
            flexShrink: 0,
            px: 1.1,
            py: 0.35,
            borderRadius: 999,
            fontSize: fontSizes['2xs'],
            fontWeight: 800,
            bgcolor: (t) => alpha(t.palette[cfg.color].main, 0.12),
            color: `${cfg.color}.dark`,
          }}
        >
          {cfg.label}
        </Box>
      </Stack>

      <Box sx={{ borderTop: 1, borderColor: 'divider' }}>
        {event.changes.map((c, i) => (
          <Stack
            key={c.id}
            direction={isMobile ? 'column' : 'row'}
            spacing={isMobile ? 0.25 : 2}
            alignItems={isMobile ? 'stretch' : 'baseline'}
            sx={{
              px: 2,
              py: 0.9,
              bgcolor: i % 2 ? 'grey.50' : 'transparent',
            }}
          >
            <Typography
              sx={{
                width: isMobile ? 'auto' : 170,
                flexShrink: 0,
                fontSize: fontSizes.xs,
                fontWeight: 700,
                color: 'text.secondary',
              }}
            >
              {c.fieldLabel}
            </Typography>
            <Stack direction="row" alignItems="baseline" spacing={1} sx={{ minWidth: 0, flex: 1, flexWrap: 'wrap' }}>
              {c.oldValue != null && (
                <ChangeValue value={c.oldValue} sx={{ color: 'error.main', textDecoration: 'line-through' }} />
              )}
              {c.oldValue != null && c.newValue != null && (
                <Typography component="span" sx={{ color: 'text.disabled', fontSize: fontSizes.sm }}>
                  →
                </Typography>
              )}
              {c.newValue != null && <ChangeValue value={c.newValue} sx={{ color: 'success.dark', fontWeight: 600 }} />}
            </Stack>
          </Stack>
        ))}
      </Box>
    </Box>
  );
}

function ChangeValue({ value, sx }: { value: string; sx: object }) {
  if (value === '—') {
    return (
      <Typography component="span" sx={{ fontSize: fontSizes.sm, color: 'text.disabled' }}>
        —
      </Typography>
    );
  }
  return (
    <Typography component="span" title={value} sx={{ fontSize: fontSizes.sm, wordBreak: 'break-word', minWidth: 0, ...sx }}>
      {value}
    </Typography>
  );
}

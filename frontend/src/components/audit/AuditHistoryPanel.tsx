import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Collapse,
  Typography,
  alpha,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { GridColDef } from '@mui/x-data-grid';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { auditLogsApi } from '../../api/auditLogs';
import { AppDataGrid } from '../AppDataGrid';
import { actionConfig, flattenAuditLogs, type AuditChangeRow } from './auditUtils';

interface AuditHistoryPanelProps {
  entity: string;
  entityId: string;
}

export function AuditHistoryPanel({ entity, entityId }: AuditHistoryPanelProps) {
  const [open, setOpen] = useState(false);

  const { data: logs, isLoading, error } = useQuery({
    queryKey: ['audit-logs', entity, entityId],
    queryFn: () => auditLogsApi.byEntity(entity, entityId).then((r) => r.data),
    enabled: open,
    staleTime: 30_000,
  });

  const rows = useMemo(() => flattenAuditLogs(logs ?? []), [logs]);

  const columns = useMemo<GridColDef<AuditChangeRow>[]>(
    () => [
      {
        field: 'createdAt',
        headerName: 'Data/Hora',
        width: 140,
        valueGetter: (params) => dayjs(params.row.createdAt).format('DD/MM/YYYY HH:mm'),
      },
      {
        field: 'userName',
        headerName: 'Usuário',
        flex: 0.8,
        minWidth: 110,
      },
      {
        field: 'action',
        headerName: 'Ação',
        width: 100,
        renderCell: (params) => {
          const cfg = actionConfig[params.row.action];
          return (
            <Chip
              label={cfg.label}
              color={cfg.color}
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.7rem', height: 22 }}
            />
          );
        },
      },
      {
        field: 'fieldLabel',
        headerName: 'Campo',
        flex: 0.7,
        minWidth: 100,
      },
      {
        field: 'oldValue',
        headerName: 'Anterior',
        flex: 1,
        minWidth: 110,
        renderCell: (params) =>
          params.value ? (
            <Typography variant="caption" noWrap title={params.value} sx={{ color: 'error.main' }}>
              {params.value}
            </Typography>
          ) : (
            '—'
          ),
      },
      {
        field: 'newValue',
        headerName: 'Novo',
        flex: 1,
        minWidth: 110,
        renderCell: (params) =>
          params.value ? (
            <Typography variant="caption" noWrap title={params.value} sx={{ color: 'success.dark' }}>
              {params.value}
            </Typography>
          ) : (
            '—'
          ),
      },
    ],
    [],
  );

  return (
    <Box sx={{ mt: 2 }}>
      <Box
        onClick={() => setOpen((o) => !o)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          cursor: 'pointer',
          py: 1,
          px: 1.5,
          borderRadius: 1.5,
          bgcolor: (t) => alpha(t.palette.primary.main, 0.04),
          '&:hover': { bgcolor: (t) => alpha(t.palette.primary.main, 0.08) },
          transition: 'background 150ms',
        }}
      >
        <Typography variant="subtitle2" sx={{ flex: 1, fontWeight: 600 }}>
          Histórico de alterações
        </Typography>
        {open ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
      </Box>

      <Collapse in={open}>
        <Box sx={{ mt: 1.5 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 1 }}>
              Erro ao carregar histórico
            </Alert>
          )}

          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <AppDataGrid
              rows={rows}
              columns={columns}
              loading={isLoading}
              height={320}
              getRowId={(row) => row.id}
              localeText={{
                noRowsLabel: 'Nenhuma alteração registrada',
              }}
            />
          )}
        </Box>
      </Collapse>
    </Box>
  );
}

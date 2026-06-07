import { useMemo } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { GridColDef } from '@mui/x-data-grid';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { auditLogsApi } from '../../api/auditLogs';
import { AppDataGrid } from '../AppDataGrid';
import { actionConfig, flattenAuditLogs, type AuditChangeRow } from './auditUtils';

interface AuditHistoryDialogProps {
  open: boolean;
  onClose: () => void;
  entity: string;
  entityId: string;
  title?: string;
}

export function AuditHistoryDialog({ open, onClose, entity, entityId, title }: AuditHistoryDialogProps) {
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
        width: 150,
        valueGetter: (params) => dayjs(params.row.createdAt).format('DD/MM/YYYY HH:mm'),
      },
      {
        field: 'userName',
        headerName: 'Usuário',
        flex: 0.9,
        minWidth: 130,
      },
      {
        field: 'action',
        headerName: 'Ação',
        width: 110,
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
        flex: 0.8,
        minWidth: 120,
      },
      {
        field: 'oldValue',
        headerName: 'Valor anterior',
        flex: 1,
        minWidth: 140,
        renderCell: (params) =>
          params.value ? (
            <Typography
              variant="body2"
              noWrap
              title={params.value}
              sx={{ color: 'error.main', textDecoration: 'line-through' }}
            >
              {params.value}
            </Typography>
          ) : (
            <Typography variant="body2" color="text.disabled">
              —
            </Typography>
          ),
      },
      {
        field: 'newValue',
        headerName: 'Valor novo',
        flex: 1,
        minWidth: 140,
        renderCell: (params) =>
          params.value ? (
            <Typography variant="body2" noWrap title={params.value} sx={{ color: 'success.dark' }}>
              {params.value}
            </Typography>
          ) : (
            <Typography variant="body2" color="text.disabled">
              —
            </Typography>
          ),
      },
    ],
    [],
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pr: 6 }}>
        Histórico de alterações
        {title && (
          <Typography variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
            — {title}
          </Typography>
        )}
        <IconButton onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: { xs: 1.5, sm: 2 } }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Erro ao carregar histórico
          </Alert>
        )}

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <AppDataGrid
            rows={rows}
            columns={columns}
            loading={isLoading}
            height={460}
            getRowId={(row) => row.id}
            localeText={{
              noRowsLabel: 'Nenhuma alteração registrada',
              footerRowSelected: (count) => `${count} selecionado(s)`,
            }}
            sx={{
              '& .MuiDataGrid-cell': {
                py: 1,
              },
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

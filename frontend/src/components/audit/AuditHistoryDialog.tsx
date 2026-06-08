import { useMemo, useState, type ReactNode } from 'react';
import {
  Alert,
  Box,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import HistoryIcon from '@mui/icons-material/History';
import { GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { auditLogsApi, type AuditLogFilters } from '../../api/auditLogs';
import { AppDataGrid } from '../AppDataGrid';
import { actionConfig, flattenAuditLogs, type AuditChangeRow } from './auditUtils';

const ACTION_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'CREATE', label: 'Criação' },
  { value: 'UPDATE', label: 'Edição' },
  { value: 'DELETE', label: 'Exclusão' },
];

function AuditHeaderIcon({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 40,
        height: 40,
        borderRadius: 2,
        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
        color: 'primary.main',
        flexShrink: 0,
      }}
    >
      {children}
    </Box>
  );
}

interface AuditHistoryDialogProps {
  open: boolean;
  onClose: () => void;
  /** Nome da entidade no backend (ex: "Procedure", "Patient") */
  entity: string;
  title?: string;
}

const AUDIT_DIALOG_HEIGHT = 720;

export function AuditHistoryDialog({ open, onClose, entity, title }: AuditHistoryDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [filters, setFilters] = useState<Omit<AuditLogFilters, 'entity'>>({});
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 25,
  });

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
          params.value && params.value !== '—' ? (
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
          params.value && params.value !== '—' ? (
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

  const handleClose = () => {
    onClose();
    // Reset filters on close
    setFilters({});
    setPaginationModel({ page: 0, pageSize: 25 });
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 3,
          overflow: 'hidden',
          ...(isMobile
            ? { height: '100%', maxHeight: '100dvh' }
            : { height: AUDIT_DIALOG_HEIGHT, maxHeight: '94vh' }),
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
        <DialogTitle
          sx={{
            px: { xs: 2, sm: 3 },
            pt: { xs: 1.5, sm: 2 },
            pb: { xs: 1.5, sm: 2 },
            borderBottom: 1,
            borderColor: 'divider',
            flexShrink: 0,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
            {isMobile && (
              <IconButton edge="start" onClick={handleClose} aria-label="Fechar" size="small">
                <CloseIcon />
              </IconButton>
            )}
            {!isMobile && (
              <AuditHeaderIcon>
                <HistoryIcon fontSize="small" />
              </AuditHeaderIcon>
            )}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant={isMobile ? 'subtitle1' : 'h6'} fontWeight={600} noWrap>
                Histórico de alterações
              </Typography>
              <Typography variant="body2" color="text.secondary" noWrap title={title}>
                {title ?? 'Registro de criações, edições e exclusões'}
              </Typography>
            </Box>
            {data?.total != null && (
              <Chip
                size="small"
                label={`${data.total} ${data.total === 1 ? 'registro' : 'registros'}`}
                variant="outlined"
                sx={{ flexShrink: 0 }}
              />
            )}
          </Stack>
        </DialogTitle>

        <DialogContent
          sx={{
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
            p: { xs: 2, sm: 3 },
            bgcolor: (t) => alpha(t.palette.primary.main, 0.02),
            display: 'flex',
            flexDirection: 'column',
            '&.MuiDialogContent-root': { paddingTop: { xs: 2, sm: 3 } },
          }}
        >
        {/* Filtros */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2, flexShrink: 0 }}>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Ação</InputLabel>
            <Select
              label="Ação"
              value={filters.action ?? ''}
              onChange={(e) => {
                setFilters((f) => ({ ...f, action: e.target.value || undefined }));
                setPaginationModel((p) => ({ ...p, page: 0 }));
              }}
            >
              {ACTION_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            size="small"
            type="date"
            label="De"
            InputLabelProps={{ shrink: true }}
            value={filters.startDate ?? ''}
            onChange={(e) => {
              setFilters((f) => ({ ...f, startDate: e.target.value || undefined }));
              setPaginationModel((p) => ({ ...p, page: 0 }));
            }}
            sx={{ minWidth: 150 }}
          />

          <TextField
            size="small"
            type="date"
            label="Até"
            InputLabelProps={{ shrink: true }}
            value={filters.endDate ?? ''}
            onChange={(e) => {
              setFilters((f) => ({ ...f, endDate: e.target.value || undefined }));
              setPaginationModel((p) => ({ ...p, page: 0 }));
            }}
            sx={{ minWidth: 150 }}
          />
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2, flexShrink: 0 }}>
            Erro ao carregar histórico
          </Alert>
        )}

        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <AppDataGrid
            rows={rows}
            columns={columns}
            loading={isLoading}
            fixedHeight
            height="100%"
            getRowId={(row) => row.id}
            paginationMode="server"
            rowCount={data?.total ?? 0}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            pageSizeOptions={[10, 25, 50]}
            localeText={{
              noRowsLabel: 'Nenhuma alteração registrada',
              footerRowSelected: (count) => `${count} selecionado(s)`,
            }}
            sx={{
              flex: 1,
              minHeight: 0,
              '& .MuiDataGrid-cell': { py: 1 },
            }}
          />
        </Box>
        </DialogContent>
      </Box>
    </Dialog>
  );
}

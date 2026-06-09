import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import { GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { auditLogsApi, type AuditLogFilters } from '../api/auditLogs';
import { AppDataGrid } from '../components/AppDataGrid';
import {
  actionConfig,
  flattenAuditLogs,
  type AuditChangeRow,
} from '../components/audit/auditUtils';

const ENTITY_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Todas' },
  { value: 'Appointment', label: 'Agendamento' },
  { value: 'Patient', label: 'Paciente' },
  { value: 'FinancialEntry', label: 'Financeiro' },
  { value: 'RecurringExpense', label: 'Despesa recorrente' },
  { value: 'PaymentMethod', label: 'Forma de pagamento' },
  { value: 'Promotion', label: 'Promoção' },
  { value: 'InventoryItem', label: 'Estoque' },
  { value: 'InventoryMovement', label: 'Movimentação de estoque' },
  { value: 'Equipment', label: 'Equipamento' },
  { value: 'User', label: 'Usuário' },
  { value: 'Role', label: 'Grupo' },
  { value: 'MessageTemplate', label: 'Modelo de mensagem' },
  { value: 'Package', label: 'Pacote' },
  { value: 'PatientPackage', label: 'Pacote do paciente' },
  { value: 'Procedure', label: 'Procedimento' },
  { value: 'Document', label: 'Documento' },
];

const ACTION_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Todas' },
  { value: 'CREATE', label: 'Criação' },
  { value: 'UPDATE', label: 'Edição' },
  { value: 'DELETE', label: 'Exclusão' },
];

const entityLabel = (entity: string) =>
  ENTITY_OPTIONS.find((e) => e.value === entity)?.label ?? entity;

export function AuditLogs() {
  const [filters, setFilters] = useState<AuditLogFilters>({
    page: 1,
    limit: 25,
  });
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 25,
  });

  const queryFilters: AuditLogFilters = {
    ...filters,
    page: paginationModel.page + 1,
    limit: paginationModel.pageSize,
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['audit-logs-global', queryFilters],
    queryFn: () => auditLogsApi.findAll(queryFilters).then((r) => r.data),
    staleTime: 15_000,
  });

  const rows = useMemo(
    () => flattenAuditLogs(data?.data ?? []),
    [data?.data],
  );

  const columns = useMemo<GridColDef<AuditChangeRow>[]>(
    () => [
      {
        field: 'createdAt',
        headerName: 'Data/Hora',
        width: 150,
        valueGetter: (params) =>
          dayjs(params.row.createdAt).format('DD/MM/YYYY HH:mm'),
      },
      {
        field: 'userName',
        headerName: 'Usuário',
        flex: 0.7,
        minWidth: 120,
      },
      {
        field: 'entity',
        headerName: 'Entidade',
        width: 160,
        valueGetter: (params) => {
          const log = data?.data?.find((l) => l.id === params.row.logId);
          return entityLabel(log?.entity ?? '');
        },
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
        minWidth: 110,
      },
      {
        field: 'oldValue',
        headerName: 'Anterior',
        flex: 1,
        minWidth: 130,
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
        headerName: 'Novo',
        flex: 1,
        minWidth: 130,
        renderCell: (params) =>
          params.value && params.value !== '—' ? (
            <Typography
              variant="body2"
              noWrap
              title={params.value}
              sx={{ color: 'success.dark' }}
            >
              {params.value}
            </Typography>
          ) : (
            <Typography variant="body2" color="text.disabled">
              —
            </Typography>
          ),
      },
    ],
    [data?.data],
  );

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1.5} mb={3}>
        <HistoryIcon color="primary" sx={{ fontSize: 28 }} />
        <Typography variant="h5" fontWeight={700}>
          Histórico de alterações
        </Typography>
      </Stack>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ mb: 2.5 }}
      >
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Entidade</InputLabel>
          <Select
            label="Entidade"
            value={filters.entity ?? ''}
            onChange={(e) => {
              setFilters((f) => ({ ...f, entity: e.target.value || undefined }));
              setPaginationModel((p) => ({ ...p, page: 0 }));
            }}
          >
            {ENTITY_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

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
        <Alert severity="error" sx={{ mb: 2 }}>
          Erro ao carregar histórico de alterações.
        </Alert>
      )}

      <AppDataGrid
        rows={rows}
        columns={columns}
        loading={isLoading}
        height={600}
        getRowId={(row) => row.id}
        paginationMode="server"
        rowCount={data?.total ?? 0}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        pageSizeOptions={[10, 25, 50]}
        localeText={{
          noRowsLabel: 'Nenhuma alteração encontrada',
        }}
        sx={{
          '& .MuiDataGrid-cell': { py: 1 },
        }}
      />
    </Box>
  );
}

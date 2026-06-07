import { useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
  alpha,
} from '@mui/material';
import { GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import HistoryIcon from '@mui/icons-material/History';
import VisibilityIcon from '@mui/icons-material/Visibility';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { PageHeader } from '../components/PageHeader';
import { ListFiltersBar } from '../components/ListFiltersBar';
import { AppDataGrid } from '../components/AppDataGrid';
import { FILTER_FIELD_SX } from '../utils/listFilters';
import { patientsApi } from '../api/patients';
import { PatientFormDialog } from '../components/patients/PatientFormDialog';
import { PatientDetailDrawer } from '../components/patients/PatientDetailDrawer';
import { SendWhatsAppDialog } from '../components/messages/SendWhatsAppDialog';
import { AuditHistoryDialog } from '../components/audit/AuditHistoryDialog';
import { useAppDialog } from '../contexts/AppDialogContext';
import { usePermissions } from '../contexts/usePermissions';
import { maskPhone } from '../utils/masks';
import { formatDateOnlyFromApi } from '../utils/dateOnly';
import { patientSexLabel } from '../utils/patientSex';
import { patientReferralSourceLabel } from '../utils/patientReferralSource';
import { patientInitials } from '../utils/patientPhoto';
import type { Patient } from '../types';

export function Patients() {
  const queryClient = useQueryClient();
  const { confirm } = useAppDialog();
  const { has, isAdmin } = usePermissions();
  const canCreate = has('patients:create');
  const canEdit = has('patients:edit');
  const canDelete = has('patients:delete');

  const [search, setSearch] = useState('');
  const [sexFilter, setSexFilter] = useState<'ALL' | 'M' | 'F'>('ALL');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [whatsappPatient, setWhatsappPatient] = useState<Patient | null>(null);
  const [auditTarget, setAuditTarget] = useState<{ id: string; name: string } | null>(null);

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ['patients', search],
    queryFn: () => patientsApi.list(search || undefined),
  });

  const filteredPatients = useMemo(
    () =>
      patients.filter((p) => sexFilter === 'ALL' || p.sex === sexFilter),
    [patients, sexFilter],
  );

  const deleteMutation = useMutation({
    mutationFn: (id: string) => patientsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['patients'] }),
  });

  const columns = useMemo<GridColDef<Patient>[]>(
    () => [
      {
        field: 'name',
        headerName: 'Nome',
        flex: 1.2,
        minWidth: 220,
        renderCell: (params) => (
          <Stack direction="row" alignItems="center" spacing={1.25} sx={{ minWidth: 0, py: 0.25 }}>
            <Avatar
              src={params.row.photoUrl ?? undefined}
              alt={params.row.name}
              sx={{
                width: 32,
                height: 32,
                fontSize: '0.7rem',
                fontWeight: 700,
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
                color: 'primary.dark',
                flexShrink: 0,
              }}
            >
              {patientInitials(params.row.name)}
            </Avatar>
            <Typography variant="body2" noWrap title={params.row.name}>
              {params.row.name}
            </Typography>
          </Stack>
        ),
      },
      {
        field: 'phone',
        headerName: 'Telefone',
        flex: 0.8,
        minWidth: 150,
        valueGetter: (params) => (params.row.phone ? maskPhone(params.row.phone) : '—'),
      },
      {
        field: 'birthDate',
        headerName: 'Nascimento',
        flex: 0.55,
        minWidth: 100,
        valueGetter: (params) => {
          const s = formatDateOnlyFromApi(params.row.birthDate);
          return s || '—';
        },
      },
      {
        field: 'sex',
        headerName: 'Sexo',
        flex: 0.45,
        minWidth: 110,
        valueGetter: (params) => patientSexLabel(params.row.sex),
      },
      {
        field: 'referralSource',
        headerName: 'Como conheceu',
        flex: 0.7,
        minWidth: 140,
        valueGetter: (params) =>
          patientReferralSourceLabel(params.row.referralSource, params.row.referralSourceOther),
      },
      {
        field: 'cep',
        headerName: 'CEP',
        flex: 0.35,
        minWidth: 100,
        valueGetter: (params) => {
          const raw = params.row.cep?.replace(/\D/g, '');
          return raw && raw.length === 8 ? `${raw.slice(0, 5)}-${raw.slice(5)}` : '—';
        },
      },
      {
        field: 'actions',
        type: 'actions',
        headerName: 'Ações',
        width: 210,
        getActions: (params) => {
          const actions = [
            <GridActionsCellItem
              key="view"
              icon={
                <Tooltip title="Ver ficha">
                  <VisibilityIcon fontSize="small" />
                </Tooltip>
              }
              label="Ver"
              onClick={() => setDetailId(params.row.id)}
            />,
            <GridActionsCellItem
              key="whatsapp"
              disabled={!params.row.phone}
              icon={
                <Tooltip
                  title={params.row.phone ? 'Enviar WhatsApp' : 'Sem telefone cadastrado'}
                >
                  <WhatsAppIcon fontSize="small" sx={{ color: '#25D366' }} />
                </Tooltip>
              }
              label="WhatsApp"
              onClick={() => setWhatsappPatient(params.row)}
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
                  const ok = await confirm({
                    title: 'Excluir paciente',
                    message: `Excluir paciente ${params.row.name}?`,
                    confirmLabel: 'Excluir',
                    confirmColor: 'error',
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
    [confirm, deleteMutation, canEdit, canDelete, isAdmin],
  );

  return (
    <Box>
      <PageHeader
        title="Pacientes"
        subtitle="Cadastro, histórico e contato"
        action={
          canCreate && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              Novo paciente
            </Button>
          )
        }
      />

      <Card sx={{ p: { xs: 1.5, sm: 2 } }}>
        <ListFiltersBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar por nome, e-mail ou telefone"
          filteredCount={filteredPatients.length}
          countLabel={filteredPatients.length === 1 ? 'paciente' : 'pacientes'}
        >
          <TextField
            select
            size="small"
            label="Sexo"
            value={sexFilter}
            onChange={(e) => setSexFilter(e.target.value as typeof sexFilter)}
            sx={FILTER_FIELD_SX}
          >
            <MenuItem value="ALL">Todos</MenuItem>
            <MenuItem value="F">Feminino</MenuItem>
            <MenuItem value="M">Masculino</MenuItem>
          </TextField>
        </ListFiltersBar>

        <AppDataGrid
          rows={filteredPatients}
          columns={columns}
          loading={isLoading}
          localeText={{
            noRowsLabel:
              patients.length === 0
                ? 'Nenhum paciente cadastrado'
                : 'Nenhum paciente encontrado com os filtros',
            footerRowSelected: (count) => `${count} selecionado(s)`,
          }}
        />
      </Card>

      <PatientFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        patient={editing}
      />
      <PatientDetailDrawer patientId={detailId} onClose={() => setDetailId(null)} />
      <SendWhatsAppDialog
        open={!!whatsappPatient}
        onClose={() => setWhatsappPatient(null)}
        phone={whatsappPatient?.phone}
        patientId={whatsappPatient?.id}
        vars={{ paciente_nome: whatsappPatient?.name?.split(' ')[0] }}
        title={`Enviar mensagem para ${whatsappPatient?.name ?? ''}`}
      />
      {auditTarget && (
        <AuditHistoryDialog
          open={!!auditTarget}
          onClose={() => setAuditTarget(null)}
          entity="Patient"
          entityId={auditTarget.id}
          title={auditTarget.name}
        />
      )}
    </Box>
  );
}

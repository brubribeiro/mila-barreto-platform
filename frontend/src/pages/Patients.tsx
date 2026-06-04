import { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  IconButton,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
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
import { useAppDialog } from '../contexts/AppDialogContext';
import { usePermissions } from '../contexts/usePermissions';
import { maskCPF, maskPhone } from '../utils/masks';
import { formatDateOnlyFromApi } from '../utils/dateOnly';
import { patientSexLabel } from '../utils/patientSex';
import type { Patient } from '../types';

export function Patients() {
  const queryClient = useQueryClient();
  const { confirm } = useAppDialog();
  const { has } = usePermissions();
  const canCreate = has('patients:create');
  const canEdit = has('patients:edit');
  const canDelete = has('patients:delete');

  const [search, setSearch] = useState('');
  const [sexFilter, setSexFilter] = useState<'ALL' | 'M' | 'F'>('ALL');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [whatsappPatient, setWhatsappPatient] = useState<Patient | null>(null);

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
      { field: 'name', headerName: 'Nome', flex: 1.2, minWidth: 200 },
      {
        field: 'phone',
        headerName: 'Telefone',
        flex: 0.8,
        minWidth: 150,
        valueGetter: (params) => (params.row.phone ? maskPhone(params.row.phone) : '—'),
      },
      {
        field: 'email',
        headerName: 'E-mail',
        flex: 1,
        minWidth: 180,
        valueGetter: (params) => params.row.email ?? '—',
      },
      {
        field: 'document',
        headerName: 'CPF',
        flex: 0.6,
        minWidth: 130,
        valueGetter: (params) => (params.row.document ? maskCPF(params.row.document) : '—'),
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
        width: 170,
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
    [confirm, deleteMutation, canEdit, canDelete],
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
    </Box>
  );
}

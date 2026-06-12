import { useMemo, useState } from 'react';
import { Box, Button, Card, Chip, MenuItem, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import HistoryIcon from '@mui/icons-material/History';
import SwitchAccountIcon from '@mui/icons-material/SwitchAccount';
import StarIcon from '@mui/icons-material/Star';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { PageHeader } from '../components/PageHeader';
import { ListFiltersBar, ActiveFilterSelect } from '../components/ListFiltersBar';
import { AppDataGrid } from '../components/AppDataGrid';
import { FILTER_FIELD_SX, matchFields, matchesActiveFilter, type ActiveFilter } from '../utils/listFilters';
import { usersApi } from '../api/users';
import { ProfessionalFormDialog } from '../components/professionals/ProfessionalFormDialog';
import { AuditHistoryDialog } from '../components/audit/AuditHistoryDialog';
import { useAuth } from '../contexts/AuthContext';
import { useAppDialog } from '../contexts/AppDialogContext';
import { useAppToast } from '../contexts/AppToastContext';
import { getApiErrorMessage } from '../utils/apiError';
import { usePermissions } from '../contexts/usePermissions';
import type { UserSummary } from '../types';

export function Professionals() {
  const queryClient = useQueryClient();
  const { user: me, impersonate } = useAuth();
  const { confirm } = useAppDialog();
  const toast = useAppToast();
  const { has, isAdmin } = usePermissions();
  const canCreate = has('users:create');
  const canEdit = has('users:edit');
  const canDelete = has('users:delete');

  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [appointmentsFilter, setAppointmentsFilter] = useState<'ALL' | 'YES' | 'NO'>('ALL');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<UserSummary | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list(),
  });

  const roleOptions = useMemo(() => {
    const names = new Set(users.map((u) => u.role?.name).filter(Boolean) as string[]);
    return Array.from(names).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [users]);

  const filteredUsers = useMemo(
    () =>
      users.filter((u) => {
        if (!matchesActiveFilter(u.active, activeFilter)) return false;
        if (roleFilter !== 'ALL' && u.role?.name !== roleFilter) return false;
        if (appointmentsFilter === 'YES' && !u.providesAppointments) return false;
        if (appointmentsFilter === 'NO' && u.providesAppointments) return false;
        return matchFields(search, u.name, u.email, u.role?.name);
      }),
    [users, search, activeFilter, roleFilter, appointmentsFilter],
  );

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Profissional excluído.');
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Não foi possível excluir o profissional.'));
    },
  });

  const columns = useMemo<GridColDef<UserSummary>[]>(
    () => [
      { field: 'name', headerName: 'Nome', flex: 1.2, minWidth: 200 },
      { field: 'email', headerName: 'E-mail', flex: 1.2, minWidth: 220 },
      {
        field: 'role',
        headerName: 'Grupo',
        flex: 0.8,
        minWidth: 140,
        renderCell: (params) => (
          <Chip
            size="small"
            label={params.row.role?.name ?? '—'}
            color="primary"
            variant="outlined"
          />
        ),
      },
      {
        field: 'providesAppointments',
        headerName: 'Atendimentos',
        flex: 0.6,
        minWidth: 130,
        renderCell: (params) =>
          params.value ? (
            <Chip size="small" label="Sim" color="info" variant="outlined" />
          ) : (
            <Chip size="small" label="Não" variant="outlined" />
          ),
      },
      {
        field: 'isPrimary',
        headerName: 'Principal',
        flex: 0.5,
        minWidth: 120,
        renderCell: (params) =>
          params.row.isPrimary ? (
            <Chip
              size="small"
              icon={<StarIcon sx={{ fontSize: '16px !important' }} />}
              label="Principal"
              color="warning"
              variant="outlined"
            />
          ) : (
            <Typography variant="body2" color="text.secondary">
              —
            </Typography>
          ),
      },
      {
        field: 'active',
        headerName: 'Status',
        flex: 0.5,
        minWidth: 110,
        renderCell: (params) =>
          params.value ? (
            <Chip size="small" label="Ativo" color="success" variant="outlined" />
          ) : (
            <Chip size="small" label="Inativo" variant="outlined" />
          ),
      },
      {
        field: 'createdAt',
        headerName: 'Cadastro',
        flex: 0.6,
        minWidth: 120,
        valueGetter: (params) => dayjs(params.row.createdAt).format('DD/MM/YYYY'),
      },
      {
        field: 'actions',
        type: 'actions',
        headerName: 'Ações',
        width: 190,
        getActions: (params) => {
          const isSelf = params.row.id === me?.id;
          const isCurrentUserAdmin = me?.roleName === 'Administrador';
          const actions = [];
          if (isCurrentUserAdmin && !isSelf && params.row.active) {
            actions.push(
              <GridActionsCellItem
                key="impersonate"
                icon={
                  <Tooltip title="Personificar">
                    <SwitchAccountIcon fontSize="small" />
                  </Tooltip>
                }
                label="Personificar"
                onClick={async () => {
                  const ok = await confirm({
                    title: 'Personificar usuário',
                    message: `Entrar como ${params.row.name}? Você poderá voltar a qualquer momento.`,
                    confirmLabel: 'Entrar',
                  });
                  if (ok) impersonate(params.row.id);
                }}
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
                disabled={isSelf}
                icon={
                  <Tooltip title={isSelf ? 'Você não pode excluir a si mesmo' : 'Excluir'}>
                    <DeleteIcon fontSize="small" />
                  </Tooltip>
                }
                label="Excluir"
                onClick={async () => {
                  const ok = await confirm({
                    title: 'Excluir profissional',
                    message: `Excluir ${params.row.name}? Se houver agendamentos vinculados, o usuário será apenas desativado.`,
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
    [confirm, deleteMutation, me?.id, me?.roleName, canEdit, canDelete, impersonate],
  );

  return (
    <Box>
      <PageHeader
        title="Profissionais"
        subtitle="Usuários da plataforma, permissões e quem realiza atendimentos"
        action={
          <Stack direction="row" spacing={1}>
            {isAdmin && (
              <Button
                variant="outlined"
                startIcon={<HistoryIcon />}
                onClick={() => setHistoryOpen(true)}
              >
                Histórico
              </Button>
            )}
            {canCreate && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                Novo profissional
              </Button>
            )}
          </Stack>
        }
      />

      <Card sx={{ p: { xs: 1.5, sm: 2 } }}>
        <ListFiltersBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar por nome, e-mail ou grupo"
          filteredCount={filteredUsers.length}
          totalCount={users.length}
          countLabel={
            filteredUsers.length === 1 ? 'usuário cadastrado' : 'usuários cadastrados'
          }
        >
          <TextField
            select
            size="small"
            label="Grupo"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            sx={FILTER_FIELD_SX}
          >
            <MenuItem value="ALL">Todos</MenuItem>
            {roleOptions.map((name) => (
              <MenuItem key={name} value={name}>
                {name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Atendimentos"
            value={appointmentsFilter}
            onChange={(e) => setAppointmentsFilter(e.target.value as typeof appointmentsFilter)}
            sx={FILTER_FIELD_SX}
          >
            <MenuItem value="ALL">Todos</MenuItem>
            <MenuItem value="YES">Realiza</MenuItem>
            <MenuItem value="NO">Não realiza</MenuItem>
          </TextField>
          <ActiveFilterSelect value={activeFilter} onChange={setActiveFilter} />
        </ListFiltersBar>
        <AppDataGrid
          rows={filteredUsers}
          columns={columns}
          loading={isLoading}
          localeText={{
            noRowsLabel:
              users.length === 0
                ? 'Nenhum profissional cadastrado'
                : 'Nenhum profissional encontrado com os filtros',
          }}
        />
      </Card>

      <ProfessionalFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        user={editing}
      />
      <AuditHistoryDialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        entity="User"
        title="Profissionais"
      />
    </Box>
  );
}

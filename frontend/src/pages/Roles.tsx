import { useMemo, useState } from 'react';
import { Box, Button, Card, Chip, Stack, Tooltip, Typography } from '@mui/material';
import { GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import HistoryIcon from '@mui/icons-material/History';
import LockIcon from '@mui/icons-material/Lock';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { PageHeader } from '../components/PageHeader';
import { ListFiltersBar } from '../components/ListFiltersBar';
import { AppDataGrid } from '../components/AppDataGrid';
import { matchFields } from '../utils/listFilters';
import { rolesApi } from '../api/roles';
import { RoleFormDialog } from '../components/roles/RoleFormDialog';
import { AuditHistoryDialog } from '../components/audit/AuditHistoryDialog';
import { useAppDialog } from '../contexts/AppDialogContext';
import { usePermissions } from '../contexts/usePermissions';
import type { Role } from '../types';

export function Roles() {
  const queryClient = useQueryClient();
  const { confirm, alert } = useAppDialog();
  const { has, isAdmin } = usePermissions();
  const canCreate = has('roles:create');
  const canEdit = has('roles:edit');
  const canDelete = has('roles:delete');

  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesApi.list(),
  });

  const filteredRoles = useMemo(
    () => roles.filter((r) => matchFields(search, r.name, r.description)),
    [roles, search],
  );

  const deleteMutation = useMutation({
    mutationFn: (id: string) => rolesApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }),
    onError: (err: any) => {
      void alert({
        title: 'Erro',
        message: err?.response?.data?.message ?? 'Não foi possível excluir o grupo.',
        severity: 'error',
      });
    },
  });

  const columns = useMemo<GridColDef<Role>[]>(
    () => [
      {
        field: 'name',
        headerName: 'Nome',
        flex: 1,
        minWidth: 180,
        renderCell: (params) => (
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="body2" fontWeight={500}>
              {params.row.name}
            </Typography>
            {params.row.isSystem && (
              <Tooltip title="Grupo do sistema (não pode ser excluído)">
                <LockIcon fontSize="small" sx={{ color: 'text.secondary' }} />
              </Tooltip>
            )}
          </Stack>
        ),
      },
      {
        field: 'description',
        headerName: 'Descrição',
        flex: 1.5,
        minWidth: 240,
        valueGetter: (params) => params.row.description ?? '—',
      },
      {
        field: 'permissions',
        headerName: 'Permissões',
        flex: 0.6,
        minWidth: 130,
        renderCell: (params) => (
          <Chip
            size="small"
            label={`${params.row.permissions.length} de 28`}
            variant="outlined"
            color="primary"
          />
        ),
      },
      {
        field: 'restrictToOwnAppointments',
        headerName: 'Filtro de agenda',
        flex: 0.7,
        minWidth: 140,
        renderCell: (params) =>
          params.value ? (
            <Chip size="small" label="Própria apenas" color="warning" variant="outlined" />
          ) : (
            <Typography variant="body2" color="text.secondary">
              —
            </Typography>
          ),
      },
      {
        field: 'users',
        headerName: 'Usuários',
        flex: 0.4,
        minWidth: 90,
        valueGetter: (params) => params.row._count?.users ?? 0,
      },
      {
        field: 'actions',
        type: 'actions',
        headerName: 'Ações',
        width: 140,
        getActions: (params) => {
          const actions = [];
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
          if (canDelete && !params.row.isSystem) {
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
                    title: 'Excluir grupo',
                    message: `Excluir o grupo ${params.row.name}?`,
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
        title="Grupos e permissões"
        subtitle="Defina o que cada grupo pode acessar, criar, editar e excluir"
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
                Novo grupo
              </Button>
            )}
          </Stack>
        }
      />

      <Card sx={{ p: { xs: 1.5, sm: 2 } }}>
        <ListFiltersBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar por nome ou descrição"
          filteredCount={filteredRoles.length}
          totalCount={roles.length}
          countLabel={
            filteredRoles.length === 1 ? 'grupo cadastrado' : 'grupos cadastrados'
          }
        />
        <AppDataGrid
          rows={filteredRoles}
          columns={columns}
          loading={isLoading}
          localeText={{
            noRowsLabel:
              roles.length === 0
                ? 'Nenhum grupo cadastrado'
                : 'Nenhum grupo encontrado com os filtros',
          }}
        />
      </Card>

      <RoleFormDialog open={formOpen} onClose={() => setFormOpen(false)} role={editing} />
      <AuditHistoryDialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        entity="Role"
        title="Grupos"
      />
    </Box>
  );
}

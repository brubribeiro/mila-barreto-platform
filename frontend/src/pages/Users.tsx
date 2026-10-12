import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  IconButton,
  InputBase,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  alpha,
  type Theme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import HistoryIcon from '@mui/icons-material/History';
import SearchIcon from '@mui/icons-material/Search';
import SwitchAccountIcon from '@mui/icons-material/SwitchAccount';
import StarIcon from '@mui/icons-material/Star';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { usersApi } from '../api/users';
import { UserFormDialog } from '../components/users/UserFormDialog';
import { AuditHistoryDialog } from '../components/audit/AuditHistoryDialog';
import { useAuth } from '../contexts/AuthContext';
import { useAppDialog } from '../contexts/AppDialogContext';
import { useAppToast } from '../contexts/AppToastContext';
import { getApiErrorMessage } from '../utils/apiError';
import { usePermissions } from '../contexts/usePermissions';
import { matchFields, matchesActiveFilter, type ActiveFilter } from '../utils/listFilters';
import type { UserSummary } from '../types';
import { fontSizes } from '../theme/fontSizes';

const PAGE_SIZE = 8;
const GRID_COLS = 'minmax(0, 2.2fr) minmax(0, 1fr) minmax(0, 1.3fr) minmax(0, 0.9fr) 112px';
const GRID_MIN_WIDTH = 760;
const INFO_COLOR = '#5BA8DE';

const TOOLBAR_SELECT_SX = {
  width: { xs: 'calc(50% - 5px)', sm: 168 },
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

const ROW_ACTION_SX = {
  width: 30,
  height: 30,
  borderRadius: '9px',
  border: 1,
  borderColor: 'divider',
  bgcolor: 'background.paper',
  color: 'text.secondary',
} as const;

function initialsFor(name: string) {
  // Ignora títulos (Dr., Dra., Enf.) para as iniciais refletirem o nome.
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((w) => w && !/^(dra?|enf)\.?$/i.test(w));
  if (parts.length === 0) return '?';
  return parts
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function Pill({ label, color, bg }: { label: string; color: string; bg: string | ((t: Theme) => string) }) {
  return (
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
        color,
        bgcolor: bg,
      }}
    >
      {label}
    </Box>
  );
}

export function Users() {
  const queryClient = useQueryClient();
  const { user: me, impersonate } = useAuth();
  const { confirm } = useAppDialog();
  const toast = useAppToast();
  const { has, isAdmin } = usePermissions();
  const canCreate = has('users:create');
  const canEdit = has('users:edit');
  const canDelete = has('users:delete');
  const canImpersonate = me?.roleName === 'Administrador';

  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [professionalFilter, setProfessionalFilter] = useState<'ALL' | 'YES' | 'NO'>('ALL');
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

  const filtered = useMemo(
    () =>
      users.filter((u) => {
        if (!matchesActiveFilter(u.active, activeFilter)) return false;
        if (roleFilter !== 'ALL' && u.role?.name !== roleFilter) return false;
        if (professionalFilter === 'YES' && !u.providesAppointments) return false;
        if (professionalFilter === 'NO' && u.providesAppointments) return false;
        return matchFields(search, u.name, u.email, u.role?.name);
      }),
    [users, search, activeFilter, roleFilter, professionalFilter],
  );

  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [search, activeFilter, roleFilter, professionalFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const rows = filtered.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Usuário excluído.');
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Não foi possível excluir o usuário.'));
    },
  });

  const handleEdit = (u: UserSummary) => {
    setEditing(u);
    setFormOpen(true);
  };

  const handleImpersonate = async (u: UserSummary) => {
    const ok = await confirm({
      title: 'Personificar usuário',
      message: `Entrar como ${u.name}? Você poderá voltar a qualquer momento.`,
      confirmLabel: 'Entrar',
    });
    if (ok) impersonate(u.id);
  };

  const handleDelete = async (u: UserSummary) => {
    const ok = await confirm({
      title: 'Excluir usuário',
      message: `Excluir ${u.name}? Se houver agendamentos vinculados, o usuário será apenas desativado.`,
      confirmLabel: 'Excluir',
      confirmColor: 'error',
    });
    if (ok) deleteMutation.mutate(u.id);
  };

  return (
    <Box sx={{ maxWidth: 1320, mx: 'auto' }}>
      {/* Contagem + filtros + busca + ações */}
      <Stack
        direction={{ xs: 'column', lg: 'row' }}
        alignItems={{ xs: 'stretch', lg: 'center' }}
        justifyContent="space-between"
        spacing={1.5}
      >
        <Typography sx={{ fontSize: fontSizes.md, color: 'text.secondary', fontWeight: 600 }}>
          {isLoading ? (
            <Skeleton width={180} />
          ) : (
            <>
              <Box component="span" sx={{ color: 'text.primary', fontWeight: 800 }}>
                {users.length}
              </Box>{' '}
              {users.length === 1 ? 'usuário com acesso' : 'usuários com acesso'}
            </>
          )}
        </Typography>

        <Stack
          direction="row"
          alignItems="center"
          spacing={1.25}
          flexWrap={{ xs: 'wrap', lg: 'nowrap' }}
          useFlexGap
          justifyContent={{ lg: 'flex-end' }}
          sx={{ minWidth: 0 }}
        >
          <TextField
            select
            size="small"
            value={professionalFilter}
            onChange={(e) => setProfessionalFilter(e.target.value as typeof professionalFilter)}
            inputProps={{ 'aria-label': 'Vínculo' }}
            sx={TOOLBAR_SELECT_SX}
          >
            <MenuItem value="ALL">Todos os vínculos</MenuItem>
            <MenuItem value="YES">Profissional</MenuItem>
            <MenuItem value="NO">Administrativo</MenuItem>
          </TextField>
          <TextField
            select
            size="small"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            inputProps={{ 'aria-label': 'Grupo de permissão' }}
            sx={TOOLBAR_SELECT_SX}
          >
            <MenuItem value="ALL">Todos os grupos</MenuItem>
            {roleOptions.map((name) => (
              <MenuItem key={name} value={name}>
                {name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value as ActiveFilter)}
            inputProps={{ 'aria-label': 'Status' }}
            sx={TOOLBAR_SELECT_SX}
          >
            <MenuItem value="ALL">Todos os status</MenuItem>
            <MenuItem value="ACTIVE">Ativos</MenuItem>
            <MenuItem value="INACTIVE">Inativos</MenuItem>
          </TextField>
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{
              height: 38,
              px: 1.75,
              borderRadius: '12px',
              border: 1,
              borderColor: 'divider',
              bgcolor: 'grey.50',
              width: { xs: '100%', sm: 230 },
              minWidth: 0,
            }}
          >
            <SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
            <InputBase
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar usuário..."
              sx={{ fontSize: fontSizes.sm, flex: 1 }}
            />
          </Stack>
          {isAdmin && (
            <Tooltip title="Histórico de alterações">
              <IconButton
                onClick={() => setHistoryOpen(true)}
                sx={{ flexShrink: 0, width: 38, height: 38, borderRadius: '12px', border: 1, borderColor: 'divider', bgcolor: 'background.paper', color: 'text.secondary' }}
              >
                <HistoryIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {canCreate && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
              sx={{ flexShrink: 0, whiteSpace: 'nowrap', height: 38, px: 2.25, borderRadius: '12px', boxShadow: (t) => `0 6px 16px -6px ${t.palette.primary.main}` }}
            >
              Novo usuário
            </Button>
          )}
        </Stack>
      </Stack>

      <Typography sx={{ display: 'block', fontSize: fontSizes.xs, color: 'text.disabled', mt: 1, mb: 2.25 }}>
        Todo profissional é um usuário, mas nem todo usuário é profissional — administrativos (recepção,
        financeiro) acessam sem estar na agenda.
      </Typography>

      <Card sx={{ p: 0, overflow: 'hidden' }}>
        <Box sx={{ overflowX: 'auto' }}>
        {/* Cabeçalho de colunas */}
        <Box
          sx={{
            display: { xs: 'none', md: 'grid' },
            gridTemplateColumns: GRID_COLS,
            minWidth: GRID_MIN_WIDTH,
            gap: 1.5,
            px: 2.5,
            py: 1.75,
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
          <span>Usuário</span>
          <span>Vínculo</span>
          <span>Grupo de permissão</span>
          <span>Status</span>
          <span />
        </Box>

        {/* Linhas */}
        {isLoading ? (
          <Box sx={{ px: 2.5, py: 2 }}>
            <Stack spacing={1.25}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} variant="rounded" height={48} />
              ))}
            </Stack>
          </Box>
        ) : filtered.length === 0 ? (
          <Box sx={{ px: 2.5, py: 6, textAlign: 'center' }}>
            <Typography color="text.secondary">
              {users.length === 0 ? 'Nenhum usuário cadastrado.' : 'Nenhum usuário encontrado com os filtros.'}
            </Typography>
          </Box>
        ) : (
          rows.map((u) => {
            const isSelf = u.id === me?.id;
            return (
              <Box
                key={u.id}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: 'minmax(0, 1fr) auto', md: GRID_COLS },
                  minWidth: { md: GRID_MIN_WIDTH },
                  gap: 1.5,
                  px: { xs: 2, md: 2.5 },
                  py: 1.75,
                  borderBottom: 1,
                  borderColor: 'grey.100',
                  alignItems: 'center',
                  '&:hover': { bgcolor: 'grey.50' },
                  '&:last-of-type': { borderBottom: 0 },
                }}
              >
                {/* Usuário */}
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: '10px',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: fontSizes.xs,
                      fontWeight: 800,
                      color: 'primary.main',
                      bgcolor: (t) => alpha(t.palette.primary.main, 0.09),
                    }}
                  >
                    {initialsFor(u.name)}
                  </Box>
                  <Box sx={{ minWidth: 0, lineHeight: 1.3 }}>
                    <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: fontSizes.md, fontWeight: 700 }} noWrap title={u.name}>
                        {u.name}
                      </Typography>
                      {u.isPrimary && (
                        <Tooltip title="Profissional principal">
                          <StarIcon sx={{ fontSize: 15, color: 'warning.main', flexShrink: 0 }} />
                        </Tooltip>
                      )}
                    </Stack>
                    <Typography sx={{ fontSize: fontSizes.xs, color: 'text.secondary' }} noWrap title={u.email}>
                      {u.email}
                    </Typography>
                  </Box>
                </Stack>

                {/* Vínculo */}
                <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                  {u.providesAppointments ? (
                    <Pill label="Profissional" color="#2F6FA0" bg={alpha(INFO_COLOR, 0.16)} />
                  ) : (
                    <Pill label="Administrativo" color="text.secondary" bg="grey.100" />
                  )}
                </Box>

                {/* Grupo de permissão */}
                <Typography
                  sx={{ display: { xs: 'none', md: 'block' }, fontSize: fontSizes.sm, fontWeight: 600 }}
                  noWrap
                >
                  {u.role?.name ?? '—'}
                </Typography>

                {/* Status */}
                <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                  {u.active ? (
                    <Pill label="Ativo" color="primary.dark" bg={(t) => alpha(t.palette.primary.main, 0.12)} />
                  ) : (
                    <Pill label="Inativo" color="text.secondary" bg="grey.100" />
                  )}
                </Box>

                {/* Ações */}
                <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                  {canImpersonate && !isSelf && u.active && (
                    <Tooltip title="Personificar">
                      <IconButton onClick={() => handleImpersonate(u)} sx={ROW_ACTION_SX}>
                        <SwitchAccountIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  )}
                  {canEdit && (
                    <Tooltip title="Editar">
                      <IconButton onClick={() => handleEdit(u)} sx={ROW_ACTION_SX}>
                        <EditIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  )}
                  {canDelete && (
                    <Tooltip title={isSelf ? 'Você não pode excluir a si mesmo' : 'Excluir'}>
                      <span>
                        <IconButton
                          disabled={isSelf}
                          onClick={() => handleDelete(u)}
                          sx={{ ...ROW_ACTION_SX, color: 'error.main' }}
                        >
                          <DeleteIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </span>
                    </Tooltip>
                  )}
                </Stack>
              </Box>
            );
          })
        )}
        </Box>

        {/* Paginação */}
        {!isLoading && pageCount > 1 && (
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            alignItems="center"
            justifyContent="space-between"
            spacing={1.5}
            sx={{ px: 2.5, py: 1.75, borderTop: 1, borderColor: 'divider' }}
          >
            <Typography sx={{ fontSize: fontSizes.xs, color: 'text.secondary', fontWeight: 600 }}>
              Mostrando {current * PAGE_SIZE + 1}–{Math.min((current + 1) * PAGE_SIZE, filtered.length)} de{' '}
              {filtered.length}
            </Typography>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap justifyContent="center">
              {Array.from({ length: pageCount }).map((_, i) => {
                const activePage = i === current;
                return (
                  <Box
                    key={i}
                    component="button"
                    type="button"
                    onClick={() => setPage(i)}
                    sx={{
                      minWidth: 32,
                      height: 32,
                      px: 0.75,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      fontSize: fontSizes.sm,
                      fontWeight: 700,
                      borderRadius: '9px',
                      border: 1,
                      borderColor: activePage ? 'primary.main' : 'divider',
                      color: activePage ? '#fff' : 'text.secondary',
                      bgcolor: activePage ? 'primary.main' : 'background.paper',
                      '&:hover': { bgcolor: activePage ? 'primary.main' : 'grey.50' },
                    }}
                  >
                    {i + 1}
                  </Box>
                );
              })}
            </Stack>
          </Stack>
        )}
      </Card>

      <UserFormDialog open={formOpen} onClose={() => setFormOpen(false)} user={editing} />
      <AuditHistoryDialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        entity="User"
        title="Usuários"
      />
    </Box>
  );
}

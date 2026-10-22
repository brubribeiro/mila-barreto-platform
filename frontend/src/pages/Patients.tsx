import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Avatar,
  Box,
  Button,
  Card,
  IconButton,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
  alpha,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';

import { patientsApi } from '../api/patients';
import { PatientFormDialog } from '../components/patients/PatientFormDialog';
import { AnamnesisFormDialog } from '../components/patients/AnamnesisFormDialog';
import { PatientDetailDrawer } from '../components/patients/PatientDetailDrawer';
import { SendWhatsAppDialog } from '../components/messages/SendWhatsAppDialog';
import {
  LIST_HEADER_ACTION_SX,
  ListCardHeader,
  ListSearchField,
} from '../components/ListCardHeader';
import { useAppDialog } from '../contexts/AppDialogContext';
import { useAppToast } from '../contexts/AppToastContext';
import { getApiErrorMessage } from '../utils/apiError';
import { usePermissions } from '../contexts/usePermissions';
import { maskPhone } from '../utils/masks';
import { patientInitials } from '../utils/patientPhoto';
import { useUrlState, urlPage, type UrlCodec } from '../hooks/useUrlState';
import type { Patient } from '../types';
import { fontSizes } from '../theme/fontSizes';
import { moneyFormatter } from '../utils/money';

const PAGE_SIZE = 8;

type PatientSort = {
  key: 'lastVisit' | 'totalSpent' | 'appointments';
  dir: 'asc' | 'desc';
};

const PATIENT_SORT_KEYS: PatientSort['key'][] = ['lastVisit', 'totalSpent', 'appointments'];

// ?ordem=-lastVisit (desc) | ?ordem=lastVisit (asc)
const PATIENT_SORT_CODEC: UrlCodec<PatientSort | null> = {
  parse: (raw) => {
    const key = raw.replace(/^-/, '') as PatientSort['key'];
    if (!PATIENT_SORT_KEYS.includes(key)) return undefined;
    return { key, dir: raw.startsWith('-') ? 'desc' : 'asc' };
  },
  serialize: (value) => (value ? `${value.dir === 'desc' ? '-' : ''}${value.key}` : ''),
};

const AVATAR_COLORS = ['#15998B', '#5BA8DE', '#D46B8A', '#E0915B', '#9B7BD4', '#4FB3A8'];
const brl = moneyFormatter({ maximumFractionDigits: 0 });

function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatCpf(doc?: string) {
  const raw = doc?.replace(/\D/g, '');
  if (!raw || raw.length !== 11) return '—';
  return `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6, 9)}-${raw.slice(9)}`;
}

function scoreTone(v: number) {
  if (v >= 90) return { main: '#15998B', label: 'Excelente' };
  if (v >= 75) return { main: '#C98A12', label: 'Bom' };
  return { main: '#D65A5A', label: 'Atenção' };
}

const GRID_COLS = '1.8fr 1.1fr 1.2fr 1fr 1fr 0.75fr 0.8fr 120px';

function StatCard({ label, value, loading }: { label: string; value: string; loading?: boolean }) {
  return (
    <Card sx={{ p: { xs: 2, sm: 2.25 } }}>
      {loading ? (
        <Skeleton variant="text" width={80} sx={{ fontSize: fontSizes['6xl'] }} />
      ) : (
        <Typography sx={{ fontSize: { xs: '1.4rem', sm: '1.65rem' }, fontWeight: 800, letterSpacing: '-0.5px' }}>
          {value}
        </Typography>
      )}
      <Typography sx={{ fontSize: fontSizes.xs, color: 'text.secondary', fontWeight: 600, mt: 0.25 }}>
        {label}
      </Typography>
    </Card>
  );
}

export function Patients() {
  const queryClient = useQueryClient();
  const { confirm } = useAppDialog();
  const toast = useAppToast();
  const { has } = usePermissions();
  const canCreate = has('patients:create');
  const canEdit = has('patients:edit');
  const canDelete = has('patients:delete');

  const [search, setSearch] = useUrlState('busca', '');
  const [page, setPage] = useUrlState('pagina', 0, urlPage);
  const [searchInput, setSearchInput] = useState(search);

  useEffect(() => {
    if (searchInput === search) return;
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(0);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  // Reabre o drawer da ficha ao voltar da página estendida (?ficha=<id>)
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const ficha = searchParams.get('ficha');
    if (ficha) {
      setDetailId(ficha);
      const next = new URLSearchParams(searchParams);
      next.delete('ficha');
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  const [sort, setSort] = useUrlState<PatientSort | null>('ordem', null, PATIENT_SORT_CODEC);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Patient | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [anamnesisPatientId, setAnamnesisPatientId] = useState<string | null>(null);
  const [whatsappPatient, setWhatsappPatient] = useState<Patient | null>(null);

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ['patients', search],
    queryFn: () => patientsApi.list(search || undefined),
    placeholderData: keepPreviousData,
  });

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['patients-stats'],
    queryFn: () => patientsApi.stats(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => patientsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['patients-stats'] });
      toast.success('Paciente excluído.');
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Não foi possível excluir o paciente.'));
    },
  });

  const sortedPatients = useMemo(() => {
    if (!sort) return patients;
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...patients].sort((a, b) => {
      if (sort.key === 'lastVisit') {
        const av = a.lastVisit ? new Date(a.lastVisit).getTime() : 0;
        const bv = b.lastVisit ? new Date(b.lastVisit).getTime() : 0;
        return (av - bv) * dir;
      }
      if (sort.key === 'appointments') {
        return ((a.appointmentsCount ?? 0) - (b.appointmentsCount ?? 0)) * dir;
      }
      return ((a.totalSpent ?? 0) - (b.totalSpent ?? 0)) * dir;
    });
  }, [patients, sort]);

  const toggleSort = (key: 'lastVisit' | 'totalSpent' | 'appointments') => {
    setPage(0);
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: 'desc' };
      if (prev.dir === 'desc') return { key, dir: 'asc' };
      return null;
    });
  };

  const pageCount = Math.max(1, Math.ceil(sortedPatients.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageRows = useMemo(
    () => sortedPatients.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE),
    [sortedPatients, currentPage],
  );

  const rangeStart = sortedPatients.length === 0 ? 0 : currentPage * PAGE_SIZE + 1;
  const rangeEnd = Math.min((currentPage + 1) * PAGE_SIZE, sortedPatients.length);

  // Páginas visíveis com reticências: primeira, última, atual e vizinhas
  const pageItems = useMemo<(number | 'dots')[]>(() => {
    if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i);
    const items = new Set<number>([0, pageCount - 1, currentPage]);
    for (let d = 1; d <= 1; d += 1) {
      items.add(Math.max(0, currentPage - d));
      items.add(Math.min(pageCount - 1, currentPage + d));
    }
    const sorted = Array.from(items).sort((a, b) => a - b);
    const result: (number | 'dots')[] = [];
    let prev = -1;
    for (const n of sorted) {
      if (prev !== -1 && n - prev > 1) result.push('dots');
      result.push(n);
      prev = n;
    }
    return result;
  }, [pageCount, currentPage]);

  const handleDelete = async (patient: Patient) => {
    const ok = await confirm({
      title: 'Excluir paciente',
      message: `Excluir paciente ${patient.name}?`,
      confirmLabel: 'Excluir',
      confirmColor: 'error',
    });
    if (ok) deleteMutation.mutate(patient.id);
  };

  return (
    <Box>
      {/* Cards de estatística */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: { xs: 1.5, sm: 2 },
          mb: { xs: 2, sm: 2.5 },
        }}
      >
        <StatCard label="Total de pacientes" value={String(stats?.total ?? 0)} loading={statsLoading} />
        <StatCard label="Ativos (90 dias)" value={String(stats?.active90 ?? 0)} loading={statsLoading} />
        <StatCard label="Novos no mês" value={String(stats?.newThisMonth ?? 0)} loading={statsLoading} />
        <StatCard label="Ticket médio" value={brl.format(stats?.averageTicket ?? 0)} loading={statsLoading} />
      </Box>

      {/* Tabela */}
      <Card sx={{ p: 0, overflow: 'hidden' }}>
        {/* Cabeçalho da tabela */}
        <ListCardHeader title={<Typography sx={{ fontSize: fontSizes.xl, fontWeight: 700 }}>Todos os pacientes</Typography>}>
          <ListSearchField value={searchInput} onChange={setSearchInput} placeholder="Buscar paciente, CPF..." />
          {canCreate && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
              sx={LIST_HEADER_ACTION_SX}
            >
              Adicionar paciente
            </Button>
          )}
        </ListCardHeader>

        {/* Cabeçalho de colunas */}
        <Box
          sx={{
            display: { xs: 'none', md: 'grid' },
            gridTemplateColumns: GRID_COLS,
            gap: 1.5,
            px: 2.75,
            py: 1.5,
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'grey.50',
            fontSize: fontSizes['2xs'],
            fontWeight: 800,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: 'text.secondary',
          }}
        >
          <span>Paciente</span>
          <span>CPF</span>
          <span>Telefone</span>
          {(['lastVisit', 'totalSpent', 'appointments'] as const).map((key) => {
            const active = sort?.key === key;
            const label =
              key === 'lastVisit' ? 'Última visita' : key === 'totalSpent' ? 'Total gasto' : 'Agend.';
            return (
              <Box
                key={key}
                component="button"
                type="button"
                onClick={() => toggleSort(key)}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.4,
                  p: 0,
                  border: 0,
                  bgcolor: 'transparent',
                  cursor: 'pointer',
                  font: 'inherit',
                  letterSpacing: 'inherit',
                  textTransform: 'inherit',
                  color: active ? 'text.primary' : 'inherit',
                  fontWeight: 800,
                  '&:hover': { color: 'text.primary' },
                }}
              >
                {label}
                <ArrowUpwardRoundedIcon
                  sx={{
                    fontSize: 13,
                    opacity: active ? 1 : 0.35,
                    transform: active && sort?.dir === 'desc' ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.12s',
                  }}
                />
              </Box>
            );
          })}
          <span style={{ textAlign: 'right' }}>Score</span>
          <span />
        </Box>

        {/* Linhas */}
        {isLoading ? (
          <Box sx={{ px: 2.75, py: 2 }}>
            <Stack spacing={1.25}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} variant="rounded" height={52} />
              ))}
            </Stack>
          </Box>
        ) : patients.length === 0 ? (
          <Stack alignItems="center" spacing={1.5} sx={{ px: 3, py: 7, textAlign: 'center' }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: (t) => alpha(t.palette.primary.main, 0.12),
                color: 'primary.main',
              }}
            >
              <SearchIcon />
            </Box>
            <Typography sx={{ fontSize: fontSizes.xl, fontWeight: 800 }}>
              {search ? 'Nenhum paciente encontrado' : 'Nenhum paciente cadastrado'}
            </Typography>
            <Typography sx={{ fontSize: fontSizes.md, color: 'text.secondary', maxWidth: 380 }}>
              {search
                ? 'Não encontramos ninguém com esse nome, CPF ou telefone. Confira a grafia ou cadastre um novo paciente.'
                : 'Comece adicionando o primeiro paciente à sua base.'}
            </Typography>
            {canCreate && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
                sx={{ mt: 0.5, borderRadius: '11px', boxShadow: (t) => `0 6px 16px -6px ${t.palette.primary.main}` }}
              >
                Adicionar paciente
              </Button>
            )}
          </Stack>
        ) : (
          pageRows.map((p) => {
            const score = p.reliabilityPercent ?? 100;
            const tone = scoreTone(score);
            const color = avatarColor(p.name);
            return (
              <Box
                key={p.id}
                onClick={() => setDetailId(p.id)}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr auto', md: GRID_COLS },
                  gap: 1.5,
                  px: { xs: 2, md: 2.75 },
                  py: 1.5,
                  borderBottom: 1,
                  borderColor: 'divider',
                  alignItems: 'center',
                  cursor: 'pointer',
                  transition: 'background-color 0.12s',
                  '&:hover': { bgcolor: 'grey.50' },
                  '&:last-of-type': { borderBottom: 0 },
                }}
              >
                {/* Paciente */}
                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
                  <Avatar
                    src={p.photoUrl ?? undefined}
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: '11px',
                      fontSize: fontSizes.sm,
                      fontWeight: 700,
                      color: '#fff',
                      bgcolor: color,
                      flexShrink: 0,
                    }}
                    variant="rounded"
                  >
                    {patientInitials(p.name)}
                  </Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: fontSizes.md, fontWeight: 700 }} noWrap title={p.name}>
                      {p.name}
                    </Typography>
                    <Typography
                      sx={{ display: { md: 'none' }, fontSize: fontSizes.xs, color: 'text.secondary' }}
                      noWrap
                    >
                      {p.phone ? maskPhone(p.phone) : formatCpf(p.document)}
                    </Typography>
                  </Box>
                </Stack>

                {/* CPF */}
                <Typography
                  sx={{
                    display: { xs: 'none', md: 'block' },
                    fontSize: fontSizes.sm,
                    color: 'text.secondary',
                    fontWeight: 600,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {formatCpf(p.document)}
                </Typography>

                {/* Telefone */}
                <Typography
                  sx={{ display: { xs: 'none', md: 'block' }, fontSize: fontSizes.sm, color: 'text.secondary', fontWeight: 600 }}
                >
                  {p.phone ? maskPhone(p.phone) : '—'}
                </Typography>

                {/* Última visita */}
                <Typography
                  sx={{ display: { xs: 'none', md: 'block' }, fontSize: fontSizes.sm, color: 'text.secondary', fontWeight: 600 }}
                >
                  {p.lastVisit ? dayjs(p.lastVisit).format('DD MMM YYYY') : '—'}
                </Typography>

                {/* Total gasto */}
                <Typography sx={{ display: { xs: 'none', md: 'block' }, fontSize: fontSizes.md, fontWeight: 800 }}>
                  {p.totalSpent ? brl.format(p.totalSpent) : '—'}
                </Typography>

                {/* Agendamentos */}
                <Typography
                  sx={{
                    display: { xs: 'none', md: 'block' },
                    fontSize: fontSizes.md,
                    fontWeight: 700,
                    color: 'text.secondary',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {p.appointmentsCount ?? 0}
                </Typography>

                {/* Score */}
                <Box sx={{ display: { xs: 'none', md: 'flex' }, justifyContent: 'flex-end' }}>
                  <Box
                    component="span"
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 0.5,
                      px: 1.1,
                      py: 0.5,
                      borderRadius: '9px',
                      fontSize: fontSizes.xs,
                      fontWeight: 800,
                      color: tone.main,
                      bgcolor: alpha(tone.main, 0.12),
                    }}
                  >
                    <StarRoundedIcon sx={{ fontSize: 14 }} />
                    {score}
                  </Box>
                </Box>

                {/* Ações */}
                <Stack
                  direction="row"
                  spacing={0.25}
                  justifyContent="flex-end"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Tooltip title={p.phone ? 'WhatsApp' : 'Sem telefone'}>
                    <span>
                      <IconButton
                        size="small"
                        disabled={!p.phone}
                        onClick={() => setWhatsappPatient(p)}
                        sx={{ color: '#25D366' }}
                      >
                        <WhatsAppIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  {canEdit && (
                    <Tooltip title="Anamnese">
                      <IconButton size="small" onClick={() => setAnamnesisPatientId(p.id)}>
                        <AssignmentOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {canEdit && (
                    <Tooltip title="Editar">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditing(p);
                          setFormOpen(true);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  {canDelete && (
                    <Tooltip title="Excluir">
                      <IconButton size="small" onClick={() => handleDelete(p)} sx={{ color: 'error.main' }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
              </Box>
            );
          })
        )}

        {/* Paginação */}
        {!isLoading && patients.length > 0 && (
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            flexWrap="wrap"
            spacing={1.5}
            sx={{ px: 2.75, py: 1.75, borderTop: 1, borderColor: 'divider' }}
          >
            <Typography sx={{ fontSize: fontSizes.xs, color: 'text.secondary', fontWeight: 600 }}>
              {rangeStart}–{rangeEnd} de {patients.length}
            </Typography>
            <Stack direction="row" alignItems="center" spacing={0.75}>
              <IconButton
                size="small"
                disabled={currentPage === 0}
                onClick={() => setPage((v) => Math.max(0, v - 1))}
                sx={{ border: 1, borderColor: 'divider', borderRadius: '9px' }}
              >
                <ChevronLeftIcon fontSize="small" />
              </IconButton>
              {pageItems.map((item, idx) =>
                item === 'dots' ? (
                  <Box
                    key={`dots-${idx}`}
                    sx={{
                      minWidth: 24,
                      textAlign: 'center',
                      color: 'text.disabled',
                      fontSize: fontSizes.xs,
                      fontWeight: 700,
                    }}
                  >
                    …
                  </Box>
                ) : (
                  <Box
                    key={item}
                    component="button"
                    onClick={() => setPage(item)}
                    sx={{
                      minWidth: 30,
                      height: 30,
                      px: 0.5,
                      borderRadius: '9px',
                      border: 1,
                      borderColor: item === currentPage ? 'primary.main' : 'divider',
                      bgcolor: item === currentPage ? 'primary.main' : 'background.paper',
                      color: item === currentPage ? '#fff' : 'text.secondary',
                      fontSize: fontSizes.xs,
                      fontWeight: 700,
                      fontFamily: 'inherit',
                      cursor: 'pointer',
                    }}
                  >
                    {item + 1}
                  </Box>
                ),
              )}
              <IconButton
                size="small"
                disabled={currentPage >= pageCount - 1}
                onClick={() => setPage((v) => Math.min(pageCount - 1, v + 1))}
                sx={{ border: 1, borderColor: 'divider', borderRadius: '9px' }}
              >
                <ChevronRightIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>
        )}
      </Card>

      <PatientFormDialog open={formOpen} onClose={() => setFormOpen(false)} patient={editing} />
      <PatientDetailDrawer
        patientId={detailId}
        onClose={() => setDetailId(null)}
        onEditAnamnesis={canEdit ? setAnamnesisPatientId : undefined}
      />
      <AnamnesisFormDialog
        open={!!anamnesisPatientId}
        patientId={anamnesisPatientId}
        onClose={() => setAnamnesisPatientId(null)}
      />
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

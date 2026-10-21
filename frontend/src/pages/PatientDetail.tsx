import { useMemo, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
  alpha,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import type { ReactNode } from 'react';

import { packagesApi } from '../api/packages';
import { ANAMNESIS_SECTIONS } from '../components/patients/anamnesisFields';
import { AnamnesisFormDialog } from '../components/patients/AnamnesisFormDialog';
import { PatientPhotosGallery } from '../components/patients/PatientPhotosGallery';
import { EmptyBlock } from '../components/patients/EmptyBlock';
import { PatientAnamnesisSection } from '../components/patients/PatientAnamnesisSection';
import { PatientWhatsAppButton } from '../components/patients/PatientWhatsAppButton';
import { ReliabilityBadge } from '../components/patients/ReliabilityBadge';
import {
  appointmentKindLabel,
  appointmentStatusAccent,
  patientAgeLabel,
  scoreTone,
} from '../components/patients/patientChart';
import { usePatientChart } from '../components/patients/usePatientChart';
import { useAppointmentDialog } from '../contexts/AppointmentDialogContext';
import PhotoLibraryOutlinedIcon from '@mui/icons-material/PhotoLibraryOutlined';
import AddIcon from '@mui/icons-material/Add';
import { usePermissions } from '../contexts/usePermissions';
import { formatDateOnlyFromApi } from '../utils/dateOnly';
import { formatPatientAddressDisplay } from '../utils/patientAddress';
import { patientSexLabel } from '../utils/patientSex';
import { maskPhone } from '../utils/masks';
import { patientInitials } from '../utils/patientPhoto';
import type { Appointment } from '../types';
import { fontSizes } from '../theme/fontSizes';
import { brl } from '../utils/money';


const packageStatusLabel: Record<string, string> = {
  ACTIVE: 'Ativo',
  COMPLETED: 'Concluído',
  EXPIRED: 'Expirado',
  CANCELLED: 'Cancelado',
};

const packageStatusColor: Record<string, 'success' | 'default' | 'error' | 'warning'> = {
  ACTIVE: 'success',
  COMPLETED: 'default',
  EXPIRED: 'warning',
  CANCELLED: 'error',
};

type DetailTab = 'general' | 'appointments' | 'packages' | 'anamnesis' | 'fotos';

function HeaderIcon({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 32,
        height: 32,
        borderRadius: 1.5,
        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
        color: 'primary.main',
        flexShrink: 0,
      }}
    >
      {children}
    </Box>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <Paper
      variant="outlined"
      sx={{ p: 2.5, borderColor: 'divider', bgcolor: 'background.paper', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}
    >
      <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mb: 1.5 }}>
        <HeaderIcon>{icon}</HeaderIcon>
        <Typography variant="subtitle2" fontWeight={700} letterSpacing="-0.01em">
          {title}
        </Typography>
      </Stack>
      {children}
    </Paper>
  );
}

function HighlightCard({ icon, label, value, sub }: { icon: ReactNode; label: string; value: string; sub?: string | null }) {
  return (
    <Box sx={{ p: 2, borderRadius: '14px', border: 1, borderColor: 'divider', bgcolor: 'grey.50' }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: '9px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: (t) => alpha(t.palette.primary.main, 0.12),
            color: 'primary.main',
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
        <Typography sx={{ fontSize: fontSizes.xs, color: 'text.secondary', fontWeight: 600 }}>{label}</Typography>
      </Stack>
      <Typography sx={{ fontSize: fontSizes.xl, fontWeight: 800, mt: 1 }}>{value}</Typography>
      {sub && (
        <Typography sx={{ fontSize: fontSizes.xs, color: 'text.secondary' }} noWrap>
          {sub}
        </Typography>
      )}
    </Box>
  );
}

function GeneralTab({ data, activePackagesCount }: { data: any; activePackagesCount: number }) {
  const appts: Appointment[] = data.appointments ?? [];
  const now = dayjs();
  const upcoming = [...appts]
    .filter((a) => dayjs(a.startAt).isAfter(now) && a.status !== 'CANCELLED' && a.status !== 'NO_SHOW')
    .sort((a, b) => dayjs(a.startAt).valueOf() - dayjs(b.startAt).valueOf())[0];
  const last = [...appts]
    .filter((a) => a.status === 'COMPLETED')
    .sort((a, b) => dayjs(b.startAt).valueOf() - dayjs(a.startAt).valueOf())[0];

  const anamnesis: Record<string, any> = data.anamnesis ?? {};
  const boolFields = ANAMNESIS_SECTIONS.flatMap((s) => s.fields).filter((f) => f.type === 'boolean');
  const activeConditions = boolFields.filter((f) => !!anamnesis[f.key]);
  const allergyEntries = [
    { label: 'Alergia a medicamentos', v: anamnesis.alergiasMedicamentos },
    { label: 'Outras alergias', v: anamnesis.alergiasOutras },
    { label: 'Alergia a cosméticos', v: anamnesis.alergiaCosmeticos },
  ].filter((x) => x.v && String(x.v).trim());
  const hasAlerts = activeConditions.length > 0 || allergyEntries.length > 0;

  return (
    <Stack spacing={2.5}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
        <HighlightCard
          icon={<EventNoteOutlinedIcon sx={{ fontSize: 18 }} />}
          label="Próximo agendamento"
          value={upcoming ? dayjs(upcoming.startAt).format('DD/MM/YYYY [às] HH:mm') : '—'}
          sub={upcoming?.procedure?.name}
        />
        <HighlightCard
          icon={<AssignmentOutlinedIcon sx={{ fontSize: 18 }} />}
          label="Último atendimento"
          value={last ? dayjs(last.startAt).format('DD/MM/YYYY') : '—'}
          sub={last?.procedure?.name}
        />
        <HighlightCard
          icon={<ViewInArIcon sx={{ fontSize: 18 }} />}
          label="Pacotes ativos"
          value={String(activePackagesCount)}
        />
      </Box>

      {hasAlerts && (
        <SectionCard title="Alertas clínicos" icon={<AssignmentOutlinedIcon sx={{ fontSize: 18 }} />}>
          <Stack direction="row" flexWrap="wrap" gap={1}>
            {activeConditions.map((c) => (
              <Box
                key={c.key}
                component="span"
                sx={{
                  fontSize: fontSizes.xs,
                  fontWeight: 700,
                  px: 1.25,
                  py: 0.5,
                  borderRadius: '8px',
                  color: 'warning.dark',
                  bgcolor: (t) => alpha(t.palette.warning.main, 0.16),
                }}
              >
                {c.label}
              </Box>
            ))}
            {allergyEntries.map((a) => (
              <Box
                key={a.label}
                component="span"
                sx={{
                  fontSize: fontSizes.xs,
                  fontWeight: 700,
                  px: 1.25,
                  py: 0.5,
                  borderRadius: '8px',
                  color: 'error.dark',
                  bgcolor: (t) => alpha(t.palette.error.main, 0.14),
                }}
              >
                {a.label}: {String(a.v)}
              </Box>
            ))}
          </Stack>
        </SectionCard>
      )}

      {data.notes?.trim() && (
        <SectionCard title="Observações do cadastro" icon={<DescriptionOutlinedIcon sx={{ fontSize: 18 }} />}>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
            {data.notes.trim()}
          </Typography>
        </SectionCard>
      )}

      {!hasAlerts && !data.notes?.trim() && !upcoming && !last && (
        <Typography variant="body2" color="text.secondary">
          Sem informações adicionais para exibir.
        </Typography>
      )}
    </Stack>
  );
}

const APPTS_PAGE_SIZE = 6;

function isApptPaid(a: Appointment) {
  return !!a.financeGenerated || !!(a.financialEntries && a.financialEntries.length > 0);
}

function AppointmentsTab({ appointments }: { appointments: Appointment[] }) {
  const [page, setPage] = useState(0);
  const [payFilter, setPayFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

  const filtered = useMemo(() => {
    let list = appointments;
    if (payFilter === 'paid') list = list.filter(isApptPaid);
    else if (payFilter === 'unpaid') list = list.filter((a) => !isApptPaid(a));
    return [...list].sort((a, b) => {
      const d = dayjs(a.startAt).valueOf() - dayjs(b.startAt).valueOf();
      return sortDir === 'asc' ? d : -d;
    });
  }, [appointments, payFilter, sortDir]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / APPTS_PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const rows = filtered.slice(current * APPTS_PAGE_SIZE, current * APPTS_PAGE_SIZE + APPTS_PAGE_SIZE);

  return (
    <Stack spacing={1.5}>
      {/* Filtros */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" spacing={1} useFlexGap>
        <Box sx={{ display: 'inline-flex', gap: 0.5, p: 0.5, borderRadius: '10px', bgcolor: 'grey.100' }}>
          {([
            { k: 'all', l: 'Todos' },
            { k: 'paid', l: 'Pago' },
            { k: 'unpaid', l: 'Não pago' },
          ] as const).map((o) => {
            const active = payFilter === o.k;
            return (
              <Box
                key={o.k}
                component="button"
                type="button"
                onClick={() => {
                  setPayFilter(o.k);
                  setPage(0);
                }}
                sx={{
                  border: 0,
                  cursor: 'pointer',
                  px: 1.5,
                  py: 0.65,
                  borderRadius: '8px',
                  fontFamily: 'inherit',
                  fontSize: fontSizes.xs,
                  fontWeight: 700,
                  color: active ? 'primary.main' : 'text.secondary',
                  bgcolor: active ? 'background.paper' : 'transparent',
                  boxShadow: active ? '0 1px 3px rgba(16,40,37,0.12)' : 'none',
                }}
              >
                {o.l}
              </Box>
            );
          })}
        </Box>
        <Button
          size="small"
          variant="outlined"
          startIcon={<ArrowUpwardRoundedIcon sx={{ fontSize: 15, transform: sortDir === 'desc' ? 'rotate(180deg)' : 'none' }} />}
          onClick={() => {
            setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
            setPage(0);
          }}
          sx={{
            height: 34,
            borderRadius: '9px',
            bgcolor: 'background.paper',
            borderColor: 'divider',
            color: 'text.secondary',
            fontWeight: 700,
            fontSize: fontSizes.xs,
            '&:hover': { bgcolor: 'grey.50', borderColor: 'divider' },
          }}
        >
          {sortDir === 'desc' ? 'Mais recentes' : 'Mais antigos'}
        </Button>
      </Stack>

      {filtered.length === 0 ? (
        <EmptyBlock
          message={
            appointments.length === 0
              ? 'Nenhum agendamento registrado.'
              : 'Nenhum agendamento com esse filtro.'
          }
        />
      ) : (
        rows.map((appt) => <AppointmentRowCard key={appt.id} appt={appt} />)
      )}
      {pageCount > 1 && (
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ pt: 0.5 }}>
          <Typography sx={{ fontSize: fontSizes.xs, color: 'text.secondary', fontWeight: 600 }}>
            {current * APPTS_PAGE_SIZE + 1}–{Math.min((current + 1) * APPTS_PAGE_SIZE, filtered.length)} de{' '}
            {filtered.length}
          </Typography>
          <Stack direction="row" spacing={0.75}>
            <IconButton
              size="small"
              disabled={current === 0}
              onClick={() => setPage((v) => Math.max(0, v - 1))}
              sx={{ border: 1, borderColor: 'divider', borderRadius: '9px' }}
            >
              <ChevronLeftIcon fontSize="small" />
            </IconButton>
            <IconButton
              size="small"
              disabled={current >= pageCount - 1}
              onClick={() => setPage((v) => Math.min(pageCount - 1, v + 1))}
              sx={{ border: 1, borderColor: 'divider', borderRadius: '9px' }}
            >
              <ChevronRightIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>
      )}
    </Stack>
  );
}

function PackagesTab({ patientPackages }: { patientPackages: any[] }) {
  return (
    <Stack spacing={1.5}>
      {patientPackages.length > 0 ? (
        patientPackages.map((pp: any) => (
          <PackageCard
            key={pp.id}
            name={pp.package?.name ?? 'Pacote'}
            status={pp.status}
            sessionsUsed={pp.sessionsUsed}
            sessionsTotal={pp.sessionsTotal}
            totalPaid={Number(pp.totalPaid)}
            expiresAt={pp.expiresAt}
          />
        ))
      ) : (
        <EmptyBlock message="Nenhum pacote vinculado." />
      )}
    </Stack>
  );
}

function AppointmentRowCard({ appt }: { appt: Appointment }) {
  const accent = appointmentStatusAccent[appt.status] ?? 'primary.main';
  const income = appt.financialEntries?.[0];
  const paid = !!appt.financeGenerated || !!income;
  const value = income ? Number(income.amount) : (appt.procedure as any)?.price;
  const paymentName = income?.paymentMethod?.name;
  const adminNotes = appt.notes?.trim();
  const clinicalNotes = appt.clinicalNotes?.trim();

  return (
    <Paper
      variant="outlined"
      sx={{ p: '16px 18px', borderRadius: '14px', bgcolor: 'grey.50', borderColor: 'divider' }}
    >
      <Stack direction="row" spacing={1.5} alignItems="stretch">
        <Box sx={{ width: 3, borderRadius: '3px', bgcolor: accent, flexShrink: 0, alignSelf: 'stretch' }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: fontSizes.md, fontWeight: 800 }} noWrap>
                {appt.procedure?.name ?? appointmentKindLabel[appt.kind] ?? 'Atendimento'}
              </Typography>
              <Typography sx={{ fontSize: fontSizes.xs, color: 'text.secondary' }}>
                {dayjs(appt.startAt).format('DD/MM/YYYY [às] HH:mm')}
                {appt.professional?.name ? ` · ${appt.professional.name}` : ''}
              </Typography>
            </Box>
            {value != null && (
              <Typography sx={{ fontSize: fontSizes.md, fontWeight: 800, flexShrink: 0 }}>
                {brl.format(Number(value))}
              </Typography>
            )}
          </Stack>

          {/* Pagamento */}
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
            <Box
              component="span"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                fontSize: fontSizes['2xs'],
                fontWeight: 800,
                px: 1,
                py: 0.35,
                borderRadius: '8px',
                color: paid ? 'success.dark' : 'warning.dark',
                bgcolor: (t) => alpha(paid ? t.palette.success.main : t.palette.warning.main, 0.16),
              }}
            >
              {paid ? 'Pago' : 'Não pago'}
            </Box>
            {paid && paymentName && (
              <Typography sx={{ fontSize: fontSizes.xs, color: 'text.secondary', fontWeight: 600 }}>
                via {paymentName}
              </Typography>
            )}
          </Stack>

          {(adminNotes || clinicalNotes) && (
            <Box sx={{ mt: 1.25, pt: 1.25, borderTop: 1, borderColor: 'divider' }}>
              {adminNotes && (
                <Typography sx={{ fontSize: fontSizes.xs, color: 'text.secondary', lineHeight: 1.5 }}>
                  <Box component="b" sx={{ color: 'text.disabled', fontSize: fontSizes['2xs'], letterSpacing: '0.3px' }}>
                    OBSERVAÇÃO:{' '}
                  </Box>
                  {adminNotes}
                </Typography>
              )}
              {clinicalNotes && (
                <Typography sx={{ fontSize: fontSizes.xs, color: 'text.secondary', lineHeight: 1.5, mt: adminNotes ? 0.75 : 0 }}>
                  <Box component="b" sx={{ color: 'text.disabled', fontSize: fontSizes['2xs'], letterSpacing: '0.3px' }}>
                    ANOTAÇÃO CLÍNICA:{' '}
                  </Box>
                  {clinicalNotes}
                </Typography>
              )}
            </Box>
          )}
        </Box>
      </Stack>
    </Paper>
  );
}

function PackageCard({
  name, status, sessionsUsed, sessionsTotal, totalPaid, expiresAt,
}: {
  name: string; status: string; sessionsUsed: number; sessionsTotal: number;
  totalPaid: number; expiresAt?: string | null;
}) {
  const progress = sessionsTotal > 0 ? Math.min(100, (sessionsUsed / sessionsTotal) * 100) : 0;

  return (
    <Paper variant="outlined" sx={{ p: 2, borderColor: 'divider' }}>
      <Stack spacing={1.5}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={700} noWrap>{name}</Typography>
            <Typography variant="caption" color="text.secondary">
              {brl.format(totalPaid)}
              {expiresAt ? ` · expira ${formatDateOnlyFromApi(expiresAt)}` : ''}
            </Typography>
          </Box>
          <Chip
            size="small"
            label={packageStatusLabel[status] ?? status}
            color={packageStatusColor[status] ?? 'default'}
            variant={status === 'ACTIVE' ? 'filled' : 'outlined'}
          />
        </Stack>
        <Box>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">Sessões utilizadas</Typography>
            <Typography variant="caption" fontWeight={600}>{sessionsUsed}/{sessionsTotal}</Typography>
          </Stack>
          <LinearProgress variant="determinate" value={progress} sx={{ height: 6, borderRadius: 3 }} />
        </Box>
      </Stack>
    </Paper>
  );
}

export function PatientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { has } = usePermissions();
  const canEdit = has('patients:edit');
  const { openAppointmentDialog } = useAppointmentDialog();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<DetailTab>((searchParams.get('tab') as DetailTab) || 'general');
  const [anamnesisOpen, setAnamnesisOpen] = useState(false);

  const { data, isLoading, reliability } = usePatientChart(id);

  const { data: patientPackages = [] } = useQuery({
    queryKey: ['patient-packages', id],
    queryFn: () => packagesApi.listPatientPackages(id!),
    enabled: !!id,
  });

  const activePackagesCount = useMemo(
    () => patientPackages.filter((p) => p.status === 'ACTIVE').length,
    [patientPackages],
  );

  const ageLabel = data ? patientAgeLabel(data.birthDate) : null;
  const addressLine = data ? formatPatientAddressDisplay(data) : '';

  if (isLoading && !data) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" sx={{ minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!data) {
    return (
      <Box sx={{ p: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/pacientes')}>
          Voltar para pacientes
        </Button>
        <Typography sx={{ mt: 2 }}>Paciente não encontrado.</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Button
        variant="outlined"
        startIcon={<ChevronLeftIcon />}
        onClick={() => navigate(`/pacientes?ficha=${id}`)}
        sx={{
          mb: 2.5,
          height: 38,
          borderRadius: '11px',
          bgcolor: 'background.paper',
          borderColor: 'divider',
          color: 'text.secondary',
          fontWeight: 700,
          '&:hover': { bgcolor: 'grey.50', borderColor: 'divider' },
        }}
      >
        Voltar para pacientes
      </Button>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '320px 1fr' },
          gap: { xs: 2, md: 3 },
          alignItems: 'start',
        }}
      >
        {/* Sidebar de resumo */}
        <Paper
          variant="outlined"
          sx={{
            borderColor: 'divider',
            borderRadius: '20px',
            overflow: 'hidden',
            position: { md: 'sticky' },
            top: { md: 16 },
          }}
        >
          <Box
            sx={{
              p: 3,
              textAlign: 'center',
              borderBottom: 1,
              borderColor: 'divider',
              background: (theme) =>
                `linear-gradient(160deg, ${alpha(theme.palette.primary.main, 0.12)}, transparent)`,
            }}
          >
            <Avatar
              src={data.photoUrl ?? undefined}
              alt={data.name}
              variant="rounded"
              sx={{
                width: 84,
                height: 84,
                borderRadius: '24px',
                mx: 'auto',
                mb: 1.5,
                fontSize: fontSizes['6xl'],
                fontWeight: 800,
                bgcolor: (theme) => alpha(theme.palette.primary.main, 0.16),
                color: 'primary.dark',
                boxShadow: '0 10px 26px -8px rgba(16,40,37,.4)',
              }}
            >
              {patientInitials(data.name)}
            </Avatar>
            <Typography sx={{ fontSize: fontSizes['3xl'], fontWeight: 800, letterSpacing: '-0.4px' }}>
              {data.name}
            </Typography>
            {data.phone && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {maskPhone(data.phone) || data.phone}
              </Typography>
            )}
            {reliability != null &&
              (() => {
                const tone = scoreTone(reliability.reliabilityPercent);
                return (
                  <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ mt: 1.5 }}>
                    <ReliabilityBadge value={reliability.reliabilityPercent} variant="page" />
                    <Typography sx={{ fontSize: fontSizes.xs, fontWeight: 700, color: tone.main }}>
                      {tone.label}
                    </Typography>
                  </Stack>
                );
              })()}
          </Box>

          <Stack spacing={1.75} sx={{ p: 2.5 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
              {[
                { value: String(data.visits ?? 0), label: 'visitas', tone: 'text.primary' },
                { value: brl.format(data.totalSpent ?? 0), label: 'gasto', tone: 'primary.main' },
                {
                  value: data.lastVisit ? dayjs(data.lastVisit).format('DD MMM') : '—',
                  label: 'última',
                  tone: 'text.primary',
                },
              ].map((s) => (
                <Box key={s.label} sx={{ textAlign: 'center' }}>
                  <Typography sx={{ fontSize: fontSizes.xl, fontWeight: 800, color: s.tone }}>{s.value}</Typography>
                  <Typography sx={{ fontSize: fontSizes['2xs'], color: 'text.secondary', fontWeight: 600 }}>
                    {s.label}
                  </Typography>
                </Box>
              ))}
            </Box>

            <Box sx={{ height: '1px', bgcolor: 'divider' }} />

            {data.document && (
              <Box>
                <Typography sx={{ fontSize: fontSizes['2xs'], fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                  CPF
                </Typography>
                <Typography sx={{ fontSize: fontSizes.md, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                  {data.document}
                </Typography>
              </Box>
            )}
            {data.birthDate && (
              <Box>
                <Typography sx={{ fontSize: fontSizes['2xs'], fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                  Nascimento
                </Typography>
                <Typography sx={{ fontSize: fontSizes.md, fontWeight: 600 }}>
                  {formatDateOnlyFromApi(data.birthDate)}
                  {ageLabel ? ` · ${ageLabel}` : ''}
                </Typography>
              </Box>
            )}
            {data.sex && (
              <Box>
                <Typography sx={{ fontSize: fontSizes['2xs'], fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                  Sexo
                </Typography>
                <Typography sx={{ fontSize: fontSizes.md, fontWeight: 600 }}>
                  {patientSexLabel(data.sex)}
                </Typography>
              </Box>
            )}
            {addressLine && (
              <Box>
                <Typography sx={{ fontSize: fontSizes['2xs'], fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                  Endereço
                </Typography>
                <Typography sx={{ fontSize: fontSizes.sm, fontWeight: 500, lineHeight: 1.4 }}>
                  {addressLine}
                </Typography>
              </Box>
            )}
            {data.email && (
              <Box>
                <Typography sx={{ fontSize: fontSizes['2xs'], fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                  E-mail
                </Typography>
                <Typography sx={{ fontSize: fontSizes.sm, fontWeight: 500 }} noWrap>
                  {data.email}
                </Typography>
              </Box>
            )}

            <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => openAppointmentDialog({ patientId: id })}
                sx={{ borderRadius: '11px', boxShadow: (t) => `0 6px 16px -6px ${t.palette.primary.main}` }}
              >
                Agendar
              </Button>
              {data.phone && (
                <PatientWhatsAppButton phone={data.phone} sx={{ flexShrink: 0, borderRadius: '11px' }} />
              )}
            </Stack>
          </Stack>
        </Paper>

        {/* Conteúdo */}
        <Box sx={{ minWidth: 0 }}>
          <Paper variant="outlined" sx={{ borderColor: 'divider', borderRadius: '16px', overflow: 'hidden' }}>
            <Tabs
              value={tab}
              onChange={(_, value: DetailTab) => setTab(value)}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                px: { xs: 1, sm: 2 },
                minHeight: 48,
                borderBottom: 1,
                borderColor: 'divider',
                '& .MuiTab-root': { minHeight: 48, textTransform: 'none', fontWeight: 600, fontSize: fontSizes.md },
              }}
            >
              <Tab value="general" label="Visão geral" icon={<PersonOutlineIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
              <Tab value="appointments" label="Agendamentos" icon={<EventNoteOutlinedIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
              <Tab value="packages" label="Pacotes" icon={<ViewInArIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
              <Tab value="anamnesis" label="Anamnese" icon={<AssignmentOutlinedIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
              <Tab value="fotos" label="Fotos" icon={<PhotoLibraryOutlinedIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
            </Tabs>

            <Box sx={{ minHeight: 300, p: { xs: 2, sm: 2.75 } }}>
            {tab === 'general' && <GeneralTab data={data} activePackagesCount={activePackagesCount} />}
            {tab === 'appointments' && <AppointmentsTab appointments={data.appointments ?? []} />}
            {tab === 'packages' && <PackagesTab patientPackages={patientPackages} />}
            {tab === 'anamnesis' && (
              <PatientAnamnesisSection patient={data} onEdit={canEdit ? () => setAnamnesisOpen(true) : undefined} />
            )}
            {tab === 'fotos' && (
              <PatientPhotosGallery patientId={id!} canEdit={canEdit} showTitle={false} />
            )}
            </Box>
          </Paper>
        </Box>
      </Box>

      <AnamnesisFormDialog
        open={anamnesisOpen}
        patientId={id ?? null}
        onClose={() => setAnamnesisOpen(false)}
      />
    </Box>
  );
}

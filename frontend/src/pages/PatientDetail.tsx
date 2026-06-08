import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Tooltip,
  Typography,
  alpha,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import CakeOutlinedIcon from '@mui/icons-material/CakeOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import WcOutlinedIcon from '@mui/icons-material/WcOutlined';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import type { ReactNode } from 'react';

import { patientsApi } from '../api/patients';
import { packagesApi } from '../api/packages';
import { financeApi } from '../api/finance';
import { documentsApi } from '../api/documents';
import { AnamnesisView, hasAnamnesisData } from '../components/patients/AnamnesisView';
import { AnamnesisFormDialog } from '../components/patients/AnamnesisFormDialog';
import { usePermissions } from '../contexts/usePermissions';
import { dayjsFromDateOnlyApi, formatDateOnlyFromApi } from '../utils/dateOnly';
import { formatPatientAddressDisplay } from '../utils/patientAddress';
import { patientSexLabel } from '../utils/patientSex';
import { patientReferralSourceLabel } from '../utils/patientReferralSource';
import { maskCEP, maskPhone, onlyDigits } from '../utils/masks';
import { patientInitials } from '../utils/patientPhoto';
import type { Appointment, AppointmentKind, FinancialEntry, DocumentFile } from '../types';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

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

const statusLabel: Record<string, string> = {
  SCHEDULED: 'Agendado',
  CONFIRMED: 'Confirmado',
  IN_PROGRESS: 'Em atendimento',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
  NO_SHOW: 'Faltou',
};

const statusAccent: Record<string, string> = {
  SCHEDULED: 'info.main',
  CONFIRMED: 'primary.main',
  IN_PROGRESS: 'warning.main',
  COMPLETED: 'success.main',
  CANCELLED: 'error.main',
  NO_SHOW: 'error.main',
};

const kindLabel: Record<AppointmentKind, string> = {
  EVALUATION: 'Avaliação',
  PROCEDURE: 'Procedimento',
  RETURN: 'Retorno',
};

type DetailTab = 'general' | 'notes' | 'appointments' | 'packages' | 'anamnesis' | 'finance' | 'documents';

/* ─── Helpers ─── */

function patientAgeLabel(birthDate?: string | null) {
  const birth = dayjsFromDateOnlyApi(birthDate);
  if (!birth) return null;
  const age = dayjs().diff(birth, 'year');
  return age >= 0 ? `${age} anos` : null;
}

/* ─── Reusable sub-components ─── */

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

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  if (value == null || value === '' || value === '—') return null;
  return (
    <Stack direction="row" spacing={1.5} sx={{ py: 0.75 }}>
      <Typography variant="body2" color="text.secondary" sx={{ width: 130, flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={500} sx={{ flex: 1, minWidth: 0 }}>
        {value}
      </Typography>
    </Stack>
  );
}

function EmptyBlock({ message }: { message: string }) {
  return (
    <Box
      sx={{
        py: 4,
        px: 2,
        textAlign: 'center',
        borderRadius: 2,
        border: '1px dashed',
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}
    >
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
    </Box>
  );
}

function NoteBlock({ label, text }: { label: string; text: string }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ display: 'block', mb: 0.5 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>
        {text}
      </Typography>
    </Box>
  );
}

/* ─── Tab content components ─── */

function GeneralTab({ data, ageLabel, addressLine }: { data: any; ageLabel: string | null; addressLine: string }) {
  return (
    <Stack spacing={2.5}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5}>
        <Box sx={{ flex: 1 }}>
          <SectionCard title="Contato" icon={<PhoneOutlinedIcon sx={{ fontSize: 18 }} />}>
            <Stack divider={<Box sx={{ borderBottom: 1, borderColor: 'divider' }} />}>
              <InfoRow label="Telefone" value={data.phone ? maskPhone(data.phone) || data.phone : null} />
              <InfoRow label="E-mail" value={data.email} />
            </Stack>
            {!data.phone && !data.email && (
              <Typography variant="body2" color="text.secondary">Nenhum contato cadastrado.</Typography>
            )}
          </SectionCard>
        </Box>
        <Box sx={{ flex: 1 }}>
          <SectionCard title="Dados pessoais" icon={<BadgeOutlinedIcon sx={{ fontSize: 18 }} />}>
            <Stack divider={<Box sx={{ borderBottom: 1, borderColor: 'divider' }} />}>
              <InfoRow
                label="Nascimento"
                value={data.birthDate ? `${formatDateOnlyFromApi(data.birthDate)}${ageLabel ? ` (${ageLabel})` : ''}` : null}
              />
              <InfoRow label="Sexo" value={data.sex ? patientSexLabel(data.sex) : null} />
              <InfoRow
                label="Como conheceu"
                value={data.referralSource ? patientReferralSourceLabel(data.referralSource, data.referralSourceOther) : null}
              />
              <InfoRow label="CPF" value={data.document} />
              <InfoRow label="Cadastro" value={data.createdAt ? dayjs(data.createdAt).format('DD/MM/YYYY') : null} />
            </Stack>
          </SectionCard>
        </Box>
      </Stack>

      {(onlyDigits(data.cep ?? '').length === 8 || addressLine) && (
        <SectionCard title="Endereço" icon={<LocationOnOutlinedIcon sx={{ fontSize: 18 }} />}>
          <Stack divider={<Box sx={{ borderBottom: 1, borderColor: 'divider' }} />}>
            {onlyDigits(data.cep ?? '').length === 8 && (
              <InfoRow label="CEP" value={maskCEP(onlyDigits(data.cep ?? ''))} />
            )}
            <InfoRow label="Endereço" value={addressLine || null} />
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
    </Stack>
  );
}

function NotesTab({ data, appointmentsWithNotes }: { data: any; appointmentsWithNotes: Appointment[] }) {
  return (
    <Stack spacing={2}>
      {data.notes?.trim() && (
        <SectionCard title="Cadastro" icon={<DescriptionOutlinedIcon sx={{ fontSize: 18 }} />}>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
            {data.notes.trim()}
          </Typography>
        </SectionCard>
      )}

      {appointmentsWithNotes.length > 0 ? (
        <Stack spacing={1.5}>
          <Typography variant="subtitle2" fontWeight={700}>
            Histórico clínico ({appointmentsWithNotes.length})
          </Typography>
          {appointmentsWithNotes.map((appt) => (
            <AppointmentNotesCard key={appt.id} appt={appt} />
          ))}
        </Stack>
      ) : (
        !data.notes?.trim() && <EmptyBlock message="Nenhuma anotação registrada para esta paciente." />
      )}
    </Stack>
  );
}

function AppointmentsTab({ appointments }: { appointments: Appointment[] }) {
  return (
    <Stack spacing={1.5}>
      {appointments.length > 0 ? (
        appointments.map((appt) => <AppointmentRowCard key={appt.id} appt={appt} />)
      ) : (
        <EmptyBlock message="Nenhum agendamento registrado." />
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
            notes={pp.notes}
          />
        ))
      ) : (
        <EmptyBlock message="Nenhum pacote vinculado." />
      )}
    </Stack>
  );
}

function FinanceTab({ entries, isLoading }: { entries: FinancialEntry[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" py={6}>
        <CircularProgress />
      </Box>
    );
  }

  if (entries.length === 0) {
    return <EmptyBlock message="Nenhum lançamento financeiro encontrado." />;
  }

  const totalIncome = entries.filter((e) => e.type === 'INCOME').reduce((s, e) => s + Number(e.amount), 0);
  const totalExpense = entries.filter((e) => e.type === 'EXPENSE').reduce((s, e) => s + Number(e.amount), 0);

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1.5}>
        <Paper variant="outlined" sx={{ px: 2, py: 1.5, flex: 1, borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary">Receitas</Typography>
          <Typography variant="h6" fontWeight={700} color="success.main">
            {brl.format(totalIncome)}
          </Typography>
        </Paper>
        <Paper variant="outlined" sx={{ px: 2, py: 1.5, flex: 1, borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary">Despesas</Typography>
          <Typography variant="h6" fontWeight={700} color="error.main">
            {brl.format(totalExpense)}
          </Typography>
        </Paper>
      </Stack>

      <Stack spacing={1}>
        {entries.map((entry) => (
          <Paper
            key={entry.id}
            variant="outlined"
            sx={{
              p: 1.75,
              borderColor: 'divider',
              borderLeft: '4px solid',
              borderLeftColor: entry.type === 'INCOME' ? 'success.main' : 'error.main',
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" fontWeight={700}>
                  {entry.description}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  {entry.paidAt ? dayjs(entry.paidAt).format('DD/MM/YYYY') : entry.dueDate ? `Vence ${dayjs(entry.dueDate).format('DD/MM/YYYY')}` : ''}
                  {entry.appointment?.procedure?.name ? ` · ${entry.appointment.procedure.name}` : ''}
                  {entry.paymentMethod?.name ? ` · ${entry.paymentMethod.name}` : ''}
                </Typography>
              </Box>
              <Typography
                variant="body2"
                fontWeight={700}
                color={entry.type === 'INCOME' ? 'success.main' : 'error.main'}
                sx={{ flexShrink: 0, ml: 1 }}
              >
                {entry.type === 'EXPENSE' ? '- ' : ''}{brl.format(Number(entry.amount))}
              </Typography>
            </Stack>
          </Paper>
        ))}
      </Stack>
    </Stack>
  );
}

function DocumentsTab({
  documents,
  isLoading,
}: {
  documents: DocumentFile[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" py={6}>
        <CircularProgress />
      </Box>
    );
  }

  if (documents.length === 0) {
    return <EmptyBlock message="Nenhum documento anexado." />;
  }

  return (
    <Stack spacing={1.5}>
      {documents.map((doc) => (
        <Paper key={doc.id} variant="outlined" sx={{ p: 2, borderColor: 'divider' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="body2" fontWeight={700} noWrap>
                {doc.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                {doc.category && `${doc.category} · `}
                {dayjs(doc.createdAt).format('DD/MM/YYYY')}
                {doc.size ? ` · ${(doc.size / 1024).toFixed(0)} KB` : ''}
              </Typography>
              {doc.notes?.trim() && (
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                  {doc.notes.trim()}
                </Typography>
              )}
            </Box>
            {doc.fileUrl && (
              <Tooltip title="Abrir documento">
                <IconButton
                  size="small"
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <OpenInNewIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}

/* ─── Card sub-components (same as drawer) ─── */

function AppointmentNotesCard({ appt }: { appt: Appointment }) {
  const hasNotes = !!(appt.notes?.trim() || appt.clinicalNotes?.trim());
  const accent = statusAccent[appt.status] ?? 'primary.main';

  return (
    <Paper
      variant="outlined"
      sx={{ p: 2, borderColor: 'divider', borderLeft: '4px solid', borderLeftColor: accent }}
    >
      <Stack spacing={1.25}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={700}>
              {dayjs(appt.startAt).format('DD/MM/YYYY · HH:mm')}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              {appt.procedure?.name ?? kindLabel[appt.kind] ?? 'Atendimento'}
              {appt.professional?.name ? ` · ${appt.professional.name}` : ''}
            </Typography>
          </Box>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" justifyContent="flex-end">
            <Chip size="small" label={kindLabel[appt.kind] ?? appt.kind} variant="outlined" />
            <Chip
              size="small"
              label={statusLabel[appt.status] ?? appt.status}
              color={
                appt.status === 'COMPLETED' ? 'success' : appt.status === 'CANCELLED' || appt.status === 'NO_SHOW' ? 'error' : 'default'
              }
              variant={appt.status === 'COMPLETED' ? 'filled' : 'outlined'}
            />
          </Stack>
        </Stack>
        {hasNotes ? (
          <Stack spacing={1.25} sx={{ pt: 0.5 }}>
            {appt.notes?.trim() && <NoteBlock label="Observações administrativas" text={appt.notes.trim()} />}
            {appt.clinicalNotes?.trim() && <NoteBlock label="Anotações clínicas" text={appt.clinicalNotes.trim()} />}
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">Sem anotações neste atendimento.</Typography>
        )}
      </Stack>
    </Paper>
  );
}

function AppointmentRowCard({ appt }: { appt: Appointment }) {
  const accent = statusAccent[appt.status] ?? 'divider';
  const hasNotes = !!(appt.notes?.trim() || appt.clinicalNotes?.trim());

  return (
    <Paper
      variant="outlined"
      sx={{ p: 1.75, borderColor: 'divider', borderLeft: '4px solid', borderLeftColor: accent }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {dayjs(appt.startAt).format('DD/MM/YYYY')}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block">
            {dayjs(appt.startAt).format('HH:mm')}
            {appt.procedure?.name ? ` · ${appt.procedure.name}` : ''}
          </Typography>
          {appt.professional?.name && (
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.25 }}>
              {appt.professional.name}
            </Typography>
          )}
          {hasNotes && (
            <Chip
              size="small"
              label={appt.clinicalNotes?.trim() ? 'Com anotações clínicas' : 'Com observações'}
              sx={{ mt: 1, height: 22, fontSize: '0.7rem' }}
              variant="outlined"
            />
          )}
        </Box>
        <Stack spacing={0.5} alignItems="flex-end">
          <Chip size="small" label={kindLabel[appt.kind] ?? appt.kind} variant="outlined" />
          <Chip
            size="small"
            label={statusLabel[appt.status] ?? appt.status}
            color={appt.status === 'COMPLETED' ? 'success' : appt.status === 'CANCELLED' || appt.status === 'NO_SHOW' ? 'error' : 'default'}
            variant={appt.status === 'COMPLETED' ? 'filled' : 'outlined'}
          />
        </Stack>
      </Stack>
    </Paper>
  );
}

function PackageCard({
  name, status, sessionsUsed, sessionsTotal, totalPaid, expiresAt, notes,
}: {
  name: string; status: string; sessionsUsed: number; sessionsTotal: number;
  totalPaid: number; expiresAt?: string | null; notes?: string;
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
        {notes?.trim() && (
          <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
            {notes.trim()}
          </Typography>
        )}
      </Stack>
    </Paper>
  );
}

/* ─── Main page ─── */

export function PatientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { has } = usePermissions();
  const canEdit = has('patients:edit');
  const [tab, setTab] = useState<DetailTab>('general');
  const [anamnesisOpen, setAnamnesisOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['patient', id],
    queryFn: () => patientsApi.findOne(id!),
    enabled: !!id,
  });

  const { data: reliability } = useQuery({
    queryKey: ['patient-reliability', id],
    queryFn: () => patientsApi.getReliability(id!),
    enabled: !!id,
  });

  const { data: patientPackages = [] } = useQuery({
    queryKey: ['patient-packages', id],
    queryFn: () => packagesApi.listPatientPackages(id!),
    enabled: !!id,
  });

  const { data: financeEntries = [], isLoading: financeLoading } = useQuery({
    queryKey: ['patient-finance', id],
    queryFn: () => financeApi.list(undefined, undefined, undefined, undefined, id!),
    enabled: !!id && tab === 'finance',
  });

  const { data: documents = [], isLoading: documentsLoading } = useQuery({
    queryKey: ['patient-documents', id],
    queryFn: () => documentsApi.list({ patientId: id! }),
    enabled: !!id && tab === 'documents',
  });

  const appointmentsWithNotes = useMemo(() => {
    if (!data?.appointments) return [];
    return data.appointments.filter((a) => a.notes?.trim() || a.clinicalNotes?.trim());
  }, [data?.appointments]);

  const activePackagesCount = useMemo(
    () => patientPackages.filter((p) => p.status === 'ACTIVE').length,
    [patientPackages],
  );

  const upcomingAppointmentsCount = useMemo(() => {
    if (!data?.appointments) return 0;
    const now = dayjs();
    return data.appointments.filter(
      (a) => dayjs(a.startAt).isAfter(now) && a.status !== 'CANCELLED' && a.status !== 'NO_SHOW',
    ).length;
  }, [data?.appointments]);

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
      {/* Back button */}
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/pacientes')}
        sx={{ mb: 2 }}
      >
        Voltar para pacientes
      </Button>

      {/* Header */}
      <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, mb: 3, borderColor: 'divider' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} alignItems={{ sm: 'flex-start' }}>
          <Avatar
            src={data.photoUrl ?? undefined}
            alt={data.name}
            sx={{
              width: 80,
              height: 80,
              fontSize: '1.5rem',
              fontWeight: 700,
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.14),
              color: 'primary.dark',
            }}
          >
            {patientInitials(data.name)}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h4" fontWeight={700} letterSpacing="-0.02em">
              {data.name}
            </Typography>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
              {ageLabel && <Chip size="small" icon={<CakeOutlinedIcon />} label={ageLabel} variant="outlined" />}
              {data.sex && <Chip size="small" icon={<WcOutlinedIcon />} label={patientSexLabel(data.sex)} variant="outlined" />}
              {reliability != null && (
                <Chip
                  size="small"
                  label={`Confiabilidade ${reliability.reliabilityPercent}%`}
                  color={reliability.reliabilityPercent >= 80 ? 'success' : reliability.reliabilityPercent >= 50 ? 'warning' : 'error'}
                  variant="outlined"
                />
              )}
            </Stack>
            <Stack direction="row" spacing={2.5} flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
              {data.phone && (
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <PhoneOutlinedIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    {maskPhone(data.phone) || data.phone}
                  </Typography>
                </Stack>
              )}
              {data.email && (
                <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
                  <EmailOutlinedIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {data.email}
                  </Typography>
                </Stack>
              )}
            </Stack>
          </Box>
        </Stack>

        {/* Stat cards */}
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ mt: 2.5 }}>
          <Paper variant="outlined" sx={{ px: 2, py: 1.25, minWidth: 110, flex: 1, borderColor: 'divider' }}>
            <Typography variant="h6" fontWeight={700}>{data.appointments?.length ?? 0}</Typography>
            <Typography variant="caption" color="text.secondary">Agendamentos</Typography>
          </Paper>
          <Paper variant="outlined" sx={{ px: 2, py: 1.25, minWidth: 110, flex: 1, borderColor: 'divider' }}>
            <Typography variant="h6" fontWeight={700}>{upcomingAppointmentsCount}</Typography>
            <Typography variant="caption" color="text.secondary">Próximos</Typography>
          </Paper>
          <Paper variant="outlined" sx={{ px: 2, py: 1.25, minWidth: 110, flex: 1, borderColor: 'divider' }}>
            <Typography variant="h6" fontWeight={700}>{activePackagesCount}</Typography>
            <Typography variant="caption" color="text.secondary">Pacotes ativos</Typography>
          </Paper>
        </Stack>
      </Paper>

      {/* Tabs */}
      <Paper variant="outlined" sx={{ borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={tab}
          onChange={(_, value: DetailTab) => setTab(value)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            px: { xs: 1, sm: 2 },
            minHeight: 48,
            '& .MuiTab-root': { minHeight: 48, textTransform: 'none', fontWeight: 500, fontSize: '0.875rem' },
          }}
        >
          <Tab value="general" label="Visão geral" icon={<PersonOutlineIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab value="notes" label="Anotações" icon={<DescriptionOutlinedIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab value="appointments" label="Agendamentos" icon={<EventNoteOutlinedIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab value="packages" label="Pacotes" icon={<ViewInArIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab value="anamnesis" label="Anamnese" icon={<AssignmentOutlinedIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab value="finance" label="Financeiro" icon={<AttachMoneyIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab value="documents" label="Documentos" icon={<FolderOutlinedIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Tab content */}
      <Box sx={{ minHeight: 300 }}>
        {tab === 'general' && <GeneralTab data={data} ageLabel={ageLabel} addressLine={addressLine} />}
        {tab === 'notes' && <NotesTab data={data} appointmentsWithNotes={appointmentsWithNotes} />}
        {tab === 'appointments' && <AppointmentsTab appointments={data.appointments ?? []} />}
        {tab === 'packages' && <PackagesTab patientPackages={patientPackages} />}
        {tab === 'anamnesis' && (
          <Stack spacing={2}>
            {canEdit && (
              <Stack direction="row" justifyContent="flex-end">
                <Button
                  variant="contained"
                  startIcon={<EditOutlinedIcon />}
                  onClick={() => setAnamnesisOpen(true)}
                >
                  {hasAnamnesisData(data.anamnesis) ? 'Editar anamnese' : 'Preencher anamnese'}
                </Button>
              </Stack>
            )}
            <AnamnesisView anamnesis={data.anamnesis} />
          </Stack>
        )}
        {tab === 'finance' && <FinanceTab entries={financeEntries} isLoading={financeLoading} />}
        {tab === 'documents' && <DocumentsTab documents={documents} isLoading={documentsLoading} />}
      </Box>

      <AnamnesisFormDialog
        open={anamnesisOpen}
        patientId={id ?? null}
        onClose={() => setAnamnesisOpen(false)}
      />
    </Box>
  );
}

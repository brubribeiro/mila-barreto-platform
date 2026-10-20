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
  Tooltip,
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
import { ANAMNESIS_SECTIONS } from '../components/patients/anamnesisFields';
import { AnamnesisFormDialog } from '../components/patients/AnamnesisFormDialog';
import { PatientPhotosGallery } from '../components/patients/PatientPhotosGallery';
import { PatientSkinRoutinesCard } from '../components/skincare/PatientSkinRoutinesCard';
import { useAppointmentDialog } from '../contexts/AppointmentDialogContext';
import PhotoLibraryOutlinedIcon from '@mui/icons-material/PhotoLibraryOutlined';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import AddIcon from '@mui/icons-material/Add';
import { usePermissions } from '../contexts/usePermissions';
import { dayjsFromDateOnlyApi, formatDateOnlyFromApi } from '../utils/dateOnly';
import { formatPatientAddressDisplay } from '../utils/patientAddress';
import { patientSexLabel } from '../utils/patientSex';
import { patientReferralSourceLabel } from '../utils/patientReferralSource';
import { maskCEP, maskPhone, onlyDigits } from '../utils/masks';
import { patientInitials } from '../utils/patientPhoto';
import type { Appointment, AppointmentKind, FinancialEntry, DocumentFile } from '../types';
import { fontSizes } from '../theme/fontSizes';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function scoreTone(v: number) {
  if (v >= 90) return { main: '#15998B', label: 'Excelente' };
  if (v >= 75) return { main: '#C98A12', label: 'Bom' };
  return { main: '#D65A5A', label: 'Atenção' };
}

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

type DetailTab = 'general' | 'appointments' | 'packages' | 'anamnesis' | 'fotos';

function patientAgeLabel(birthDate?: string | null) {
  const birth = dayjsFromDateOnlyApi(birthDate);
  if (!birth) return null;
  const age = dayjs().diff(birth, 'year');
  return age >= 0 ? `${age} anos` : null;
}

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
  const accent = statusAccent[appt.status] ?? 'primary.main';
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
                {appt.procedure?.name ?? kindLabel[appt.kind] ?? 'Atendimento'}
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
                    <Box
                      component="span"
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 0.5,
                        px: 1.1,
                        py: 0.4,
                        borderRadius: '9px',
                        fontSize: fontSizes.sm,
                        fontWeight: 800,
                        color: tone.main,
                        bgcolor: alpha(tone.main, 0.14),
                      }}
                    >
                      <StarRoundedIcon sx={{ fontSize: 15 }} />
                      {reliability.reliabilityPercent}
                    </Box>
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
                <Tooltip title="WhatsApp">
                  <IconButton
                    onClick={() =>
                      window.open(`https://wa.me/55${onlyDigits(data.phone ?? '')}`, '_blank', 'noopener')
                    }
                    sx={{
                      width: 38,
                      height: 38,
                      flexShrink: 0,
                      borderRadius: '11px',
                      border: 1,
                      borderColor: 'divider',
                      color: '#1DAE53',
                    }}
                  >
                    <WhatsAppIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
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
              <Stack spacing={2}>
                {has('routines:view') && (
                  <PatientSkinRoutinesCard
                    patient={{ id: data.id, name: data.name, phone: data.phone, email: data.email }}
                  />
                )}
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

import {
  Avatar,
  Box,
  Chip,
  CircularProgress,
  Drawer,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
  alpha,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import CakeOutlinedIcon from '@mui/icons-material/CakeOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import WcOutlinedIcon from '@mui/icons-material/WcOutlined';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useMemo, useState, useEffect, type ReactNode } from 'react';

import { patientsApi } from '../../api/patients';
import { packagesApi } from '../../api/packages';
import { dayjsFromDateOnlyApi, formatDateOnlyFromApi } from '../../utils/dateOnly';
import { formatPatientAddressDisplay } from '../../utils/patientAddress';
import { patientSexLabel } from '../../utils/patientSex';
import { patientReferralSourceLabel } from '../../utils/patientReferralSource';
import { maskCEP, maskPhone, onlyDigits } from '../../utils/masks';
import type { Appointment, AppointmentKind } from '../../types';
import { patientInitials } from '../../utils/patientPhoto';

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

type ChartTab = 'notes' | 'general' | 'appointments' | 'packages';

interface PatientDetailDrawerProps {
  patientId: string | null;
  onClose: () => void;
  defaultTab?: ChartTab;
  highlightAppointmentId?: string | null;
}

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

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
      }}
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
      <Typography variant="body2" color="text.secondary" sx={{ width: 108, flexShrink: 0 }}>
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

function AppointmentNotesCard({
  appt,
  highlighted,
}: {
  appt: Appointment;
  highlighted?: boolean;
}) {
  const hasNotes = !!(appt.notes?.trim() || appt.clinicalNotes?.trim());
  const accent = statusAccent[appt.status] ?? 'primary.main';

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderColor: highlighted ? 'primary.main' : 'divider',
        bgcolor: highlighted
          ? (theme) => alpha(theme.palette.primary.main, 0.05)
          : 'background.paper',
        borderLeft: '4px solid',
        borderLeftColor: accent,
      }}
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
                appt.status === 'COMPLETED'
                  ? 'success'
                  : appt.status === 'CANCELLED' || appt.status === 'NO_SHOW'
                    ? 'error'
                    : 'default'
              }
              variant={appt.status === 'COMPLETED' ? 'filled' : 'outlined'}
            />
          </Stack>
        </Stack>

        {hasNotes ? (
          <Stack spacing={1.25} sx={{ pt: 0.5 }}>
            {appt.notes?.trim() && <NoteBlock label="Observações administrativas" text={appt.notes.trim()} />}
            {appt.clinicalNotes?.trim() && (
              <NoteBlock label="Anotações clínicas" text={appt.clinicalNotes.trim()} />
            )}
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Sem anotações neste atendimento.
          </Typography>
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
      sx={{
        p: 1.75,
        borderColor: 'divider',
        borderLeft: '4px solid',
        borderLeftColor: accent,
      }}
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
            color={
              appt.status === 'COMPLETED'
                ? 'success'
                : appt.status === 'CANCELLED' || appt.status === 'NO_SHOW'
                  ? 'error'
                  : 'default'
            }
            variant={appt.status === 'COMPLETED' ? 'filled' : 'outlined'}
          />
        </Stack>
      </Stack>
    </Paper>
  );
}

function PackageCard({
  name,
  status,
  sessionsUsed,
  sessionsTotal,
  totalPaid,
  expiresAt,
  notes,
}: {
  name: string;
  status: string;
  sessionsUsed: number;
  sessionsTotal: number;
  totalPaid: number;
  expiresAt?: string | null;
  notes?: string;
}) {
  const progress = sessionsTotal > 0 ? Math.min(100, (sessionsUsed / sessionsTotal) * 100) : 0;

  return (
    <Paper variant="outlined" sx={{ p: 2, borderColor: 'divider' }}>
      <Stack spacing={1.5}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={700} noWrap>
              {name}
            </Typography>
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
            <Typography variant="caption" color="text.secondary">
              Sessões utilizadas
            </Typography>
            <Typography variant="caption" fontWeight={600}>
              {sessionsUsed}/{sessionsTotal}
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{ height: 6, borderRadius: 3 }}
          />
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

export function PatientDetailDrawer({
  patientId,
  onClose,
  defaultTab = 'general',
  highlightAppointmentId,
}: PatientDetailDrawerProps) {
  const [tab, setTab] = useState<ChartTab>(defaultTab);

  const { data, isLoading } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => patientsApi.findOne(patientId!),
    enabled: !!patientId,
  });

  const { data: reliability } = useQuery({
    queryKey: ['patient-reliability', patientId],
    queryFn: () => patientsApi.getReliability(patientId!),
    enabled: !!patientId,
  });

  const { data: patientPackages = [] } = useQuery({
    queryKey: ['patient-packages', patientId],
    queryFn: () => packagesApi.listPatientPackages(patientId!),
    enabled: !!patientId,
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
      (a) =>
        dayjs(a.startAt).isAfter(now) &&
        a.status !== 'CANCELLED' &&
        a.status !== 'NO_SHOW',
    ).length;
  }, [data?.appointments]);

  const ageLabel = data ? patientAgeLabel(data.birthDate) : null;
  const addressLine = data ? formatPatientAddressDisplay(data) : '';

  useEffect(() => {
    if (patientId) setTab(defaultTab);
  }, [patientId, defaultTab]);

  const handleClose = () => {
    setTab(defaultTab);
    onClose();
  };

  return (
    <Drawer
      anchor="right"
      open={!!patientId}
      onClose={handleClose}
      sx={{ zIndex: (theme) => theme.zIndex.modal + 1 }}
      ModalProps={{
        sx: { zIndex: (theme) => theme.zIndex.modal + 1 },
      }}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 840 },
          display: 'flex',
          flexDirection: 'column',
          bgcolor: 'background.default',
        },
      }}
    >
      <Box
        sx={{
          flexShrink: 0,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Stack direction="row" justifyContent="flex-end" sx={{ px: 2, pt: 1.5 }}>
          <IconButton onClick={handleClose} aria-label="Fechar ficha" size="small">
            <CloseIcon />
          </IconButton>
        </Stack>

        {isLoading && !data && (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress size={28} />
          </Box>
        )}

        {data && (
          <Box sx={{ px: { xs: 2, sm: 3 }, pb: 2 }}>
            <Stack direction="row" spacing={2} alignItems="flex-start">
              <Avatar
                src={data.photoUrl ?? undefined}
                alt={data.name}
                sx={{
                  width: 64,
                  height: 64,
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.14),
                  color: 'primary.dark',
                }}
              >
                {patientInitials(data.name)}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="h5" fontWeight={700} letterSpacing="-0.02em" noWrap>
                  {data.name}
                </Typography>
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mt: 0.75 }}>
                  {ageLabel && (
                    <Chip size="small" icon={<CakeOutlinedIcon />} label={ageLabel} variant="outlined" />
                  )}
                  {data.sex && (
                    <Chip size="small" icon={<WcOutlinedIcon />} label={patientSexLabel(data.sex)} variant="outlined" />
                  )}
                  {reliability != null && (
                    <Chip
                      size="small"
                      label={`Confiabilidade ${reliability.reliabilityPercent}%`}
                      color={
                        reliability.reliabilityPercent >= 80
                          ? 'success'
                          : reliability.reliabilityPercent >= 50
                            ? 'warning'
                            : 'error'
                      }
                      variant="outlined"
                    />
                  )}
                </Stack>
                <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ mt: 1.25 }}>
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

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
              <Paper
                variant="outlined"
                sx={{ px: 1.5, py: 1, minWidth: 100, flex: 1, borderColor: 'divider' }}
              >
                <Typography variant="h6" fontWeight={700}>
                  {data.appointments?.length ?? 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Agendamentos
                </Typography>
              </Paper>
              <Paper
                variant="outlined"
                sx={{ px: 1.5, py: 1, minWidth: 100, flex: 1, borderColor: 'divider' }}
              >
                <Typography variant="h6" fontWeight={700}>
                  {upcomingAppointmentsCount}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Próximos
                </Typography>
              </Paper>
              <Paper
                variant="outlined"
                sx={{ px: 1.5, py: 1, minWidth: 100, flex: 1, borderColor: 'divider' }}
              >
                <Typography variant="h6" fontWeight={700}>
                  {activePackagesCount}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Pacotes ativos
                </Typography>
              </Paper>
            </Stack>
          </Box>
        )}

        <Tabs
          value={tab}
          onChange={(_, value: ChartTab) => setTab(value)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            px: { xs: 1, sm: 2 },
            minHeight: 48,
            bgcolor: 'background.paper',
            '& .MuiTab-root': {
              minHeight: 48,
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '0.875rem',
            },
          }}
        >
          <Tab value="general" label="Visão geral" icon={<PersonOutlineIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab value="notes" label="Anotações" icon={<DescriptionOutlinedIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab value="appointments" label="Agendamentos" icon={<EventNoteOutlinedIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
          <Tab value="packages" label="Pacotes" icon={<ViewInArIcon sx={{ fontSize: 18 }} />} iconPosition="start" />
        </Tabs>
      </Box>

      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: { xs: 2, sm: 3 },
          py: 2.5,
          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.02),
        }}
      >
        {isLoading && (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress />
          </Box>
        )}

        {data && tab === 'general' && (
          <Stack spacing={2}>
            <SectionCard title="Contato" icon={<PhoneOutlinedIcon sx={{ fontSize: 18 }} />}>
              <Stack divider={<Box sx={{ borderBottom: 1, borderColor: 'divider' }} />}>
                <InfoRow label="Telefone" value={data.phone ? maskPhone(data.phone) || data.phone : null} />
                <InfoRow label="E-mail" value={data.email} />
              </Stack>
              {!data.phone && !data.email && (
                <Typography variant="body2" color="text.secondary">
                  Nenhum contato cadastrado.
                </Typography>
              )}
            </SectionCard>

            <SectionCard title="Dados pessoais" icon={<BadgeOutlinedIcon sx={{ fontSize: 18 }} />}>
              <Stack divider={<Box sx={{ borderBottom: 1, borderColor: 'divider' }} />}>
                <InfoRow
                  label="Nascimento"
                  value={
                    data.birthDate
                      ? `${formatDateOnlyFromApi(data.birthDate)}${ageLabel ? ` (${ageLabel})` : ''}`
                      : null
                  }
                />
                <InfoRow label="Sexo" value={data.sex ? patientSexLabel(data.sex) : null} />
                <InfoRow
                  label="Como conheceu"
                  value={
                    data.referralSource
                      ? patientReferralSourceLabel(data.referralSource, data.referralSourceOther)
                      : null
                  }
                />
                <InfoRow label="CPF" value={data.document} />
                <InfoRow
                  label="Cadastro"
                  value={data.createdAt ? dayjs(data.createdAt).format('DD/MM/YYYY') : null}
                />
              </Stack>
            </SectionCard>

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
        )}

        {data && tab === 'notes' && (
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
                  <AppointmentNotesCard
                    key={appt.id}
                    appt={appt}
                    highlighted={highlightAppointmentId === appt.id}
                  />
                ))}
              </Stack>
            ) : (
              !data.notes?.trim() && <EmptyBlock message="Nenhuma anotação registrada para esta paciente." />
            )}
          </Stack>
        )}

        {data && tab === 'appointments' && (
          <Stack spacing={1.5}>
            {data.appointments && data.appointments.length > 0 ? (
              data.appointments.map((appt) => <AppointmentRowCard key={appt.id} appt={appt} />)
            ) : (
              <EmptyBlock message="Nenhum agendamento registrado." />
            )}
          </Stack>
        )}

        {data && tab === 'packages' && (
          <Stack spacing={1.5}>
            {patientPackages.length > 0 ? (
              patientPackages.map((pp) => (
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
        )}
      </Box>
    </Drawer>
  );
}

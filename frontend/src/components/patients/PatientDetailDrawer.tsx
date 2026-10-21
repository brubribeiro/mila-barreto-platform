import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Drawer,
  IconButton,
  Paper,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
  alpha,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import CakeOutlinedIcon from '@mui/icons-material/CakeOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import WcOutlinedIcon from '@mui/icons-material/WcOutlined';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import AddIcon from '@mui/icons-material/Add';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useState, useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

import { patientsApi } from '../../api/patients';
import { AnamnesisView, hasAnamnesisData } from './AnamnesisView';
import { PatientPhotosGallery } from './PatientPhotosGallery';
import { usePermissions } from '../../contexts/usePermissions';
import { PatientSkinRoutinesCard } from '../skincare/PatientSkinRoutinesCard';
import { useAppointmentDialog } from '../../contexts/AppointmentDialogContext';
import { dayjsFromDateOnlyApi, formatDateOnlyFromApi } from '../../utils/dateOnly';
import { formatPatientAddressDisplay } from '../../utils/patientAddress';
import { patientSexLabel } from '../../utils/patientSex';
import { patientReferralSourceLabel } from '../../utils/patientReferralSource';
import { maskPhone, onlyDigits } from '../../utils/masks';
import type { Appointment, AppointmentKind } from '../../types';
import { patientInitials } from '../../utils/patientPhoto';
import { fontSizes } from '../../theme/fontSizes';
import { brl } from '../../utils/money';


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

type ChartTab = 'notes' | 'general' | 'appointments' | 'packages' | 'anamnesis' | 'fotos';

function scoreTone(v: number) {
  if (v >= 90) return { main: '#15998B', label: 'Excelente' };
  if (v >= 75) return { main: '#C98A12', label: 'Bom' };
  return { main: '#D65A5A', label: 'Atenção' };
}

interface PatientDetailDrawerProps {
  patientId: string | null;
  onClose: () => void;
  defaultTab?: ChartTab;
  highlightAppointmentId?: string | null;
  onEditAnamnesis?: (patientId: string) => void;
}

function patientAgeLabel(birthDate?: string | null) {
  const birth = dayjsFromDateOnlyApi(birthDate);
  if (!birth) return null;
  const age = dayjs().diff(birth, 'year');
  return age >= 0 ? `${age} anos` : null;
}

function InfoLine({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  if (value == null || value === '' || value === '—') return null;
  return (
    <Stack direction="row" spacing={1.25} alignItems="flex-start">
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: '9px',
          bgcolor: 'grey.100',
          color: 'text.secondary',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0, lineHeight: 1.3 }}>
        <Typography sx={{ fontSize: fontSizes['2xs'], color: 'text.secondary', fontWeight: 600 }}>
          {label}
        </Typography>
        <Typography sx={{ fontSize: fontSizes.sm, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
          {value}
        </Typography>
      </Box>
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

function AppointmentRowCard({ appt }: { appt: Appointment }) {
  const accent = statusAccent[appt.status] ?? 'primary.main';
  const obs = appt.clinicalNotes?.trim() || appt.notes?.trim();

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
            {appt.procedure?.price != null && (
              <Typography sx={{ fontSize: fontSizes.md, fontWeight: 800, flexShrink: 0 }}>
                {brl.format(Number(appt.procedure.price))}
              </Typography>
            )}
          </Stack>
          {obs && (
            <Box
              sx={{
                mt: 1.25,
                pt: 1.25,
                borderTop: 1,
                borderColor: 'divider',
                fontSize: fontSizes.xs,
                color: 'text.secondary',
                lineHeight: 1.5,
              }}
            >
              <Box component="b" sx={{ color: 'text.disabled', fontSize: fontSizes['2xs'], letterSpacing: '0.3px' }}>
                OBSERVAÇÃO:{' '}
              </Box>
              {obs}
            </Box>
          )}
        </Box>
      </Stack>
    </Paper>
  );
}

export function PatientDetailDrawer({
  patientId,
  onClose,
  defaultTab = 'general',
  onEditAnamnesis,
}: PatientDetailDrawerProps) {
  const [tab, setTab] = useState<ChartTab>(defaultTab);
  const navigate = useNavigate();
  const { has } = usePermissions();
  const canEdit = has('patients:edit');
  const { openAppointmentDialog } = useAppointmentDialog();

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
          bgcolor: 'background.paper',
        },
      }}
    >
      <Box
        sx={{
          flexShrink: 0,
          borderBottom: 1,
          borderColor: 'divider',
          position: 'relative',
          px: 3,
          pt: 3,
          pb: 2.5,
          background: (theme) =>
            `linear-gradient(150deg, ${alpha(theme.palette.primary.main, 0.12)}, transparent 70%)`,
        }}
      >
        <IconButton
          onClick={handleClose}
          aria-label="Fechar ficha"
          size="small"
          sx={{ position: 'absolute', top: 18, right: 18, width: 36, height: 36, borderRadius: '10px', border: 1, borderColor: 'divider', bgcolor: 'background.paper', color: 'text.secondary' }}
        >
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>

        {isLoading && !data && (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress size={28} />
          </Box>
        )}

        {data && (
          <>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ pr: 6 }}>
              <Avatar
                src={data.photoUrl ?? undefined}
                alt={data.name}
                variant="rounded"
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: '18px',
                  fontSize: fontSizes['4xl'],
                  fontWeight: 800,
                  bgcolor: 'primary.main',
                  color: '#fff',
                  boxShadow: '0 8px 20px -6px rgba(16,40,37,.35)',
                  flexShrink: 0,
                }}
              >
                {patientInitials(data.name)}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  sx={{
                    fontSize: fontSizes['2xs'],
                    fontWeight: 700,
                    color: 'primary.main',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  Ficha do paciente
                </Typography>
                <Typography sx={{ fontSize: fontSizes['3xl'], fontWeight: 800, letterSpacing: '-0.02em' }} noWrap>
                  {data.name}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }} flexWrap="wrap" useFlexGap>
                  {data.phone && (
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {maskPhone(data.phone) || data.phone}
                    </Typography>
                  )}
                  {reliability != null &&
                    (() => {
                      const tone = scoreTone(reliability.reliabilityPercent);
                      return (
                        <Box
                          component="span"
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.5,
                            px: 1,
                            py: 0.35,
                            borderRadius: '9px',
                            fontSize: fontSizes.xs,
                            fontWeight: 800,
                            color: tone.main,
                            bgcolor: alpha(tone.main, 0.14),
                          }}
                        >
                          <StarRoundedIcon sx={{ fontSize: 13 }} />
                          {reliability.reliabilityPercent}
                        </Box>
                      );
                    })()}
                </Stack>
              </Box>
            </Stack>

            {/* Abas em pílulas segmentadas */}
            <Box
              sx={{
                display: 'flex',
                gap: 0.75,
                mt: 2.25,
                p: 0.5,
                borderRadius: '12px',
                bgcolor: 'grey.100',
              }}
            >
              {(
                [
                  { id: 'general', label: 'Resumo' },
                  { id: 'anamnesis', label: 'Anamnese' },
                  { id: 'appointments', label: 'Atendimentos' },
                  { id: 'fotos', label: 'Fotos' },
                ] as { id: ChartTab; label: string }[]
              ).map((t) => {
                const active = tab === t.id;
                return (
                  <Box
                    key={t.id}
                    component="button"
                    type="button"
                    onClick={() => setTab(t.id)}
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      height: 38,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: 0,
                      cursor: 'pointer',
                      px: 1,
                      borderRadius: '9px',
                      fontFamily: 'inherit',
                      fontSize: fontSizes.xs,
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      color: active ? 'primary.main' : 'text.secondary',
                      bgcolor: active ? 'background.paper' : 'transparent',
                      boxShadow: active ? '0 1px 3px rgba(16,40,37,0.12)' : 'none',
                      transition: 'all 0.12s',
                    }}
                  >
                    {t.label}
                  </Box>
                );
              })}
            </Box>
          </>
        )}
      </Box>

      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: { xs: 2, sm: 3 },
          py: 2.5,
          bgcolor: 'background.paper',
        }}
      >
        {isLoading && (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress />
          </Box>
        )}

        {data && tab === 'general' && (
          <Stack spacing={2}>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5 }}>
              {[
                { value: String(data.visits ?? 0), label: 'visitas', tone: 'text.primary' },
                { value: brl.format(data.totalSpent ?? 0), label: 'total gasto', tone: 'primary.main' },
                {
                  value: data.lastVisit ? dayjs(data.lastVisit).format('DD MMM YYYY') : '—',
                  label: 'última visita',
                  tone: 'text.primary',
                },
              ].map((stat) => (
                <Box
                  key={stat.label}
                  sx={{
                    textAlign: 'center',
                    p: 1.75,
                    borderRadius: '14px',
                    border: 1,
                    borderColor: 'divider',
                    bgcolor: 'grey.50',
                  }}
                >
                  <Typography sx={{ fontSize: stat.label === 'última visita' ? '0.9rem' : '1.25rem', fontWeight: 800, color: stat.tone }}>
                    {stat.value}
                  </Typography>
                  <Typography sx={{ fontSize: fontSizes['2xs'], color: 'text.secondary', fontWeight: 600, mt: 0.25 }}>
                    {stat.label}
                  </Typography>
                </Box>
              ))}
            </Box>

            <Stack spacing={1.5}>
              <InfoLine
                icon={<BadgeOutlinedIcon sx={{ fontSize: 17 }} />}
                label="CPF"
                value={data.document || null}
              />
              <InfoLine
                icon={<PhoneOutlinedIcon sx={{ fontSize: 17 }} />}
                label="Telefone"
                value={data.phone ? maskPhone(data.phone) || data.phone : null}
              />
              <InfoLine
                icon={<EmailOutlinedIcon sx={{ fontSize: 17 }} />}
                label="E-mail"
                value={data.email || null}
              />
              <InfoLine
                icon={<CakeOutlinedIcon sx={{ fontSize: 17 }} />}
                label="Nascimento"
                value={
                  data.birthDate
                    ? `${formatDateOnlyFromApi(data.birthDate)}${ageLabel ? ` (${ageLabel})` : ''}`
                    : null
                }
              />
              <InfoLine
                icon={<WcOutlinedIcon sx={{ fontSize: 17 }} />}
                label="Sexo"
                value={data.sex ? patientSexLabel(data.sex) : null}
              />
              <InfoLine
                icon={<PersonOutlineIcon sx={{ fontSize: 17 }} />}
                label="Como conheceu"
                value={
                  data.referralSource
                    ? patientReferralSourceLabel(data.referralSource, data.referralSourceOther)
                    : null
                }
              />
              <InfoLine
                icon={<LocationOnOutlinedIcon sx={{ fontSize: 17 }} />}
                label="Endereço"
                value={addressLine || null}
              />
            </Stack>

            {data.notes?.trim() && (
              <Box
                sx={{
                  p: 1.75,
                  borderRadius: '14px',
                  border: 1,
                  borderColor: 'divider',
                  bgcolor: 'grey.50',
                }}
              >
                <Typography
                  sx={{ fontSize: fontSizes['2xs'], color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px', mb: 0.75 }}
                >
                  Observações
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {data.notes.trim()}
                </Typography>
              </Box>
            )}
          </Stack>
        )}

        {data && tab === 'anamnesis' && (
          <Stack spacing={2}>
            {has('routines:view') && (
              <PatientSkinRoutinesCard patient={{ id: data.id, name: data.name, phone: data.phone, email: data.email }} />
            )}
            {onEditAnamnesis && (
              <Stack direction="row" justifyContent="flex-end">
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<EditOutlinedIcon />}
                  onClick={() => onEditAnamnesis(data.id)}
                >
                  {hasAnamnesisData(data.anamnesis) ? 'Editar anamnese' : 'Preencher anamnese'}
                </Button>
              </Stack>
            )}
            <AnamnesisView anamnesis={data.anamnesis} />
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

        {data && tab === 'fotos' && (
          <PatientPhotosGallery
            patientId={data.id}
            canEdit={canEdit}
            readOnly
            showTitle={false}
            onAddClick={() => {
              handleClose();
              navigate(`/pacientes/${data.id}?tab=fotos`);
            }}
          />
        )}

      </Box>

      {data && (
        <Stack
          direction="row"
          spacing={1.25}
          sx={{
            flexShrink: 0,
            px: 3,
            py: 2,
            borderTop: 1,
            borderColor: 'divider',
            bgcolor: 'grey.50',
          }}
        >
          <Button
            variant="outlined"
            startIcon={<OpenInFullIcon sx={{ fontSize: 17 }} />}
            onClick={() => {
              handleClose();
              navigate(`/pacientes/${patientId}`);
            }}
            sx={{
              flex: 1,
              height: 38,
              borderRadius: '12px',
              bgcolor: (t) => alpha(t.palette.primary.main, 0.1),
              borderColor: 'primary.main',
              color: 'primary.main',
              fontWeight: 700,
              '&:hover': { bgcolor: (t) => alpha(t.palette.primary.main, 0.16), borderColor: 'primary.main' },
            }}
          >
            Ficha completa
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon sx={{ fontSize: 18 }} />}
            onClick={() => {
              handleClose();
              openAppointmentDialog({ patientId: patientId ?? undefined });
            }}
            sx={{ height: 38, px: 2.25, borderRadius: '12px', fontWeight: 700, boxShadow: (t) => `0 6px 16px -6px ${t.palette.primary.main}` }}
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
                  borderRadius: '12px',
                  border: 1,
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  color: '#1DAE53',
                }}
              >
                <WhatsAppIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      )}
    </Drawer>
  );
}

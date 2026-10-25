import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import CakeOutlinedIcon from '@mui/icons-material/CakeOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import PhoneOutlinedIcon from '@mui/icons-material/PhoneOutlined';
import WcOutlinedIcon from '@mui/icons-material/WcOutlined';
import dayjs from 'dayjs';

import type { PatientWithHistory } from '../../api/patients';
import { fontSizes } from '../../theme/fontSizes';
import { formatDateOnlyFromApi } from '../../utils/dateOnly';
import { maskPhone } from '../../utils/masks';
import { brl } from '../../utils/money';
import { formatPatientAddressDisplay } from '../../utils/patientAddress';
import { patientReferralSourceLabel } from '../../utils/patientReferralSource';
import { patientSexLabel } from '../../utils/patientSex';
import { patientAgeLabel } from './patientChart';

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

/** Aba "Resumo" da gaveta: números, dados de contato e observações do cadastro. */
export function PatientDrawerSummaryTab({ patient: data }: { patient: PatientWithHistory }) {
  const ageLabel = patientAgeLabel(data.birthDate);
  const addressLine = formatPatientAddressDisplay(data);

  return (
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
  );
}

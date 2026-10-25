import type { ReactNode } from 'react';
import { Avatar, Box, Button, Paper, Stack, Typography, alpha } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import dayjs from 'dayjs';

import type { PatientReliability, PatientWithHistory } from '../../api/patients';
import { fontSizes } from '../../theme/fontSizes';
import { formatDateOnlyFromApi } from '../../utils/dateOnly';
import { maskPhone } from '../../utils/masks';
import { brl } from '../../utils/money';
import { formatPatientAddressDisplay } from '../../utils/patientAddress';
import { patientInitials } from '../../utils/patientPhoto';
import { patientSexLabel } from '../../utils/patientSex';
import { PatientWhatsAppButton } from './PatientWhatsAppButton';
import { ReliabilityBadge } from './ReliabilityBadge';
import { patientAgeLabel, scoreTone } from './patientChart';

function SidebarField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Box>
      <Typography sx={{ fontSize: fontSizes['2xs'], fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
        {label}
      </Typography>
      {children}
    </Box>
  );
}

/** Coluna de resumo da ficha completa: foto, score, números, dados pessoais e ações. */
export function PatientSummarySidebar({
  patient: data,
  reliability,
  onSchedule,
}: {
  patient: PatientWithHistory;
  reliability?: PatientReliability;
  onSchedule: () => void;
}) {
  const ageLabel = patientAgeLabel(data.birthDate);
  const addressLine = formatPatientAddressDisplay(data);

  return (
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
        {reliability != null && (
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ mt: 1.5 }}>
            <ReliabilityBadge value={reliability.reliabilityPercent} variant="page" />
            <Typography sx={{ fontSize: fontSizes.xs, fontWeight: 700, color: scoreTone(reliability.reliabilityPercent).main }}>
              {scoreTone(reliability.reliabilityPercent).label}
            </Typography>
          </Stack>
        )}
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
          <SidebarField label="CPF">
            <Typography sx={{ fontSize: fontSizes.md, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              {data.document}
            </Typography>
          </SidebarField>
        )}
        {data.birthDate && (
          <SidebarField label="Nascimento">
            <Typography sx={{ fontSize: fontSizes.md, fontWeight: 600 }}>
              {formatDateOnlyFromApi(data.birthDate)}
              {ageLabel ? ` · ${ageLabel}` : ''}
            </Typography>
          </SidebarField>
        )}
        {data.sex && (
          <SidebarField label="Sexo">
            <Typography sx={{ fontSize: fontSizes.md, fontWeight: 600 }}>{patientSexLabel(data.sex)}</Typography>
          </SidebarField>
        )}
        {addressLine && (
          <SidebarField label="Endereço">
            <Typography sx={{ fontSize: fontSizes.sm, fontWeight: 500, lineHeight: 1.4 }}>{addressLine}</Typography>
          </SidebarField>
        )}
        {data.email && (
          <SidebarField label="E-mail">
            <Typography sx={{ fontSize: fontSizes.sm, fontWeight: 500 }} noWrap>
              {data.email}
            </Typography>
          </SidebarField>
        )}

        <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
          <Button
            fullWidth
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onSchedule}
            sx={{ borderRadius: '11px', boxShadow: (t) => `0 6px 16px -6px ${t.palette.primary.main}` }}
          >
            Agendar
          </Button>
          {data.phone && <PatientWhatsAppButton phone={data.phone} sx={{ flexShrink: 0, borderRadius: '11px' }} />}
        </Stack>
      </Stack>
    </Paper>
  );
}

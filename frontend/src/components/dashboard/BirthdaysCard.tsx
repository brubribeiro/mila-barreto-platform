import { Avatar, Box, Card, CardContent, IconButton, Skeleton, Stack, Tooltip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import dayjs from 'dayjs';

import type { Patient } from '../../types';
import { dayjsFromDateOnlyApi } from '../../utils/dateOnly';
import { fontSizes } from '../../theme/fontSizes';
import { AuroraIcon } from '../AuroraIcon';
import { DashboardEmptyState } from './DashboardEmptyState';

const UPCOMING_BIRTHDAY_WINDOW_DAYS = 30;

const BIRTHDAY_ACCENT = '#C2185B';

const BDAY_COLORS = ['#15998B', '#C98A12', '#C25A4C', '#5A9A7D', '#7E57C2', '#3A6B64'];

function getNextBirthdayDate(birthDateStr: string): dayjs.Dayjs | null {
  const birth = dayjsFromDateOnlyApi(birthDateStr);
  if (!birth) return null;
  const today = dayjs().startOf('day');
  let next = today
    .clone()
    .month(birth.month())
    .date(birth.date())
    .startOf('day');
  if (!next.isValid()) return null;
  if (next.isBefore(today)) next = next.add(1, 'year');
  return next;
}

function turnsAgeOnDate(birth: dayjs.Dayjs, celebration: dayjs.Dayjs): number {
  return celebration.year() - birth.year();
}

function countdownBirthdayLabel(daysUntil: number): string {
  if (daysUntil === 0) return 'hoje';
  if (daysUntil === 1) return 'amanhã';
  return `em ${daysUntil} dias`;
}

export interface UpcomingBirthday {
  patient: Patient;
  when: dayjs.Dayjs;
  turnsAge: number;
  daysUntil: number;
}

/** Pacientes que fazem aniversário nos próximos {@link UPCOMING_BIRTHDAY_WINDOW_DAYS} dias, do mais próximo ao mais distante. */
export function upcomingBirthdaysOf(patients: Patient[]): UpcomingBirthday[] {
  const today = dayjs().startOf('day');
  const end = today.add(UPCOMING_BIRTHDAY_WINDOW_DAYS, 'day');
  const rows: UpcomingBirthday[] = [];

  for (const p of patients) {
    if (!p.birthDate) continue;
    const birth = dayjsFromDateOnlyApi(p.birthDate);
    if (!birth) continue;
    const next = getNextBirthdayDate(p.birthDate);
    if (!next || next.isAfter(end)) continue;
    const daysUntil = next.diff(today, 'day');
    if (daysUntil < 0) continue;
    rows.push({
      patient: p,
      when: next,
      turnsAge: turnsAgeOnDate(birth, next),
      daysUntil,
    });
  }

  return rows.sort((a, b) => a.when.valueOf() - b.when.valueOf());
}

interface BirthdaysCardProps {
  birthdays: UpcomingBirthday[];
  loading: boolean;
  onWhatsApp: (patient: Patient) => void;
}

/** Card "Aniversariantes" com atalho para mensagem de WhatsApp. */
export function BirthdaysCard({ birthdays, loading, onWhatsApp }: BirthdaysCardProps) {
  return (
    <Card>
      <CardContent sx={{ p: { xs: 2, sm: 2.75 } }}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.75 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              bgcolor: alpha(BIRTHDAY_ACCENT, 0.14),
              color: BIRTHDAY_ACCENT,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <AuroraIcon name="gift" size={19} strokeWidth={1.7} />
          </Box>
          <Box sx={{ lineHeight: 1.2 }}>
            <Typography sx={{ fontSize: fontSizes.lg, fontWeight: 700 }}>Aniversariantes</Typography>
            <Typography sx={{ fontSize: fontSizes.xs, color: 'text.secondary', fontWeight: 500 }}>
              próximos {UPCOMING_BIRTHDAY_WINDOW_DAYS} dias
            </Typography>
          </Box>
        </Stack>
        {loading ? (
          <Stack spacing={1}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} variant="rounded" height={44} />
            ))}
          </Stack>
        ) : birthdays.length === 0 ? (
          <DashboardEmptyState message="Nenhum aniversário neste período." />
        ) : (
          <Stack spacing={0.25} sx={{ maxHeight: 260, overflowY: 'auto', pr: 0.5, mr: -0.5 }}>
            {birthdays.map(({ patient, when, turnsAge, daysUntil }, idx) => {
              const initials = patient.name
                .trim()
                .split(/\s+/)
                .map((w) => w[0] ?? '')
                .slice(0, 2)
                .join('')
                .toUpperCase();
              const bdColor = BDAY_COLORS[idx % BDAY_COLORS.length];
              return (
                <Stack key={patient.id} direction="row" alignItems="center" spacing={1.5} sx={{ px: 0.5, py: 1 }}>
                  <Avatar
                    variant="rounded"
                    sx={{
                      width: 34,
                      height: 34,
                      borderRadius: '10px',
                      bgcolor: bdColor,
                      color: '#fff',
                      fontSize: fontSizes.xs,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {initials}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography noWrap sx={{ fontSize: fontSizes.sm, fontWeight: 700 }}>
                      {patient.name}
                    </Typography>
                    <Typography noWrap sx={{ fontSize: fontSizes.xs, color: 'text.secondary' }}>
                      {turnsAge} anos · {when.format('DD/MM')}
                    </Typography>
                  </Box>
                  <Box
                    component="span"
                    sx={{
                      flexShrink: 0,
                      fontSize: fontSizes['2xs'],
                      fontWeight: 700,
                      px: 1.1,
                      py: '3px',
                      borderRadius: '7px',
                      whiteSpace: 'nowrap',
                      ...(daysUntil <= 3
                        ? { bgcolor: 'rgba(21,153,139,.14)', color: '#11A893' }
                        : { bgcolor: 'grey.100', color: 'text.secondary' }),
                    }}
                  >
                    {countdownBirthdayLabel(daysUntil)}
                  </Box>
                  <Tooltip title={patient.phone?.trim() ? 'Enviar mensagem no WhatsApp' : 'Sem telefone cadastrado'}>
                    <span style={{ flexShrink: 0 }}>
                      <IconButton
                        size="small"
                        disabled={!patient.phone?.trim()}
                        onClick={() => onWhatsApp(patient)}
                        aria-label={`Enviar WhatsApp para ${patient.name}`}
                        sx={{ color: '#1DAE53', flexShrink: 0 }}
                      >
                        <WhatsAppIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Stack>
              );
            })}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

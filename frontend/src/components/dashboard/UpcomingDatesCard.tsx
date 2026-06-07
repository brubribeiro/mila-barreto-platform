import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Avatar,
  Box,
  Card,
  CardContent,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import CelebrationIcon from '@mui/icons-material/Celebration';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import dayjs from 'dayjs';
import { usePermissions } from '../../contexts/usePermissions';
import { DashboardDetailItem } from './DashboardDetailItem';
import { DashboardEmptyState } from './DashboardEmptyState';

interface CommemorativeDate {
  name: string;
  tip: string;
  color: string;
  emoji: string;
  next: (today: dayjs.Dayjs) => dayjs.Dayjs;
}

function mothersDayOf(year: number): dayjs.Dayjs {
  const may1 = dayjs(`${year}-05-01`);
  const firstSunday = may1.day() === 0 ? may1 : may1.add(7 - may1.day(), 'day');
  return firstSunday.add(7, 'day');
}

function fathersDayOf(year: number): dayjs.Dayjs {
  const aug1 = dayjs(`${year}-08-01`);
  const firstSunday = aug1.day() === 0 ? aug1 : aug1.add(7 - aug1.day(), 'day');
  return firstSunday.add(7, 'day');
}

function blackFridayOf(year: number): dayjs.Dayjs {
  const nov30 = dayjs(`${year}-11-30`);
  const dow = nov30.day();
  const diff = dow >= 5 ? dow - 5 : dow + 2;
  return nov30.subtract(diff, 'day');
}

function nextOccurrenceFixed(month: number, day: number, today: dayjs.Dayjs): dayjs.Dayjs {
  let d = dayjs(`${today.year()}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
  if (d.isBefore(today, 'day')) d = d.add(1, 'year');
  return d;
}

function nextOccurrenceComputed(
  computeFn: (year: number) => dayjs.Dayjs,
  today: dayjs.Dayjs,
): dayjs.Dayjs {
  let d = computeFn(today.year());
  if (d.isBefore(today, 'day')) d = computeFn(today.year() + 1);
  return d;
}

const DATES: CommemorativeDate[] = [
  {
    name: 'Dia Internacional da Mulher',
    tip: 'Promoções de autoestima e cuidados pessoais',
    color: '#E91E63',
    emoji: '💜',
    next: (t) => nextOccurrenceFixed(3, 8, t),
  },
  {
    name: 'Início do Outono',
    tip: 'Tratamentos para preparar a pele para o frio',
    color: '#E65100',
    emoji: '🍂',
    next: (t) => nextOccurrenceFixed(3, 20, t),
  },
  {
    name: 'Dia das Mães',
    tip: 'Pacotes presente e vale-presentes',
    color: '#E91E63',
    emoji: '💐',
    next: (t) => nextOccurrenceComputed(mothersDayOf, t),
  },
  {
    name: 'Dia dos Namorados',
    tip: 'Combos para casais e vale-presentes',
    color: '#D32F2F',
    emoji: '❤️',
    next: (t) => nextOccurrenceFixed(6, 12, t),
  },
  {
    name: 'Início do Inverno',
    tip: 'Época ideal para procedimentos com recuperação',
    color: '#1565C0',
    emoji: '❄️',
    next: (t) => nextOccurrenceFixed(6, 21, t),
  },
  {
    name: 'Dia dos Pais',
    tip: 'Promoções de tratamentos masculinos',
    color: '#1565C0',
    emoji: '👔',
    next: (t) => nextOccurrenceComputed(fathersDayOf, t),
  },
  {
    name: 'Dia Internacional da Beleza',
    tip: 'Semana da beleza com descontos especiais',
    color: '#9C27B0',
    emoji: '✨',
    next: (t) => nextOccurrenceFixed(9, 9, t),
  },
  {
    name: 'Dia do Cliente',
    tip: 'Descontos para clientes fiéis e programas de fidelidade',
    color: '#00897B',
    emoji: '🤝',
    next: (t) => nextOccurrenceFixed(9, 15, t),
  },
  {
    name: 'Início da Primavera',
    tip: 'Renovação da pele — tratamentos de rejuvenescimento',
    color: '#43A047',
    emoji: '🌸',
    next: (t) => nextOccurrenceFixed(9, 22, t),
  },
  {
    name: 'Black Friday',
    tip: 'Maior oportunidade de vendas de pacotes do ano',
    color: '#212121',
    emoji: '🏷️',
    next: (t) => nextOccurrenceComputed(blackFridayOf, t),
  },
  {
    name: 'Início do Verão',
    tip: 'Corpo de verão — tratamentos corporais e bronzeamento',
    color: '#F9A825',
    emoji: '☀️',
    next: (t) => nextOccurrenceFixed(12, 21, t),
  },
  {
    name: 'Natal',
    tip: 'Vale-presentes e combos especiais de fim de ano',
    color: '#C62828',
    emoji: '🎄',
    next: (t) => nextOccurrenceFixed(12, 25, t),
  },
];

const LOOKAHEAD_DAYS = 60;

interface UpcomingDatesCardProps {
  embedded?: boolean;
}

export function UpcomingDatesCard({ embedded = false }: UpcomingDatesCardProps) {
  const navigate = useNavigate();
  const { has } = usePermissions();
  const canCreatePromotion = has('promotions:create');

  const upcoming = useMemo(() => {
    const today = dayjs().startOf('day');
    const limit = today.add(LOOKAHEAD_DAYS, 'day');

    return DATES.map((d) => {
      const when = d.next(today);
      const daysUntil = when.diff(today, 'day');
      return { ...d, when, daysUntil };
    })
      .filter((d) => !d.when.isAfter(limit))
      .sort((a, b) => a.daysUntil - b.daysUntil);
  }, []);

  return (
    <Card
      sx={{
        width: '100%',
        ...(embedded
          ? {
              height: { md: '100%' },
              display: 'flex',
              flexDirection: 'column',
              minHeight: { md: 0 },
            }
          : { mt: 3 }),
      }}
    >
      <CardContent
        sx={{
          flex: embedded ? '1 1 auto' : undefined,
          display: embedded ? 'flex' : undefined,
          flexDirection: embedded ? 'column' : undefined,
          p: 2.5,
          '&:last-child': { pb: 2.5 },
          minHeight: 0,
        }}
      >
        <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ mb: 2, flexShrink: 0, minHeight: 48 }}>
          <Avatar
            variant="rounded"
            sx={{
              bgcolor: alpha('#F59E0B', 0.14),
              width: 48,
              height: 48,
              flexShrink: 0,
            }}
          >
            <CelebrationIcon sx={{ color: '#F59E0B' }} />
          </Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={700}>
              Datas comemorativas
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" noWrap>
              Próximos {LOOKAHEAD_DAYS} dias — prepare suas promoções
            </Typography>
          </Box>
        </Stack>

        <Box
          sx={{
            flex: embedded ? '1 1 auto' : undefined,
            overflow: embedded ? 'auto' : undefined,
            minHeight: embedded ? 0 : undefined,
            pr: embedded ? 0.5 : 0,
          }}
        >
          {upcoming.length === 0 ? (
            <DashboardEmptyState
              message={`Nenhuma data comemorativa nos próximos ${LOOKAHEAD_DAYS} dias.`}
            />
          ) : (
            <Stack spacing={1.5}>
              {upcoming.map((d) => (
                <DashboardDetailItem
                  key={d.name}
                  accentColor={d.color}
                  title={`${d.emoji} ${d.name}`}
                  chip={
                    d.daysUntil <= 7
                      ? {
                          label:
                            d.daysUntil === 0
                              ? 'Hoje!'
                              : d.daysUntil === 1
                                ? 'Amanhã!'
                                : `em ${d.daysUntil} dias`,
                          color: d.daysUntil <= 3 ? 'warning' : 'default',
                          variant: d.daysUntil <= 3 ? 'filled' : 'outlined',
                        }
                      : undefined
                  }
                  subtitle={d.tip}
                  primaryRight={
                    <Typography component="span" variant="subtitle2" fontWeight={700} sx={{ color: d.color }}>
                      {d.when.format('DD/MM')}
                    </Typography>
                  }
                  secondaryRight={d.when.format('dddd')}
                  trailing={
                    canCreatePromotion ? (
                      <Tooltip title="Criar promoção">
                        <IconButton
                          size="small"
                          onClick={() => navigate(`/promocoes?data=${encodeURIComponent(d.name)}`)}
                          sx={{ color: d.color }}
                        >
                          <LocalOfferIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : undefined
                  }
                />
              ))}
            </Stack>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import dayjs from 'dayjs';
import { usePermissions } from '../../contexts/usePermissions';
import { DashboardEmptyState } from './DashboardEmptyState';
import { AuroraIcon } from '../AuroraIcon';
import { fontSizes } from '../../theme/fontSizes';

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
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.75, flexShrink: 0 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              bgcolor: '#EAF6F4',
              color: 'primary.main',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <AuroraIcon name="calendarStar" size={19} strokeWidth={1.7} />
          </Box>
          <Box sx={{ lineHeight: 1.2, minWidth: 0 }}>
            <Typography sx={{ fontSize: fontSizes.lg, fontWeight: 700 }}>Datas comemorativas</Typography>
            <Typography sx={{ fontSize: fontSizes.xs, color: 'text.secondary', fontWeight: 500 }} noWrap>
              próximos {LOOKAHEAD_DAYS} dias · oportunidades
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
            <Stack spacing={0.25}>
              {upcoming.map((d) => (
                <Stack key={d.name} direction="row" alignItems="center" spacing={1.75} sx={{ px: 0.5, py: 1.1 }}>
                  <Box
                    sx={{
                      width: 42,
                      textAlign: 'center',
                      flexShrink: 0,
                      borderRight: '1px solid',
                      borderColor: 'divider',
                      pr: 1.25,
                    }}
                  >
                    <Typography sx={{ fontSize: fontSizes.xl, fontWeight: 800, color: 'primary.main', lineHeight: 1 }}>
                      {d.when.format('DD')}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: fontSizes['3xs'],
                        fontWeight: 700,
                        color: 'text.secondary',
                        letterSpacing: '0.6px',
                        mt: 0.25,
                        textTransform: 'uppercase',
                      }}
                    >
                      {d.when.format('MMM')}
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography noWrap sx={{ fontSize: fontSizes.sm, fontWeight: 700 }}>
                      {d.name}
                    </Typography>
                    <Typography noWrap sx={{ fontSize: fontSizes.xs, color: 'text.secondary' }}>
                      {d.daysUntil === 0
                        ? 'hoje'
                        : d.daysUntil === 1
                          ? 'amanhã'
                          : `em ${d.daysUntil} dias`}
                    </Typography>
                  </Box>
                  {canCreatePromotion && (
                    <Button
                      size="small"
                      onClick={() => navigate(`/promocoes?data=${encodeURIComponent(d.name)}`)}
                      startIcon={<AuroraIcon name="plus" size={12} strokeWidth={2.4} />}
                      sx={{
                        flexShrink: 0,
                        fontSize: fontSizes['2xs'],
                        fontWeight: 700,
                        px: 1.25,
                        py: 0.4,
                        borderRadius: '8px',
                        border: '1px solid',
                        borderColor: '#D8EFEB',
                        bgcolor: '#EAF6F4',
                        color: 'primary.main',
                        '& .MuiButton-startIcon': { mr: 0.5 },
                        '&:hover': { bgcolor: 'primary.main', color: '#fff' },
                      }}
                    >
                      Promoção
                    </Button>
                  )}
                </Stack>
              ))}
            </Stack>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

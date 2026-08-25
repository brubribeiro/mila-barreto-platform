import { useMemo, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  Divider,
  InputBase,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import StarIcon from '@mui/icons-material/Star';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import { useQuery } from '@tanstack/react-query';

import { usersApi } from '../api/users';
import { UserFormDialog } from '../components/users/UserFormDialog';
import { usePermissions } from '../contexts/usePermissions';
import type { ProfessionalAvailability, UserSummary } from '../types';
import { fontSizes } from '../theme/fontSizes';

function initials(name: string) {
  const parts = name
    .trim()
    .replace(/^(dra?\.?|sra?\.?|profa?\.?|esteta\.?|enf\.?)\s+/i, '')
    .split(/\s+/)
    .filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase() || '?';
}

const AVAIL_META: Record<ProfessionalAvailability, { label: string; color: string; bg: string }> = {
  AVAILABLE: { label: 'Disponível', color: '#0E7C7B', bg: 'rgba(21,153,139,0.14)' },
  IN_SERVICE: { label: 'Em atendimento', color: '#2f6fb0', bg: 'rgba(91,168,222,0.18)' },
  OFF: { label: 'Folga', color: '#6b7772', bg: 'rgba(16,40,37,0.06)' },
  OUTSIDE_HOURS: { label: 'Fora do horário', color: '#8E6620', bg: 'rgba(201,146,48,0.16)' },
};

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <Box sx={{ textAlign: 'center', flex: 1 }}>
      <Typography sx={{ fontSize: fontSizes['2xl'], fontWeight: 800, lineHeight: 1 }}>{value}</Typography>
      <Typography sx={{ fontSize: fontSizes['2xs'], color: 'text.secondary', mt: 0.5 }}>{label}</Typography>
    </Box>
  );
}

export function Professionals() {
  const { has } = usePermissions();
  const canCreate = has('users:create');

  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list(),
  });

  const professionals = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users
      .filter((u) => u.providesAppointments)
      .filter((u) => {
        if (!q) return true;
        return (
          u.name.toLowerCase().includes(q) ||
          (u.specialty ?? '').toLowerCase().includes(q) ||
          (u.specialties ?? []).some((s) => s.toLowerCase().includes(q)) ||
          (u.role?.name ?? '').toLowerCase().includes(q)
        );
      });
  }, [users, search]);

  const availableToday = professionals.filter((p) => p.availability === 'AVAILABLE').length;

  return (
    <Box>
      {/* Header: contagem à esquerda, busca + adicionar à direita */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        alignItems={{ xs: 'stretch', md: 'center' }}
        justifyContent="space-between"
        spacing={1.5}
        sx={{ mb: 2.5 }}
      >
        <Typography sx={{ fontSize: fontSizes.md, color: 'text.secondary', fontWeight: 600 }}>
          <Box component="span" sx={{ color: 'text.primary', fontWeight: 800 }}>
            {professionals.length}
          </Box>{' '}
          {professionals.length === 1 ? 'profissional' : 'profissionais'}
          {'  ·  '}
          <Box component="span" sx={{ color: 'text.primary', fontWeight: 800 }}>
            {availableToday}
          </Box>{' '}
          {availableToday === 1 ? 'disponível agora' : 'disponíveis agora'}
        </Typography>

        <Stack
          direction="row"
          alignItems="center"
          spacing={1.25}
          flexWrap={{ xs: 'wrap', md: 'nowrap' }}
          useFlexGap
          justifyContent={{ md: 'flex-end' }}
          sx={{ minWidth: 0 }}
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{
              height: 38,
              px: 1.75,
              borderRadius: '12px',
              border: 1,
              borderColor: 'divider',
              bgcolor: 'grey.50',
              width: { xs: '100%', sm: 260 },
              minWidth: 0,
            }}
          >
            <SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
            <InputBase
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar profissional..."
              sx={{ fontSize: fontSizes.sm, flex: 1 }}
            />
          </Stack>
          {canCreate && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setFormOpen(true)}
              sx={{ flexShrink: 0, whiteSpace: 'nowrap', height: 38, px: 2.25, borderRadius: '12px' }}
            >
              Adicionar profissional
            </Button>
          )}
        </Stack>
      </Stack>

      {isLoading ? (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)', xl: 'repeat(4, 1fr)' },
            gap: 2,
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={210} sx={{ borderRadius: '18px' }} />
          ))}
        </Box>
      ) : professionals.length === 0 ? (
        <Card sx={{ p: 6, textAlign: 'center', borderRadius: '18px' }}>
          <PeopleOutlineIcon sx={{ fontSize: 46, color: 'text.disabled', mb: 1 }} />
          <Typography sx={{ fontWeight: 700 }}>Nenhum profissional</Typography>
          <Typography color="text.secondary" sx={{ fontSize: fontSizes.md, mt: 0.5 }}>
            Adicione um profissional ou marque um usuário como profissional na tela de Usuários.
          </Typography>
        </Card>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)', xl: 'repeat(4, 1fr)' },
            gap: 2,
          }}
        >
          {professionals.map((p) => {
            const color = p.calendarColor || undefined;
            const avail = p.availability ? AVAIL_META[p.availability] : null;
            const tags = p.specialties ?? [];
            return (
              <Card
                key={p.id}
                sx={{
                  p: 2.25,
                  borderRadius: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.5,
                  opacity: p.active ? 1 : 0.7,
                }}
              >
                <Stack direction="row" spacing={1.5} alignItems="flex-start">
                  <Avatar
                    variant="rounded"
                    src={p.photoUrl ?? undefined}
                    sx={{
                      width: 52,
                      height: 52,
                      borderRadius: '14px',
                      fontSize: fontSizes.lg,
                      fontWeight: 800,
                      bgcolor: color || 'primary.main',
                    }}
                  >
                    {initials(p.name)}
                  </Avatar>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: fontSizes.md, fontWeight: 800, lineHeight: 1.2 }} noWrap title={p.name}>
                        {p.name}
                      </Typography>
                      {p.isPrimary && <StarIcon sx={{ fontSize: 15, color: 'warning.main', flexShrink: 0 }} />}
                    </Stack>
                    <Typography sx={{ fontSize: fontSizes.sm, color: 'text.secondary', mt: 0.25 }} noWrap>
                      {p.specialty || p.role?.name || '—'}
                    </Typography>
                    {p.councilRegister && (
                      <Typography sx={{ fontSize: fontSizes.xs, color: 'text.disabled' }} noWrap>
                        {p.councilRegister}
                      </Typography>
                    )}
                  </Box>
                  {avail && (
                    <Chip
                      size="small"
                      label={avail.label}
                      sx={{
                        flexShrink: 0,
                        height: 22,
                        fontSize: fontSizes['2xs'],
                        fontWeight: 700,
                        color: avail.color,
                        bgcolor: avail.bg,
                        border: 'none',
                        '& .MuiChip-label': { px: 1 },
                      }}
                    />
                  )}
                </Stack>

                {tags.length > 0 && (
                  <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                    {tags.map((t) => (
                      <Chip
                        key={t}
                        size="small"
                        label={t}
                        sx={{ height: 22, fontSize: fontSizes['2xs'], fontWeight: 600, bgcolor: 'grey.100' }}
                      />
                    ))}
                  </Stack>
                )}

                <Divider sx={{ mt: 'auto' }} />

                <Stack direction="row" divider={<Divider orientation="vertical" flexItem />} spacing={1}>
                  <Stat value={p.appointmentsCount ?? 0} label="total" />
                  <Stat value={p.appointmentsCountMonth ?? 0} label="último mês" />
                  <Stat value={p.appointmentsCountWeek ?? 0} label="última semana" />
                </Stack>
              </Card>
            );
          })}
        </Box>
      )}

      <UserFormDialog open={formOpen} onClose={() => setFormOpen(false)} user={null} presetProfessional />
    </Box>
  );
}

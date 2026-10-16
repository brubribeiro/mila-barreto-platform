import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  IconButton,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import HistoryIcon from '@mui/icons-material/History';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { goalsApi, type GoalScope } from '../api/goals';
import { AuroraIcon } from '../components/AuroraIcon';
import { AuditHistoryDialog } from '../components/audit/AuditHistoryDialog';
import { GoalFormDialog } from '../components/goals/GoalFormDialog';
import {
  clampProgress,
  formatGoalPeriod,
  formatGoalValue,
  goalStatus,
  goalSummary,
  metricOption,
} from '../components/goals/goalUtils';
import { usePermissions } from '../contexts/usePermissions';
import type { Goal } from '../types';
import { fontSizes } from '../theme/fontSizes';

const CARD_GRID_SX = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fill, minmax(360px, 1fr))' },
  gap: 2.25,
} as const;

const TOOLBAR_SELECT_SX = {
  flexShrink: 0,
  minWidth: 160,
  '& .MuiOutlinedInput-root': {
    height: 38,
    borderRadius: '12px',
    fontSize: fontSizes.sm,
    bgcolor: 'background.paper',
  },
} as const;

const SCOPE_OPTIONS: { value: GoalScope; label: string }[] = [
  { value: 'current', label: 'Em andamento' },
  { value: 'upcoming', label: 'Próximas' },
  { value: 'past', label: 'Encerradas' },
  { value: 'all', label: 'Todas' },
];

export function Goals() {
  const theme = useTheme();
  const { has, isAdmin } = usePermissions();
  const canCreate = has('goals:create');
  const canEdit = has('goals:edit');
  const canDelete = has('goals:delete');
  const [scope, setScope] = useState<GoalScope>('current');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['goals', 'list', scope],
    queryFn: () => goalsApi.list({ scope }),
    placeholderData: keepPreviousData,
  });

  const summary = goalSummary(goals);
  const summaryCards = [
    { label: scope === 'current' ? 'Metas ativas' : 'Metas', value: String(summary.total), color: 'text.primary' },
    { label: 'Atingidas', value: String(summary.reached), color: 'success.main' },
    { label: 'Progresso médio', value: `${summary.average}%`, color: 'primary.main' },
  ];

  const openEdit = (goal: Goal) => {
    setEditing(goal);
    setFormOpen(true);
  };

  return (
    <Stack spacing={2.25}>
      {/* Resumo + filtros + ações */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        alignItems={{ xs: 'stretch', md: 'center' }}
        justifyContent="space-between"
        spacing={1.5}
      >
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: { xs: 1, sm: 1.75 }, flex: 1, minWidth: 0 }}>
          {summaryCards.map((s) => (
            <Card key={s.label} sx={{ px: { xs: 1.5, sm: 2.25 }, py: 2, borderRadius: '14px', border: 1, borderColor: 'divider' }}>
              {isLoading ? (
                <Skeleton width={60} height={30} />
              ) : (
                <Typography sx={{ fontSize: fontSizes['5xl'], fontWeight: 800, letterSpacing: '-0.5px', lineHeight: 1.2, color: s.color }}>
                  {s.value}
                </Typography>
              )}
              <Typography sx={{ fontSize: fontSizes.xs, color: 'text.secondary', fontWeight: 600, mt: 0.25 }}>
                {s.label}
              </Typography>
            </Card>
          ))}
        </Box>

        <Stack direction="row" alignItems="center" spacing={1.25} justifyContent={{ md: 'flex-end' }} sx={{ flexShrink: 0 }}>
          <TextField
            select
            size="small"
            value={scope}
            onChange={(e) => setScope(e.target.value as GoalScope)}
            sx={TOOLBAR_SELECT_SX}
            inputProps={{ 'aria-label': 'Período' }}
          >
            {SCOPE_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </TextField>
          {isAdmin && (
            <Tooltip title="Histórico de alterações">
              <IconButton
                onClick={() => setHistoryOpen(true)}
                sx={{ flexShrink: 0, width: 38, height: 38, borderRadius: '12px', border: 1, borderColor: 'divider', bgcolor: 'background.paper', color: 'text.secondary' }}
              >
                <HistoryIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {canCreate && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
              sx={{ flexShrink: 0, whiteSpace: 'nowrap', height: 38, px: 2.25, borderRadius: '12px', boxShadow: (t) => `0 6px 16px -6px ${t.palette.primary.main}` }}
            >
              Nova meta
            </Button>
          )}
        </Stack>
      </Stack>

      {/* Cards de metas */}
      {isLoading ? (
        <Box sx={CARD_GRID_SX}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" height={176} sx={{ borderRadius: '18px' }} />
          ))}
        </Box>
      ) : goals.length === 0 ? (
        <Card sx={{ p: 6, textAlign: 'center', borderRadius: '18px' }}>
          <Box sx={{ color: 'text.disabled', mb: 1 }}>
            <AuroraIcon name="metas" size={46} strokeWidth={1.4} />
          </Box>
          <Typography sx={{ fontWeight: 700 }}>
            {scope === 'current' ? 'Nenhuma meta em andamento' : 'Nenhuma meta encontrada'}
          </Typography>
          <Typography color="text.secondary" sx={{ fontSize: fontSizes.md, mt: 0.5 }}>
            Defina objetivos de faturamento, pacientes, procedimentos e outros indicadores para acompanhar o progresso.
          </Typography>
        </Card>
      ) : (
        <Box sx={CARD_GRID_SX}>
          {goals.map((g) => {
            const option = metricOption(g.metric);
            const status = goalStatus(g.progress);
            const tone = status.tone(theme, g.color);
            const done = status.key === 'DONE';
            return (
              <Card
                key={g.id}
                onClick={canEdit ? () => openEdit(g) : undefined}
                sx={{
                  p: { xs: 2.25, sm: 2.5 },
                  borderRadius: '18px',
                  border: 1,
                  borderColor: 'divider',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.9,
                  cursor: canEdit ? 'pointer' : 'default',
                  transition: 'box-shadow .15s, border-color .15s',
                  '&:hover': { boxShadow: '0 12px 30px -20px rgba(16,40,37,0.45)', borderColor: alpha(g.color, 0.5) },
                }}
              >
                <Stack direction="row" alignItems="flex-start" spacing={1.6}>
                  <Box
                    sx={{
                      width: 42,
                      height: 42,
                      borderRadius: '12px',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: alpha(g.color, 0.1),
                      color: g.color,
                    }}
                  >
                    <AuroraIcon name={option.icon} size={21} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0, lineHeight: 1.3 }}>
                    <Typography noWrap title={g.name} sx={{ fontSize: fontSizes.lg, fontWeight: 800 }}>
                      {g.name}
                    </Typography>
                    <Typography noWrap sx={{ fontSize: fontSizes.xs, color: 'text.secondary', fontWeight: 600 }}>
                      {formatGoalPeriod(g.periodStart, g.periodType)}
                      {g.metric === 'MANUAL' ? ' · manual' : ''}
                    </Typography>
                  </Box>
                  <Box
                    component="span"
                    sx={{
                      flexShrink: 0,
                      fontSize: fontSizes['2xs'],
                      fontWeight: 700,
                      px: 1.25,
                      py: 0.5,
                      borderRadius: '8px',
                      whiteSpace: 'nowrap',
                      bgcolor: done ? alpha(theme.palette.success.main, 0.12) : alpha(tone, 0.1),
                      color: done ? 'success.dark' : tone,
                    }}
                  >
                    {status.label}
                  </Box>
                  {canEdit && (
                    <Tooltip title="Editar meta">
                      <IconButton
                        onClick={(ev) => {
                          ev.stopPropagation();
                          openEdit(g);
                        }}
                        sx={{
                          width: 30,
                          height: 30,
                          borderRadius: '9px',
                          border: 1,
                          borderColor: 'divider',
                          bgcolor: 'grey.50',
                          color: 'text.disabled',
                          flexShrink: 0,
                          '&:hover': { borderColor: 'primary.main', color: 'primary.main' },
                        }}
                      >
                        <EditIcon sx={{ fontSize: 15 }} />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>

                <Stack direction="row" alignItems="baseline" spacing={1} sx={{ minWidth: 0 }}>
                  <Typography noWrap sx={{ fontSize: fontSizes['4xl'], fontWeight: 800, letterSpacing: '-0.6px' }}>
                    {formatGoalValue(g.currentValue, g.format)}
                  </Typography>
                  <Typography noWrap sx={{ fontSize: fontSizes.sm, color: 'text.disabled', fontWeight: 600 }}>
                    / {formatGoalValue(g.target, g.format)}
                  </Typography>
                </Stack>

                <Box>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.9 }}>
                    <Typography sx={{ fontSize: fontSizes.xs, color: 'text.secondary', fontWeight: 600 }}>Progresso</Typography>
                    <Typography sx={{ fontSize: fontSizes.sm, fontWeight: 800, color: tone }}>
                      {Math.round(g.progress)}%
                    </Typography>
                  </Stack>
                  <Box sx={{ height: 9, borderRadius: 8, bgcolor: 'grey.100', overflow: 'hidden' }}>
                    <Box sx={{ height: '100%', width: `${clampProgress(g.progress)}%`, borderRadius: 8, bgcolor: g.color }} />
                  </Box>
                </Box>
              </Card>
            );
          })}
        </Box>
      )}

      <GoalFormDialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        editing={editing}
        canDelete={canDelete}
      />
      <AuditHistoryDialog open={historyOpen} onClose={() => setHistoryOpen(false)} entity="Goal" title="Metas" />
    </Stack>
  );
}

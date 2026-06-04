import { useMemo } from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import dayjs from 'dayjs';
import { dayjsFromDateOnlyApi } from '../../utils/dateOnly';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';

import { financeApi } from '../../api/finance';
import { usePermissions } from '../../contexts/usePermissions';
import type { FinancialEntry } from '../../types';
import { DashboardDetailItem } from './DashboardDetailItem';
import { DashboardEmptyState } from './DashboardEmptyState';

const LOOKAHEAD_DAYS = 7;

const EXPENSE_ACCENT = '#E65100';
const PAID_COLOR = '#2E7D32';

function dueDateLabel(daysUntil: number): string {
  if (daysUntil < 0) return 'vencida';
  if (daysUntil === 0) return 'hoje';
  if (daysUntil === 1) return 'amanha';
  return `em ${daysUntil} dias`;
}

function dueDateChipColor(daysUntil: number): 'error' | 'warning' | 'default' {
  if (daysUntil < 0) return 'error';
  if (daysUntil <= 2) return 'warning';
  return 'default';
}

interface UpcomingExpensesCardProps {
  embedded?: boolean;
}

export function UpcomingExpensesCard({ embedded = false }: UpcomingExpensesCardProps) {
  const today = dayjs().startOf('day');
  const from = today.subtract(30, 'day').toISOString();
  const to = today.add(LOOKAHEAD_DAYS, 'day').endOf('day').toISOString();
  const queryClient = useQueryClient();
  const { has } = usePermissions();
  const canEdit = has('finance:edit');

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['finance-upcoming-expenses', from, to],
    queryFn: () => financeApi.list(from, to),
  });

  const markPaidMutation = useMutation({
    mutationFn: (id: string) =>
      financeApi.markPaid(id, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-upcoming-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
    },
  });

  const upcoming = useMemo(() => {
    const limit = today.add(LOOKAHEAD_DAYS, 'day');

    return entries
      .filter((e: FinancialEntry) => {
        if (e.type !== 'EXPENSE') return false;
        if (!e.dueDate) return false;
        if (e.paidAt) return false;
        const due = dayjsFromDateOnlyApi(e.dueDate);
        if (!due) return false;
        return due.isBefore(limit) || due.isSame(limit, 'day');
      })
      .map((e: FinancialEntry) => {
        const due = dayjsFromDateOnlyApi(e.dueDate!)!;
        const daysUntil = due.diff(today, 'day');
        return { ...e, due, daysUntil };
      })
      .sort((a, b) => a.due.valueOf() - b.due.valueOf());
  }, [entries, today]);

  const totalAmount = useMemo(
    () => upcoming.reduce((sum, e) => sum + Number(e.amount), 0),
    [upcoming],
  );

  const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <Card
      sx={{
        width: '100%',
        ...(embedded
          ? {
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              minHeight: { lg: 460 },
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
        <Stack
          direction="row"
          spacing={2}
          alignItems="flex-start"
          justifyContent="space-between"
          sx={{ mb: 2, flexShrink: 0, minHeight: 48 }}
        >
          <Stack direction="row" spacing={2} alignItems="flex-start" sx={{ minWidth: 0 }}>
            <Avatar
              variant="rounded"
              sx={{
                bgcolor: alpha(EXPENSE_ACCENT, 0.14),
                width: 48,
                height: 48,
                flexShrink: 0,
              }}
            >
              <ReceiptLongIcon sx={{ color: EXPENSE_ACCENT }} />
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" fontWeight={700} noWrap>
                Despesas a pagar
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" noWrap>
                Proximos {LOOKAHEAD_DAYS} dias
                {upcoming.length > 0 && ` · ${upcoming.length} pendente${upcoming.length > 1 ? 's' : ''} · ${fmt(totalAmount)}`}
              </Typography>
            </Box>
          </Stack>
          <Button
            size="small"
            variant="outlined"
            component={RouterLink}
            to="/financeiro"
            sx={{ flexShrink: 0 }}
          >
            Financeiro
          </Button>
        </Stack>

        <Box
          sx={{
            flex: embedded ? '1 1 auto' : undefined,
            overflow: 'auto',
            maxHeight: 350,
            pr: 0.5,
            minHeight: 0,
            scrollbarWidth: 'thin',
            scrollbarColor: (theme) =>
              `${alpha(theme.palette.text.secondary, 0.28)} ${alpha(theme.palette.divider, 0.12)}`,
            '&::-webkit-scrollbar': { width: 7 },
            '&::-webkit-scrollbar-track': {
              margin: '6px 0',
              backgroundColor: (theme) => alpha(theme.palette.divider, 0.12),
              borderRadius: 10,
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: (theme) => alpha(theme.palette.text.secondary, 0.28),
              borderRadius: 10,
              border: '2px solid transparent',
              backgroundClip: 'padding-box',
              '&:hover': {
                backgroundColor: (theme) => alpha(theme.palette.text.secondary, 0.42),
              },
            },
          }}
        >
          {isLoading ? (
            <Typography variant="body2" color="text.secondary">
              Carregando...
            </Typography>
          ) : upcoming.length === 0 ? (
            <DashboardEmptyState
              message={`Nenhuma despesa pendente nos proximos ${LOOKAHEAD_DAYS} dias.`}
            />
          ) : (
            <Stack spacing={1.5}>
              {upcoming.map((e) => {
                const isMutating =
                  markPaidMutation.isPending && markPaidMutation.variables === e.id;
                const categoryLine = [
                  e.category ?? 'Sem categoria',
                  e.expenseType === 'FIXED'
                    ? 'Fixa'
                    : e.expenseType === 'VARIABLE'
                      ? 'Variavel'
                      : null,
                ]
                  .filter(Boolean)
                  .join(' · ');

                return (
                  <DashboardDetailItem
                    key={e.id}
                    accentColor={e.daysUntil < 0 ? 'error.main' : EXPENSE_ACCENT}
                    title={e.description}
                    chip={{
                      label: dueDateLabel(e.daysUntil),
                      color: dueDateChipColor(e.daysUntil),
                      variant: e.daysUntil <= 0 ? 'filled' : 'outlined',
                    }}
                    subtitle={categoryLine}
                    primaryRight={
                      <Typography component="span" variant="subtitle2" fontWeight={700} color={EXPENSE_ACCENT}>
                        {fmt(Number(e.amount))}
                      </Typography>
                    }
                    secondaryRight={`${e.due.format('DD/MM')} · ${e.due.format('dddd')}`}
                    trailing={
                      canEdit ? (
                        <Tooltip title="Marcar como pago">
                          <span>
                            <IconButton
                              size="small"
                              disabled={isMutating}
                              onClick={(ev) => {
                                ev.stopPropagation();
                                markPaidMutation.mutate(e.id);
                              }}
                              sx={{
                                color: PAID_COLOR,
                                '&:hover': { bgcolor: alpha(PAID_COLOR, 0.1) },
                              }}
                            >
                              {isMutating ? (
                                <CircularProgress size={20} />
                              ) : (
                                <CheckCircleOutlineIcon fontSize="small" />
                              )}
                            </IconButton>
                          </span>
                        </Tooltip>
                      ) : undefined
                    }
                  />
                );
              })}
            </Stack>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

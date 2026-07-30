import { useMemo, useRef } from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  IconButton,
  Paper,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import dayjs from 'dayjs';
import { dayjsFromDateOnlyApi } from '../../utils/dateOnly';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';

import { financeApi } from '../../api/finance';
import { useAppToast } from '../../contexts/AppToastContext';
import { getApiErrorMessage } from '../../utils/apiError';
import { usePermissions } from '../../contexts/usePermissions';
import type { FinancialEntry } from '../../types';
import { DashboardEmptyState } from './DashboardEmptyState';
import { AuroraIcon } from '../AuroraIcon';

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
  const todayRef = useRef(dayjs().startOf('day'));
  const today = todayRef.current;
  const from = useMemo(() => today.subtract(30, 'day').toISOString(), [today]);
  const to = useMemo(() => today.add(LOOKAHEAD_DAYS, 'day').endOf('day').toISOString(), [today]);
  const queryClient = useQueryClient();
  const toast = useAppToast();
  const { has } = usePermissions();
  const canEdit = has('finance:edit');

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['finance-upcoming-expenses', from, to],
    queryFn: () => financeApi.listUpcomingUnpaidExpenses(from, to),
  });

  const markPaidMutation = useMutation({
    mutationFn: (id: string) => financeApi.markPaid(id, true),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['finance-upcoming-expenses'] });
      const previousEntries = queryClient.getQueryData<FinancialEntry[]>([
        'finance-upcoming-expenses',
        from,
        to,
      ]);
      queryClient.setQueryData<FinancialEntry[]>(
        ['finance-upcoming-expenses', from, to],
        (current) => current?.filter((entry) => entry.id !== id) ?? [],
      );
      return { previousEntries };
    },
    onError: (err, _id, context) => {
      if (context?.previousEntries) {
        queryClient.setQueryData(['finance-upcoming-expenses', from, to], context.previousEntries);
      }
      toast.error(getApiErrorMessage(err, 'Não foi possível marcar a despesa como paga.'));
    },
    onSuccess: () => {
      toast.success('Despesa marcada como paga.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-upcoming-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
    },
  });

  const upcoming = useMemo(() => {
    const limit = today.add(LOOKAHEAD_DAYS, 'day');

    return entries
      .filter((e: FinancialEntry) => {
        if (!e.dueDate) return false;
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
              bgcolor: 'rgba(201,138,18,.13)',
              color: '#C98A12',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <AuroraIcon name="receipt" size={19} strokeWidth={1.7} />
          </Box>
          <Box sx={{ lineHeight: 1.2, flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: '0.9375rem', fontWeight: 700 }}>Contas a pagar</Typography>
            <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', fontWeight: 500 }} noWrap>
              próximos {LOOKAHEAD_DAYS} dias
            </Typography>
          </Box>
          {upcoming.length > 0 && (
            <Box sx={{ textAlign: 'right', lineHeight: 1.1, flexShrink: 0 }}>
              <Typography sx={{ fontSize: '1rem', fontWeight: 800 }}>{fmt(totalAmount)}</Typography>
              <Typography sx={{ fontSize: '0.62rem', color: 'text.secondary', fontWeight: 600 }}>
                total
              </Typography>
            </Box>
          )}
        </Stack>

        <Box
          sx={{
            flex: embedded ? '1 1 auto' : undefined,
            overflow: 'auto',
            ...(embedded ? { minHeight: 0, maxHeight: 260 } : { maxHeight: 350 }),
            pr: 0.5,
          }}
        >
          {isLoading ? (
            <Stack spacing={0.25}>
              {[0, 1, 2, 3].map((i) => (
                <Stack key={i} direction="row" alignItems="center" spacing={1.5} sx={{ px: 0.5, py: 1 }}>
                  <Skeleton variant="circular" width={9} height={9} sx={{ flexShrink: 0 }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Skeleton variant="text" width={`${70 - i * 8}%`} sx={{ fontSize: '0.8125rem' }} />
                    <Skeleton variant="text" width={`${45 - i * 4}%`} sx={{ fontSize: '0.72rem' }} />
                  </Box>
                  <Skeleton variant="rounded" width={30} height={30} sx={{ flexShrink: 0 }} />
                </Stack>
              ))}
            </Stack>
          ) : upcoming.length === 0 ? (
            <DashboardEmptyState
              message={`Nenhuma despesa pendente nos proximos ${LOOKAHEAD_DAYS} dias.`}
            />
          ) : (
            <Stack spacing={0.25}>
              {upcoming.map((e) => {
                const isMutating =
                  markPaidMutation.isPending && markPaidMutation.variables === e.id;
                const dotColor =
                  e.daysUntil < 0 ? '#C25A4C' : e.daysUntil <= 2 ? '#C98A12' : '#5A9A7D';
                return (
                  <Stack key={e.id} direction="row" alignItems="center" spacing={1.5} sx={{ px: 0.5, py: 1 }}>
                    <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: dotColor, flexShrink: 0 }} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography noWrap sx={{ fontSize: '0.8125rem', fontWeight: 700 }}>
                        {e.description}
                      </Typography>
                      <Typography noWrap sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
                        {dueDateLabel(e.daysUntil)}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontSize: '0.85rem', fontWeight: 800, whiteSpace: 'nowrap' }}>
                      {fmt(Number(e.amount))}
                    </Typography>
                    {canEdit && (
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
                              width: 30,
                              height: 30,
                              borderRadius: '9px',
                              border: '1px solid',
                              borderColor: 'divider',
                              bgcolor: 'grey.50',
                              color: 'text.secondary',
                              flexShrink: 0,
                              '&:hover': {
                                borderColor: '#11A893',
                                bgcolor: 'rgba(17,168,147,.12)',
                                color: '#11A893',
                              },
                            }}
                          >
                            {isMutating ? (
                              <CircularProgress size={16} />
                            ) : (
                              <AuroraIcon name="check" size={15} strokeWidth={2.4} />
                            )}
                          </IconButton>
                        </span>
                      </Tooltip>
                    )}
                  </Stack>
                );
              })}
            </Stack>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

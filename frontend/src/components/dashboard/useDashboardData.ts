import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { api } from '../../api/client';
import { appointmentsApi } from '../../api/appointments';
import { patientsApi } from '../../api/patients';
import { usePermissions } from '../../contexts/usePermissions';
import { upcomingBirthdaysOf } from './BirthdaysCard';

function mondayToSundayWeekBounds(anchorDateStr: string) {
  const start = dayjs(anchorDateStr).startOf('day');
  const end = start.add(6, 'day').endOf('day');
  return {
    from: start.toISOString(),
    to: end.toISOString(),
  };
}

/** Período do Dashboard: o mês corrente, fixado na montagem da página. */
function useCurrentMonthPeriod() {
  const [period] = useState(() => {
    const ref = dayjs().startOf('month');
    return {
      from: ref.toISOString(),
      to: ref.endOf('month').toISOString(),
      /** Metas cujo período contém o 1º dia do mês. */
      goalsAt: ref.format('YYYY-MM-DD'),
    };
  });
  return period;
}

/** Consultas e números derivados que alimentam os cards do Dashboard. */
export function useDashboardData() {
  const { has } = usePermissions();
  const canSeeFinance = has('finance:view');
  const canSeeAgenda = has('appointments:view');
  const canSeePatients = has('patients:view');

  const { from, to, goalsAt } = useCurrentMonthPeriod();

  const todayStr = dayjs().format('YYYY-MM-DD');
  const weekBounds = useMemo(() => mondayToSundayWeekBounds(todayStr), [todayStr]);

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['finance-summary', from, to],
    queryFn: async () => {
      const { data } = await api.get('/finance/summary', { params: { from, to } });
      return data as { totalIncome: number; totalExpense: number; balance: number };
    },
    enabled: canSeeFinance,
  });

  const { data: appointments, isLoading: appointmentsLoading } = useQuery({
    queryKey: ['appointments-range', from, to],
    queryFn: async () => {
      const { data } = await api.get('/appointments', { params: { from, to } });
      return data as any[];
    },
  });

  const { data: weekAppointments = [], isLoading: weekLoading } = useQuery({
    queryKey: ['appointments-week', weekBounds.from, weekBounds.to],
    queryFn: () => appointmentsApi.list(weekBounds.from, weekBounds.to),
    enabled: canSeeAgenda,
  });

  const upcomingThisWeek = useMemo(() => {
    const now = dayjs();
    return weekAppointments
      .filter((a) => a.status !== 'CANCELLED')
      .filter((a) => !dayjs(a.startAt).isBefore(now))
      .sort((a, b) => dayjs(a.startAt).valueOf() - dayjs(b.startAt).valueOf());
  }, [weekAppointments]);

  const todayAppointmentsCount = useMemo(() => {
    const today = dayjs();
    return (appointments ?? [])
      .filter((a) => a.status !== 'CANCELLED')
      .filter((a) => dayjs(a.startAt).isSame(today, 'day')).length;
  }, [appointments]);

  const { data: patients = [], isLoading: patientsLoading } = useQuery({
    queryKey: ['patients', 'dashboard'],
    queryFn: () => patientsApi.list(),
  });

  const newPatientsCount = useMemo(() => {
    const periodStart = dayjs(from);
    const periodEnd = dayjs(to);
    return patients.filter((p) => {
      const created = dayjs(p.createdAt);
      return (
        created.isValid() &&
        !created.isBefore(periodStart) &&
        !created.isAfter(periodEnd)
      );
    }).length;
  }, [patients, from, to]);

  const { data: inventory, isLoading: inventoryLoading } = useQuery({
    queryKey: ['inventory-low'],
    queryFn: async () => {
      const { data } = await api.get('/inventory');
      return data as any[];
    },
  });

  const lowStockCount = (inventory ?? []).filter(
    (i) => Number(i.quantity) <= Number(i.minQuantity),
  ).length;

  const upcomingBirthdays = useMemo(
    () => (canSeePatients ? upcomingBirthdaysOf(patients) : []),
    [canSeePatients, patients],
  );

  return {
    goalsAt,
    summary,
    summaryLoading,
    todayAppointmentsCount,
    appointmentsLoading,
    upcomingThisWeek,
    weekLoading,
    newPatientsCount,
    patientsLoading,
    lowStockCount,
    inventoryLoading,
    upcomingBirthdays,
  };
}

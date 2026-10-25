import { useMemo } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { availabilityApi } from '../../api/availability';
import { usersApi } from '../../api/users';
import { useAuth } from '../../contexts/AuthContext';
import { useAppToast } from '../../contexts/AppToastContext';
import { usePermissions } from '../../contexts/usePermissions';
import type { Unavailability } from '../../types';
import { getApiErrorMessage } from '../../utils/apiError';
import { PROFESSIONAL_COLORS, type Professional } from './availabilityConfig';

/** Atualiza a lista de bloqueios do profissional e as consultas de agenda que dependem dela. */
export function invalidateUnavailability(queryClient: QueryClient, userId: string) {
  queryClient.invalidateQueries({ queryKey: ['unavailability', userId] });
  queryClient.invalidateQueries({ queryKey: ['unavailability-range'] });
  queryClient.invalidateQueries({ queryKey: ['available-professionals'] });
}

/** Profissionais visíveis, seus horários semanais e bloqueios de agenda. */
export function useAvailabilityData() {
  const queryClient = useQueryClient();
  const toast = useAppToast();
  const { user: me } = useAuth();
  const { has } = usePermissions();
  const canEditOthers = has('availability:edit');

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['users', 'appointment-providers'],
    queryFn: () => usersApi.listAppointmentProviders(),
    enabled: canEditOthers,
  });

  // Quem pode editar outros vê toda a equipe; os demais só a própria agenda.
  const professionals = useMemo<Professional[]>(() => {
    const list: Professional[] = canEditOthers ? users.map((u) => ({ id: u.id, name: u.name })) : [];
    if (me && !list.some((p) => p.id === me.id)) list.unshift({ id: me.id, name: me.name });
    return list;
  }, [canEditOthers, users, me]);

  const colorOf = useMemo(() => {
    const map = new Map(professionals.map((p, i) => [p.id, PROFESSIONAL_COLORS[i % PROFESSIONAL_COLORS.length]]));
    return (id: string) => map.get(id) ?? PROFESSIONAL_COLORS[0];
  }, [professionals]);

  const hoursQueries = useQueries({
    queries: professionals.map((p) => ({
      queryKey: ['working-hours', p.id],
      queryFn: () => availabilityApi.listWorkingHours(p.id),
    })),
  });

  const unavailQueries = useQueries({
    queries: professionals.map((p) => ({
      queryKey: ['unavailability', p.id],
      queryFn: () => availabilityApi.listUnavailability(p.id),
    })),
  });

  const unavailLoading = (canEditOthers && usersLoading) || unavailQueries.some((q) => q.isLoading);

  const blocks = useMemo(
    () =>
      professionals
        .flatMap((p, i) =>
          (unavailQueries[i]?.data ?? []).map((u: Unavailability) => ({ ...u, professional: p })),
        )
        .sort((a, b) => a.startAt.localeCompare(b.startAt)),
    [professionals, unavailQueries],
  );

  const removeUnavailMutation = useMutation({
    mutationFn: ({ userId, id }: { userId: string; id: string }) =>
      availabilityApi.removeUnavailability(userId, id),
    onSuccess: (_, { userId }) => {
      invalidateUnavailability(queryClient, userId);
      toast.success('Indisponibilidade removida.');
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Não foi possível remover a indisponibilidade.'));
    },
  });

  return {
    me,
    canEditOthers,
    usersLoading,
    professionals,
    colorOf,
    hoursQueries,
    unavailLoading,
    blocks,
    removeBlock: removeUnavailMutation.mutate,
  };
}

export type UnavailabilityBlock = ReturnType<typeof useAvailabilityData>['blocks'][number];

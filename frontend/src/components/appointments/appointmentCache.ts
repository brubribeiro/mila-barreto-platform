import type { Query, QueryClient, QueryKey } from '@tanstack/react-query';

import type { Appointment } from '../../types';

export function isAppointmentListQuery(query: Query) {
  const root = query.queryKey[0];
  return root === 'appointments' || root === 'appointments-range' || root === 'appointments-week';
}

export function invalidateAppointmentListQueries(queryClient: QueryClient) {
  queryClient.invalidateQueries({ predicate: isAppointmentListQuery });
}

export function snapshotAppointmentLists(queryClient: QueryClient) {
  return queryClient.getQueriesData<Appointment[]>({ predicate: isAppointmentListQuery });
}

export function removeAppointmentFromCache(queryClient: QueryClient, appointmentId: string) {
  queryClient.setQueriesData<Appointment[]>({ predicate: isAppointmentListQuery }, (current) =>
    current?.filter((item) => item.id !== appointmentId),
  );
}

export function restoreAppointmentLists(
  queryClient: QueryClient,
  snapshots: [QueryKey, Appointment[] | undefined][],
) {
  for (const [key, data] of snapshots) {
    queryClient.setQueryData(key, data);
  }
}

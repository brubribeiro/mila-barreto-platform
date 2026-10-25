import { useQuery } from '@tanstack/react-query';

import { patientsApi } from '../../api/patients';

/** Paciente e score de confiabilidade, compartilhados pela ficha completa e pela gaveta. */
export function usePatientChart(patientId: string | null | undefined) {
  const { data, isLoading } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => patientsApi.findOne(patientId!),
    enabled: !!patientId,
  });

  const { data: reliability } = useQuery({
    queryKey: ['patient-reliability', patientId],
    queryFn: () => patientsApi.getReliability(patientId!),
    enabled: !!patientId,
  });

  return { data, isLoading, reliability };
}

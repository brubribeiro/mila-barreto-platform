import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { availabilityApi } from '../../api/availability';
import { useAppToast } from '../../contexts/AppToastContext';
import { getApiErrorMessage } from '../../utils/apiError';
import { DEFAULT_DAY, EMPTY_HOURS, WEEK_ORDER, type DayScheduleEdit, type Professional } from './availabilityConfig';
import { buildWeekFromRemote } from './availabilityUtils';

/** Grade semanal editável do profissional e o salvamento (upsert/remove só dos dias alterados). */
export function useWorkingHoursForm(professional: Professional | null, onClose: () => void) {
  const queryClient = useQueryClient();
  const toast = useAppToast();
  const open = !!professional;
  const userId = professional?.id ?? '';

  const { data: workingHours, isLoading: hoursLoading } = useQuery({
    queryKey: ['working-hours', userId],
    queryFn: () => availabilityApi.listWorkingHours(userId),
    enabled: !!userId,
  });

  const [weekSchedule, setWeekSchedule] = useState<Record<number, DayScheduleEdit>>(() =>
    buildWeekFromRemote([]),
  );

  useEffect(() => {
    if (open) setWeekSchedule(buildWeekFromRemote(workingHours ?? EMPTY_HOURS));
  }, [open, workingHours]);

  const saveWeekMutation = useMutation({
    mutationFn: async () => {
      const remoteHours = workingHours ?? EMPTY_HOURS;
      const ops: Promise<unknown>[] = [];
      for (let day = 0; day < 7; day++) {
        const state = weekSchedule[day] ?? DEFAULT_DAY;
        const remote = remoteHours.find((w) => w.dayOfWeek === day);
        if (state.works) {
          if (
            !remote ||
            remote.startTime !== state.startTime ||
            remote.endTime !== state.endTime
          ) {
            ops.push(
              availabilityApi.upsertWorkingHours(userId, {
                dayOfWeek: day,
                startTime: state.startTime,
                endTime: state.endTime,
              }),
            );
          }
        } else if (remote) {
          ops.push(availabilityApi.removeWorkingHours(userId, day));
        }
      }
      await Promise.all(ops);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['working-hours', userId] });
      toast.success('Horários salvos.');
      onClose();
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Não foi possível salvar os horários.'));
    },
  });

  useEffect(() => {
    if (open) saveWeekMutation.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const updateDay = (day: number, patch: Partial<DayScheduleEdit>) => {
    setWeekSchedule((prev) => ({
      ...prev,
      [day]: { ...(prev[day] ?? DEFAULT_DAY), ...patch },
    }));
  };

  const applyPreset = (openDays: number[]) => {
    setWeekSchedule((prev) => {
      const next = { ...prev };
      for (let day = 0; day < 7; day++) {
        const current = next[day] ?? DEFAULT_DAY;
        next[day] = {
          ...current,
          works: openDays.includes(day),
        };
      }
      return next;
    });
  };

  const openDaysCount = WEEK_ORDER.filter((day) => weekSchedule[day]?.works).length;

  const weekHasInvalidHours = WEEK_ORDER.some((day) => {
    const s = weekSchedule[day];
    return s?.works && s.startTime >= s.endTime;
  });

  return {
    weekSchedule,
    hoursLoading,
    saveWeekMutation,
    updateDay,
    applyPreset,
    openDaysCount,
    weekHasInvalidHours,
  };
}

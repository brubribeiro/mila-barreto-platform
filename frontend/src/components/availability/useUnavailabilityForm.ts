import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { availabilityApi } from '../../api/availability';
import { useAppToast } from '../../contexts/AppToastContext';
import { getApiErrorMessage } from '../../utils/apiError';
import { formatUnavailabilityPeriod, nextWeekdayRange } from './availabilityUtils';
import { invalidateUnavailability } from './useAvailabilityData';

/** Estado do formulário de bloqueio (dia inteiro ou por horário), validação, prévia e criação. */
export function useUnavailabilityForm(open: boolean, defaultUserId: string, onClose: () => void) {
  const queryClient = useQueryClient();
  const toast = useAppToast();
  const [allDay, setAllDay] = useState(false);
  const [startAt, setStartAt] = useState(dayjs().format('YYYY-MM-DDTHH:mm'));
  const [endAt, setEndAt] = useState(dayjs().add(1, 'hour').format('YYYY-MM-DDTHH:mm'));
  const [startDate, setStartDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [reason, setReason] = useState('');
  const [userId, setUserId] = useState(defaultUserId);

  useEffect(() => {
    if (!open) return;
    const now = dayjs();
    setUserId(defaultUserId);
    setAllDay(false);
    setStartAt(now.format('YYYY-MM-DDTHH:mm'));
    setEndAt(now.add(1, 'hour').format('YYYY-MM-DDTHH:mm'));
    setStartDate(now.format('YYYY-MM-DD'));
    setEndDate(now.format('YYYY-MM-DD'));
    setReason('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const dateRangeInvalid = useMemo(
    () => allDay && !!startDate && !!endDate && dayjs(endDate).isBefore(dayjs(startDate), 'day'),
    [allDay, startDate, endDate],
  );

  const datetimeRangeInvalid = useMemo(
    () =>
      !allDay &&
      !!startAt &&
      !!endAt &&
      (dayjs(endAt).isBefore(dayjs(startAt)) || dayjs(endAt).isSame(dayjs(startAt))),
    [allDay, startAt, endAt],
  );

  const periodPreview = useMemo(() => {
    if (allDay) {
      if (!startDate || !endDate || dateRangeInvalid) return null;
      return formatUnavailabilityPeriod(
        dayjs(startDate).startOf('day').toISOString(),
        dayjs(endDate).endOf('day').toISOString(),
      );
    }
    if (!startAt || !endAt || datetimeRangeInvalid) return null;
    return formatUnavailabilityPeriod(new Date(startAt).toISOString(), new Date(endAt).toISOString());
  }, [allDay, startDate, endDate, startAt, endAt, dateRangeInvalid, datetimeRangeInvalid]);

  const formInvalid = dateRangeInvalid || datetimeRangeInvalid;

  const periodError = dateRangeInvalid
    ? 'A data final deve ser igual ou posterior à inicial'
    : datetimeRangeInvalid
      ? 'O término deve ser posterior ao início'
      : null;

  const switchMode = (nextAllDay: boolean) => {
    if (nextAllDay === allDay) return;
    setAllDay(nextAllDay);
    if (nextAllDay) {
      setStartDate(dayjs(startAt).format('YYYY-MM-DD'));
      setEndDate(dayjs(endAt).format('YYYY-MM-DD'));
      return;
    }
    const start = dayjs(startDate).hour(dayjs(startAt).hour()).minute(dayjs(startAt).minute());
    const end = dayjs(endDate).hour(dayjs(endAt).hour()).minute(dayjs(endAt).minute());
    setStartAt(start.format('YYYY-MM-DDTHH:mm'));
    setEndAt(
      end.isAfter(start)
        ? end.format('YYYY-MM-DDTHH:mm')
        : start.add(1, 'hour').format('YYYY-MM-DDTHH:mm'),
    );
  };

  const mutation = useMutation({
    mutationFn: () => {
      const payload = allDay
        ? {
            startAt: dayjs(startDate).startOf('day').toISOString(),
            endAt: dayjs(endDate).endOf('day').toISOString(),
            reason: reason.trim() || undefined,
          }
        : {
            startAt: new Date(startAt).toISOString(),
            endAt: new Date(endAt).toISOString(),
            reason: reason.trim() || undefined,
          };
      return availabilityApi.createUnavailability(userId, payload);
    },
    onSuccess: () => {
      invalidateUnavailability(queryClient, userId);
      toast.success('Indisponibilidade registrada.');
      onClose();
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, 'Não foi possível registrar a indisponibilidade.'));
    },
  });

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!formInvalid && !!userId && !mutation.isPending) {
      mutation.mutate();
    }
  };

  const presets = allDay
    ? [
        {
          label: 'Hoje',
          onClick: () => {
            const d = dayjs().format('YYYY-MM-DD');
            setStartDate(d);
            setEndDate(d);
          },
        },
        {
          label: 'Amanhã',
          onClick: () => {
            const d = dayjs().add(1, 'day').format('YYYY-MM-DD');
            setStartDate(d);
            setEndDate(d);
          },
        },
        {
          label: 'Seg–Sex (próx.)',
          onClick: () => {
            const range = nextWeekdayRange(1, 5);
            setStartDate(range.start);
            setEndDate(range.end);
          },
        },
      ]
    : [
        {
          label: 'Próxima hora',
          onClick: () => {
            const now = dayjs();
            setStartAt(now.format('YYYY-MM-DDTHH:mm'));
            setEndAt(now.add(1, 'hour').format('YYYY-MM-DDTHH:mm'));
          },
        },
        {
          label: 'Manhã (hoje)',
          onClick: () => {
            const start = dayjs().hour(8).minute(0).second(0);
            setStartAt(start.format('YYYY-MM-DDTHH:mm'));
            setEndAt(start.hour(12).format('YYYY-MM-DDTHH:mm'));
          },
        },
        {
          label: 'Tarde (hoje)',
          onClick: () => {
            const start = dayjs().hour(13).minute(0).second(0);
            setStartAt(start.format('YYYY-MM-DDTHH:mm'));
            setEndAt(start.hour(18).format('YYYY-MM-DDTHH:mm'));
          },
        },
      ];

  const changeStartDate = (value: string) => {
    setStartDate(value);
    if (dayjs(endDate).isBefore(dayjs(value), 'day')) {
      setEndDate(value);
    }
  };

  const changeStartAt = (newStart: string) => {
    setStartAt(newStart);
    if (
      !dayjs(endAt).isAfter(dayjs(newStart)) &&
      dayjs(newStart).isValid()
    ) {
      setEndAt(dayjs(newStart).add(1, 'hour').format('YYYY-MM-DDTHH:mm'));
    }
  };

  return {
    allDay,
    startAt,
    endAt,
    startDate,
    endDate,
    reason,
    userId,
    setReason,
    setUserId,
    setEndAt,
    setEndDate,
    changeStartAt,
    changeStartDate,
    switchMode,
    presets,
    dateRangeInvalid,
    datetimeRangeInvalid,
    formInvalid,
    periodError,
    periodPreview,
    mutation,
    handleSubmit,
  };
}

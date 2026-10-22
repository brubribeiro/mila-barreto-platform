import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { appointmentsApi } from '../../api/appointments';
import { availabilityApi } from '../../api/availability';
import { useAppToast } from '../../contexts/AppToastContext';
import { getApiErrorMessage } from '../../utils/apiError';
import {
  computeEarliestRecurrenceDate,
  formatRecurrenceEarliestLabel,
  isDateBeforeRecurrenceEarliest,
} from '../../utils/appointmentRecurrence';
import type { Appointment, Procedure } from '../../types';
import { DialogHeader } from '../DialogCloseButton';
import { invalidateAppointmentListQueries } from './appointmentCache';

/** Sugere e cria o retorno logo após concluir um procedimento. */
export function ReturnAppointmentDialog({
  pendingReturn,
  procedures,
  fallbackProcedure,
  onClose,
}: {
  /** Atendimento concluído; o diálogo fica aberto enquanto estiver definido. */
  pendingReturn: Appointment | null;
  procedures: Procedure[];
  fallbackProcedure?: Procedure;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const toast = useAppToast();
  const open = !!pendingReturn;
  const [returnDate, setReturnDate] = useState('');
  const [returnStartTime, setReturnStartTime] = useState('');
  const [returnCreateError, setReturnCreateError] = useState<string | null>(null);

  const pendingReturnProcedure = useMemo(() => {
    if (!pendingReturn) return undefined;
    return (
      pendingReturn.procedure ??
      procedures.find((p) => p.id === pendingReturn.procedureId) ??
      fallbackProcedure
    );
  }, [pendingReturn, procedures, fallbackProcedure]);

  const returnMinDate = useMemo(() => {
    if (!pendingReturn || !pendingReturnProcedure?.recurrenceDays) return null;
    return computeEarliestRecurrenceDate(pendingReturn.startAt, pendingReturnProcedure.recurrenceDays);
  }, [pendingReturn, pendingReturnProcedure]);

  const returnDateTooEarly =
    !!returnMinDate && !!returnDate && isDateBeforeRecurrenceEarliest(returnDate, returnMinDate);

  const returnDateTime = useMemo(
    () => (returnDate && returnStartTime ? dayjs(`${returnDate}T${returnStartTime}`) : null),
    [returnDate, returnStartTime],
  );

  const returnProfessionalId = pendingReturn?.professionalId ?? pendingReturn?.professional?.id ?? '';

  const returnSlotEnd = useMemo(
    () =>
      returnDateTime?.isValid()
        ? returnDateTime.add(pendingReturnProcedure?.durationMinutes ?? 60, 'minute')
        : null,
    [returnDateTime, pendingReturnProcedure?.durationMinutes],
  );

  const returnSlotValid =
    !!returnDateTime?.isValid() && !!returnSlotEnd?.isValid() && returnSlotEnd.isAfter(returnDateTime);

  const { data: returnAvailableProfessionals = [], isLoading: loadingReturnAvailability } = useQuery({
    queryKey: [
      'return-available-professionals',
      returnDate,
      returnStartTime,
      pendingReturnProcedure?.durationMinutes ?? 60,
    ],
    queryFn: () =>
      availabilityApi.listAvailableProfessionals(
        returnDateTime!.toISOString(),
        returnSlotEnd!.toISOString(),
      ),
    enabled: open && returnSlotValid,
  });

  const returnProfessionalAvailable = useMemo(() => {
    if (!returnProfessionalId || !returnSlotValid) return false;
    if (loadingReturnAvailability) return true;
    return returnAvailableProfessionals.some((p) => p.id === returnProfessionalId);
  }, [returnProfessionalId, returnSlotValid, loadingReturnAvailability, returnAvailableProfessionals]);

  useEffect(() => {
    if (!pendingReturn) {
      setReturnDate('');
      setReturnStartTime('');
      setReturnCreateError(null);
      return;
    }
    const procedure =
      pendingReturn.procedure ?? procedures.find((p) => p.id === pendingReturn.procedureId);
    const suggested = procedure?.recurrenceDays
      ? dayjs(pendingReturn.startAt).add(procedure.recurrenceDays, 'day')
      : dayjs(pendingReturn.startAt).add(7, 'day');
    setReturnDate(suggested.format('YYYY-MM-DD'));
    setReturnStartTime(suggested.format('HH:mm'));
    setReturnCreateError(null);
  }, [pendingReturn, procedures]);

  const createReturnMutation = useMutation({
    mutationFn: async () => {
      if (!pendingReturn || !returnDate || !returnStartTime) return;
      const procedureForReturn = pendingReturnProcedure;
      const professionalId = pendingReturn.professionalId ?? pendingReturn.professional?.id;
      const procedureId = pendingReturn.procedureId ?? pendingReturn.procedure?.id;
      if (!professionalId || !procedureId) {
        throw new Error('Dados do atendimento incompletos para agendar o retorno.');
      }
      const returnStart = dayjs(`${returnDate}T${returnStartTime}`);
      if (!returnStart.isValid()) {
        throw new Error('Data ou horário do retorno inválido.');
      }
      if (returnMinDate && isDateBeforeRecurrenceEarliest(returnDate, returnMinDate)) {
        throw new Error(
          `Retorno só pode ser agendado a partir de ${formatRecurrenceEarliestLabel(returnMinDate)}.`,
        );
      }
      const durationMinutes = procedureForReturn?.durationMinutes ?? 60;
      return appointmentsApi.create({
        patientId: pendingReturn.patientId,
        procedureId,
        professionalId,
        startAt: returnStart.toISOString(),
        endAt: returnStart.add(durationMinutes, 'minute').toISOString(),
        status: 'SCHEDULED',
        kind: 'RETURN',
        notes: procedureForReturn?.recurrenceDays
          ? 'Retorno automático sugerido'
          : 'Retorno agendado manualmente',
      });
    },
    onSuccess: () => {
      invalidateAppointmentListQueries(queryClient);
      onClose();
      toast.success('Retorno agendado.');
    },
    onError: (err: unknown) => {
      const message = getApiErrorMessage(err, 'Não foi possível agendar o retorno.');
      setReturnCreateError(message);
      toast.error(message);
    },
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogHeader
        onClose={onClose}
        title="Agendar retorno?"
        subtitle="Confirme a data do próximo atendimento"
        icon={<EventRepeatIcon fontSize="small" />}
      />
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          {pendingReturn && pendingReturnProcedure?.recurrenceDays ? (
            <Typography variant="body2">
              Intervalo de retorno: <strong>{pendingReturnProcedure.recurrenceDays} dias</strong>.
              {returnMinDate ? (
                <>
                  {' '}
                  Só é possível agendar a partir de{' '}
                  <strong>{formatRecurrenceEarliestLabel(returnMinDate)}</strong>.
                </>
              ) : null}
            </Typography>
          ) : pendingReturn ? (
            <Typography variant="body2" color="text.secondary">
              Este procedimento não tem intervalo de retorno cadastrado. Escolha manualmente a data
              e o horário do retorno.
            </Typography>
          ) : null}
          {returnCreateError && <Alert severity="error">{returnCreateError}</Alert>}
          {!loadingReturnAvailability &&
            returnSlotValid &&
            returnProfessionalId &&
            !returnProfessionalAvailable && (
              <Alert severity="warning">
                O profissional não está disponível neste horário (expediente, folga ou conflito).
                Escolha outra data ou horário.
              </Alert>
            )}
          {returnDateTooEarly && returnMinDate && (
            <Alert severity="warning">
              A data deve ser a partir de {formatRecurrenceEarliestLabel(returnMinDate)}.
            </Alert>
          )}
          <TextField
            type="date"
            label="Data do retorno"
            value={returnDate}
            onChange={(e) => {
              setReturnDate(e.target.value);
              setReturnCreateError(null);
            }}
            fullWidth
            required
            InputLabelProps={{ shrink: true }}
            inputProps={{ min: returnMinDate ?? undefined }}
            error={returnDateTooEarly}
            helperText={
              returnMinDate
                ? `Disponível a partir de ${formatRecurrenceEarliestLabel(returnMinDate)}`
                : undefined
            }
          />
          <TextField
            type="time"
            label="Horário"
            value={returnStartTime}
            onChange={(e) => {
              setReturnStartTime(e.target.value);
              setReturnCreateError(null);
            }}
            fullWidth
            required
            InputLabelProps={{ shrink: true }}
          />
          {returnDateTime?.isValid() && pendingReturnProcedure && (
            <Typography variant="caption" color="text.secondary">
              Duração estimada: {pendingReturnProcedure.durationMinutes} min · mesmo profissional e
              procedimento do atendimento concluído.
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Agora não</Button>
        <Button
          variant="contained"
          startIcon={<EventRepeatIcon />}
          disabled={
            createReturnMutation.isPending ||
            loadingReturnAvailability ||
            !returnDate ||
            !returnStartTime ||
            !returnSlotValid ||
            !returnProfessionalAvailable ||
            returnDateTooEarly
          }
          onClick={() => {
            setReturnCreateError(null);
            createReturnMutation.mutate();
          }}
        >
          {createReturnMutation.isPending ? 'Criando...' : 'Criar retorno'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

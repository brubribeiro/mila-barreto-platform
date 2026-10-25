import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  List,
  ListItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { appointmentsApi } from '../../api/appointments';
import { useAppToast } from '../../contexts/AppToastContext';
import { getApiErrorMessage } from '../../utils/apiError';
import type { Appointment, PatientPackage, Procedure } from '../../types';
import { DialogHeader } from '../DialogCloseButton';
import { invalidateAppointmentListQueries } from './appointmentCache';

export interface BatchTarget {
  patientPkg: PatientPackage;
  /** Quando definido, preenche exatamente N sessões faltantes. */
  fillCount: number | null;
}

/** Agenda em lote as sessões restantes de um pacote, com o intervalo de retorno do procedimento. */
export function BatchSessionsDialog({
  target,
  procedure,
  packageSessions,
  patientId,
  professionalId,
  baseDate,
  baseStartTime,
  onClose,
  onDone,
}: {
  target: BatchTarget | null;
  procedure?: Procedure;
  packageSessions: Appointment[];
  patientId: string;
  professionalId: string;
  baseDate: string;
  baseStartTime: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const toast = useAppToast();
  const [creating, setCreating] = useState(false);
  const [sessions, setSessions] = useState<{ date: string; startTime: string }[]>([]);
  const batchPatientPkg = target?.patientPkg ?? null;
  const batchFillCount = target?.fillCount ?? null;
  const recurrenceDays = procedure?.recurrenceDays;

  useEffect(() => {
    if (!batchPatientPkg || !recurrenceDays) return;
    const remaining = batchFillCount ?? batchPatientPkg.sessionsTotal - batchPatientPkg.sessionsUsed;
    if (remaining <= 0) {
      setSessions([]);
      return;
    }
    // Ao preencher faltantes, começa após a última sessão já agendada
    const lastScheduled =
      batchFillCount != null && packageSessions.length > 0
        ? packageSessions[packageSessions.length - 1]
        : null;
    const start = lastScheduled
      ? dayjs(lastScheduled.startAt).add(recurrenceDays, 'day')
      : dayjs(`${baseDate}T${baseStartTime}`);
    setSessions(
      Array.from({ length: remaining }, (_, i) => {
        const sessionDate = start.add(i * recurrenceDays, 'day');
        return { date: sessionDate.format('YYYY-MM-DD'), startTime: sessionDate.format('HH:mm') };
      }),
    );
  }, [batchPatientPkg, batchFillCount, packageSessions, recurrenceDays, baseDate, baseStartTime]);

  const handleCreate = async () => {
    if (!batchPatientPkg || !procedure?.recurrenceDays) return;
    setCreating(true);
    try {
      const remaining = sessions.length;
      for (let i = 0; i < remaining; i++) {
        const session = sessions[i];
        const sessionStart = dayjs(`${session.date}T${session.startTime}`);
        await appointmentsApi.create({
          patientId,
          procedureId: procedure.id,
          professionalId,
          startAt: sessionStart.toISOString(),
          endAt: sessionStart.add(procedure.durationMinutes, 'minute').toISOString(),
          status: 'SCHEDULED',
          kind: 'PROCEDURE',
          notes: `Sessão ${i + 1}/${remaining} — ${batchPatientPkg.package?.name ?? 'Pacote'}`,
          patientPackageId: batchPatientPkg.id,
        });
      }
      invalidateAppointmentListQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ['patient-packages-active'] });
      queryClient.invalidateQueries({ queryKey: ['patient-packages'] });
      toast.success(`${remaining} sessões agendadas.`);
      onDone();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Erro ao criar agendamentos em lote'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={!!target} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogHeader
        onClose={onClose}
        title="Agendar sessões do pacote"
        subtitle="Distribua as sessões restantes na agenda"
        icon={<CalendarMonthIcon fontSize="small" />}
      />
      <DialogContent>
        {batchPatientPkg && procedure && (
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2">
              {batchFillCount != null ? (
                <>
                  Faltam <strong>{batchFillCount}</strong> sessão(ões) a agendar no pacote{' '}
                  <strong>{batchPatientPkg.package?.name}</strong> de <strong>{procedure.name}</strong>.
                </>
              ) : (
                <>
                  O pacote <strong>{batchPatientPkg.package?.name}</strong> possui{' '}
                  <strong>{batchPatientPkg.sessionsTotal - batchPatientPkg.sessionsUsed}</strong> sessões
                  restantes de <strong>{procedure.name}</strong>.
                </>
              )}
            </Typography>

            {procedure.recurrenceDays ? (
              <>
                <Typography variant="body2" color="text.secondary">
                  Serão agendadas com intervalo de <strong>{procedure.recurrenceDays} dias</strong>{' '}
                  entre cada sessão, a partir de{' '}
                  <strong>
                    {dayjs(
                      sessions[0]
                        ? `${sessions[0].date}T${sessions[0].startTime}`
                        : `${baseDate}T${baseStartTime}`,
                    ).format('DD/MM/YYYY [às] HH:mm')}
                  </strong>
                  , com o mesmo profissional.
                </Typography>

                <Typography variant="overline" color="text.secondary">
                  Sessões que serão agendadas (altere data/horário se precisar):
                </Typography>
                <List dense disablePadding sx={{ maxHeight: 320, overflow: 'auto' }}>
                  {sessions.map((session, i) => (
                    <ListItem key={i} disableGutters sx={{ py: 0.75 }}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%' }}>
                        <Chip size="small" label={`${i + 1}ª`} color="primary" variant="outlined" sx={{ minWidth: 36 }} />
                        <TextField
                          type="date"
                          size="small"
                          value={session.date}
                          onChange={(e) =>
                            setSessions((prev) =>
                              prev.map((s, idx) => (idx === i ? { ...s, date: e.target.value } : s)),
                            )
                          }
                          InputLabelProps={{ shrink: true }}
                          sx={{ flex: 1, minWidth: 130 }}
                        />
                        <TextField
                          type="time"
                          size="small"
                          value={session.startTime}
                          onChange={(e) =>
                            setSessions((prev) =>
                              prev.map((s, idx) => (idx === i ? { ...s, startTime: e.target.value } : s)),
                            )
                          }
                          InputLabelProps={{ shrink: true }}
                          sx={{ width: 110 }}
                        />
                      </Stack>
                    </ListItem>
                  ))}
                </List>
              </>
            ) : (
              <Alert severity="warning">
                Este procedimento não possui intervalo de retorno configurado. Configure o campo
                "Retorno (dias)" no procedimento para agendar em lote automaticamente.
              </Alert>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Agendar só esta sessão</Button>
        <Button
          variant="contained"
          startIcon={creating ? <CircularProgress size={18} /> : <CalendarMonthIcon />}
          disabled={creating || !procedure?.recurrenceDays}
          onClick={() => void handleCreate()}
        >
          {creating ? 'Agendando...' : `Agendar ${sessions.length} sessões`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

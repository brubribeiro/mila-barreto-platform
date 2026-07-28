import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

import { AppointmentFormDialog } from '../components/appointments/AppointmentFormDialog';
import type { Appointment } from '../types';

interface OpenOptions {
  /** Pré-seleciona um paciente ao criar. */
  patientId?: string | null;
  /** Data/horário inicial ao criar. */
  start?: Date | null;
  /** Abre em modo edição de um agendamento existente. */
  appointment?: Appointment | null;
}

interface AppointmentDialogContextValue {
  openAppointmentDialog: (opts?: OpenOptions) => void;
  closeAppointmentDialog: () => void;
}

const AppointmentDialogContext = createContext<AppointmentDialogContextValue | null>(null);

export function AppointmentDialogProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [defaultStart, setDefaultStart] = useState<Date | null>(null);
  const [defaultPatientId, setDefaultPatientId] = useState<string | null>(null);

  const openAppointmentDialog = useCallback((opts?: OpenOptions) => {
    setAppointment(opts?.appointment ?? null);
    setDefaultStart(opts?.start ?? null);
    setDefaultPatientId(opts?.patientId ?? null);
    setOpen(true);
  }, []);

  const closeAppointmentDialog = useCallback(() => {
    setOpen(false);
    setAppointment(null);
    setDefaultStart(null);
    setDefaultPatientId(null);
  }, []);

  return (
    <AppointmentDialogContext.Provider value={{ openAppointmentDialog, closeAppointmentDialog }}>
      {children}
      {open && (
        <AppointmentFormDialog
          open
          onClose={closeAppointmentDialog}
          appointment={appointment}
          defaultStart={defaultStart}
          defaultPatientId={defaultPatientId}
        />
      )}
    </AppointmentDialogContext.Provider>
  );
}

export function useAppointmentDialog() {
  const ctx = useContext(AppointmentDialogContext);
  if (!ctx) {
    throw new Error('useAppointmentDialog deve ser usado dentro de AppointmentDialogProvider');
  }
  return ctx;
}

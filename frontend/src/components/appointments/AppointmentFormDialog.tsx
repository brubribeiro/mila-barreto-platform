import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import InventoryIcon from '@mui/icons-material/Inventory2Outlined';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import EventRepeatIcon from '@mui/icons-material/EventRepeat';
import PaymentIcon from '@mui/icons-material/Payment';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import NotesOutlinedIcon from '@mui/icons-material/NotesOutlined';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';

import { appointmentsApi, AppointmentPayload } from '../../api/appointments';
import { formatDateOnlyFromApi } from '../../utils/dateOnly';
import { paymentMethodsApi } from '../../api/paymentMethods';
import { availabilityApi } from '../../api/availability';
import { patientsApi, type PatientReliability } from '../../api/patients';
import { proceduresApi } from '../../api/procedures';
import { usersApi } from '../../api/users';
import { packagesApi } from '../../api/packages';
import { inventoryApi } from '../../api/inventory';
import { useAuth } from '../../contexts/AuthContext';
import { useAppDialog } from '../../contexts/AppDialogContext';
import { usePermissions } from '../../contexts/usePermissions';
import { SendWhatsAppDialog } from '../messages/SendWhatsAppDialog';
import { PatientDetailDrawer } from '../patients/PatientDetailDrawer';
import { varsFromAppointment } from '../../utils/whatsapp';
import {
  computeEarliestRecurrenceDate,
  formatRecurrenceEarliestLabel,
  isDateBeforeRecurrenceEarliest,
} from '../../utils/appointmentRecurrence';
import type { Appointment, AppointmentKind, AppointmentStatus, PatientPackage, Package, PaymentMethodEntry, Procedure } from '../../types';

function selectValueIfListed(value: string, options: { id: string }[]) {
  if (!value) return '';
  return options.some((o) => o.id === value) ? value : '';
}

function invalidateAppointmentListQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({
    predicate: (q) => {
      const root = q.queryKey[0];
      return (
        root === 'appointments' ||
        root === 'appointments-range' ||
        root === 'appointments-week'
      );
    },
  });
}

interface ExtraMaterialRow {
  itemId: string;
  quantity: number;
}

interface AppointmentFormDialogProps {
  open: boolean;
  onClose: () => void;
  appointment?: Appointment | null;
  defaultStart?: Date | null;
}

interface FormValues {
  patientId: string;
  procedureId: string;
  professionalId: string;
  date: string;
  startTime: string;
  status: AppointmentStatus;
  kind: AppointmentKind;
  notes: string;
  clinicalNotes: string;
}

const empty: FormValues = {
  patientId: '',
  procedureId: '',
  professionalId: '',
  date: dayjs().format('YYYY-MM-DD'),
  startTime: '09:00',
  status: 'SCHEDULED',
  kind: 'PROCEDURE',
  notes: '',
  clinicalNotes: '',
};

const statusOptions: { value: AppointmentStatus; label: string }[] = [
  { value: 'SCHEDULED', label: 'Agendado' },
  { value: 'CONFIRMED', label: 'Confirmado' },
  { value: 'IN_PROGRESS', label: 'Em atendimento' },
  { value: 'COMPLETED', label: 'Concluído' },
  { value: 'CANCELLED', label: 'Cancelado' },
  { value: 'NO_SHOW', label: 'Faltou' },
];

const kindOptions: { value: AppointmentKind; label: string }[] = [
  { value: 'EVALUATION', label: 'Avaliação' },
  { value: 'PROCEDURE', label: 'Procedimento' },
  { value: 'RETURN', label: 'Retorno' },
];


function SectionIcon({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 36,
        height: 36,
        borderRadius: 2,
        bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
        color: 'primary.main',
        flexShrink: 0,
      }}
    >
      {children}
    </Box>
  );
}

function AppointmentFormSection({
  title,
  icon,
  children,
  sx,
}: {
  title: string;
  icon: React.ReactNode;
  children: ReactNode;
  sx?: object;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.75,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
        ...sx,
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 1.5 }}>
        <SectionIcon>{icon}</SectionIcon>
        <Typography variant="subtitle1" fontWeight={600} letterSpacing="-0.01em">
          {title}
        </Typography>
      </Stack>
      {children}
    </Paper>
  );
}

export function AppointmentFormDialog({
  open,
  onClose,
  appointment,
  defaultStart,
}: AppointmentFormDialogProps) {
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(muiTheme.breakpoints.down('md'));

  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { confirm, alert } = useAppDialog();
  const { has, restrictToOwnAppointments } = usePermissions();
  const canDelete = has('appointments:delete');
  const canCreate = has('appointments:create');
  const canViewPatient = has('patients:view');

  const { control, handleSubmit, reset, watch, setValue, getValues } = useForm<FormValues>({ defaultValues: empty });
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [pendingReturn, setPendingReturn] = useState<Appointment | null>(null);
  const [returnDate, setReturnDate] = useState('');
  const [returnStartTime, setReturnStartTime] = useState('');
  const [returnCreateError, setReturnCreateError] = useState<string | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [confirmFinishOpen, setConfirmFinishOpen] = useState(false);
  const [pendingFormValues, setPendingFormValues] = useState<FormValues | null>(null);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState('');
  const [extraMaterials, setExtraMaterials] = useState<ExtraMaterialRow[]>([]);
  const [sideTab, setSideTab] = useState<'materials' | 'notes'>('materials');
  const [chartPatientId, setChartPatientId] = useState<string | null>(null);

  const { data: appointmentDetail } = useQuery({
    queryKey: ['appointment', appointment?.id],
    queryFn: () => appointmentsApi.findOne(appointment!.id),
    enabled: open && !!appointment?.id,
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => inventoryApi.list(),
    enabled: open,
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients', ''],
    queryFn: () => patientsApi.list(),
    enabled: open,
  });
  const { data: procedures = [] } = useQuery({
    queryKey: ['procedures'],
    queryFn: () => proceduresApi.list(),
    enabled: open,
  });
  const { data: appointmentProviders = [] } = useQuery({
    queryKey: ['users', 'appointment-providers'],
    queryFn: () => usersApi.listAppointmentProviders(),
    enabled: open,
  });

  const { data: paymentMethods = [] } = useQuery<PaymentMethodEntry[]>({
    queryKey: ['payment-methods'],
    queryFn: () => paymentMethodsApi.list(),
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    if (appointment) {
      reset({
        patientId: appointment.patientId,
        procedureId: appointment.procedureId ?? '',
        professionalId: appointment.professionalId ?? '',
        date: dayjs(appointment.startAt).format('YYYY-MM-DD'),
        startTime: dayjs(appointment.startAt).format('HH:mm'),
        status: appointment.status,
        kind: appointment.kind ?? 'PROCEDURE',
        notes: appointment.notes ?? '',
        clinicalNotes: appointment.clinicalNotes ?? '',
      });
    } else {
      const start = defaultStart ?? new Date();
      const isMidnight = start.getHours() === 0 && start.getMinutes() === 0;
      reset({
        ...empty,
        date: dayjs(start).format('YYYY-MM-DD'),
        startTime: isMidnight ? '09:00' : dayjs(start).format('HH:mm'),
      });
    }
  }, [open, appointment, defaultStart, reset]);

  useEffect(() => {
    if (!open) return;
    const source = appointmentDetail ?? appointment;
    if (source?.extraMaterials?.length) {
      setExtraMaterials(
        source.extraMaterials.map((m) => ({
          itemId: m.itemId,
          quantity: Number(m.quantity),
        })),
      );
    } else if (!appointment) {
      setExtraMaterials([]);
    }
  }, [open, appointment, appointmentDetail]);

  const selectedKind = watch('kind');
  const selectedProcedureId = watch('procedureId');

  useEffect(() => {
    if (!open) return;
    setSideTab(selectedKind === 'PROCEDURE' ? 'materials' : 'notes');
  }, [open, selectedKind]);

  const showMaterialsTab = selectedKind === 'PROCEDURE' && !!selectedProcedureId;
  const activeSideTab = showMaterialsTab ? sideTab : 'notes';

  const selectedStatus = watch('status');
  const selectedPatientId = watch('patientId');
  const selectedDate = watch('date');
  const selectedStartTime = watch('startTime');
  const selectedProfessionalId = watch('professionalId');
  const procedureOptions = useMemo(() => {
    const byId = new Map<string, Procedure>(procedures.map((p) => [p.id, p]));
    const fromAppointment = appointmentDetail?.procedure ?? appointment?.procedure;
    if (fromAppointment?.id && !byId.has(fromAppointment.id)) {
      byId.set(fromAppointment.id, fromAppointment as Procedure);
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [procedures, appointment, appointmentDetail]);
  const selectedProcedure = useMemo(
    () => procedureOptions.find((p) => p.id === selectedProcedureId),
    [procedureOptions, selectedProcedureId],
  );
  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  // ─── Confiabilidade do paciente ───
  const { data: reliability } = useQuery<PatientReliability>({
    queryKey: ['patient-reliability', selectedPatientId],
    queryFn: () => patientsApi.getReliability(selectedPatientId),
    enabled: open && !!selectedPatientId,
  });

  const reliabilityColor = useMemo(() => {
    if (!reliability) return undefined;
    if (reliability.reliabilityPercent >= 80) return 'success' as const;
    if (reliability.reliabilityPercent >= 50) return 'warning' as const;
    return 'error' as const;
  }, [reliability]);

  // ─── Pacotes ───
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [sellDialogOpen, setSellDialogOpen] = useState(false);
  const [sellPackageTarget, setSellPackageTarget] = useState<Package | null>(null);
  const [sellPaymentMethodId, setSellPaymentMethodId] = useState('');
  const [sellTotalPaid, setSellTotalPaid] = useState<number>(0);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [batchPatientPkg, setBatchPatientPkg] = useState<PatientPackage | null>(null);
  const [batchCreating, setBatchCreating] = useState(false);
  const [batchSessions, setBatchSessions] = useState<{ date: string; startTime: string }[]>([]);

  // Pacotes ativos do paciente
  const { data: activePatientPackages = [] } = useQuery({
    queryKey: ['patient-packages-active', selectedPatientId],
    queryFn: () => packagesApi.listActiveForPatient(selectedPatientId),
    enabled: open && !!selectedPatientId,
  });

  const { data: recurrenceLimit } = useQuery({
    queryKey: ['appointment-recurrence-limit', selectedPatientId, selectedProcedureId, appointment?.id],
    queryFn: () =>
      appointmentsApi.getRecurrenceLimit(
        selectedPatientId,
        selectedProcedureId,
        appointment?.id,
      ),
    enabled:
      open &&
      !!selectedPatientId &&
      !!selectedProcedureId &&
      selectedKind === 'PROCEDURE',
  });

  const recurrenceEarliestDate = recurrenceLimit?.earliestDate ?? null;

  // Inicializar sessões editáveis quando o dialog de lote abre
  useEffect(() => {
    if (!batchDialogOpen || !batchPatientPkg || !selectedProcedure?.recurrenceDays) {
      return;
    }
    const remaining = batchPatientPkg.sessionsTotal - batchPatientPkg.sessionsUsed;
    const baseDate = dayjs(`${selectedDate}T${selectedStartTime}`);
    const sessions = Array.from({ length: remaining }, (_, i) => {
      const sessionDate = baseDate.add(i * selectedProcedure.recurrenceDays!, 'day');
      return {
        date: sessionDate.format('YYYY-MM-DD'),
        startTime: sessionDate.format('HH:mm'),
      };
    });
    setBatchSessions(sessions);
  }, [batchDialogOpen, batchPatientPkg, selectedProcedure?.recurrenceDays, selectedDate, selectedStartTime]);

  // Pacotes do catálogo que contêm o procedimento selecionado
  const { data: allCatalogPackages = [] } = useQuery({
    queryKey: ['packages'],
    queryFn: () => packagesApi.list(),
    enabled: open,
  });

  // Filtrar: pacotes ativos do paciente que contêm o procedimento selecionado
  const filteredPatientPackages = useMemo(() => {
    if (!selectedProcedureId) return [];
    return activePatientPackages.filter((pp) =>
      pp.package?.items?.some((item) => item.procedureId === selectedProcedureId),
    );
  }, [activePatientPackages, selectedProcedureId]);

  // Pacotes do catálogo que contêm o procedimento e que o paciente NÃO possui ativos
  const availableCatalogPackages = useMemo(() => {
    if (!selectedProcedureId) return [];
    const activePackageIds = new Set(activePatientPackages.map((pp) => pp.packageId));
    return allCatalogPackages.filter(
      (pkg) =>
        pkg.active &&
        pkg.items?.some((item) => item.procedureId === selectedProcedureId) &&
        !activePackageIds.has(pkg.id),
    );
  }, [allCatalogPackages, selectedProcedureId, activePatientPackages]);

  // Resetar seleção de pacote quando paciente ou procedimento muda
  useEffect(() => {
    if (appointment?.patientPackageId) {
      setSelectedPackageId(appointment.patientPackageId);
    } else {
      setSelectedPackageId('');
    }
  }, [selectedPatientId, selectedProcedureId, appointment?.patientPackageId]);

  const selectedPatientPkg = useMemo(
    () => filteredPatientPackages.find((pp) => pp.id === selectedPackageId),
    [filteredPatientPackages, selectedPackageId],
  );

  const paymentAmountOnComplete = useMemo(() => {
    if (selectedPatientPkg && selectedPackageId && !selectedPatientPkg.financeGenerated) {
      return Number(selectedPatientPkg.totalPaid);
    }
    if (selectedProcedure?.price) return Number(selectedProcedure.price);
    return 0;
  }, [selectedPatientPkg, selectedPackageId, selectedProcedure]);

  const needsPaymentOnComplete = useCallback(
    (values: FormValues) => {
      if (!appointment || appointment.status === 'COMPLETED') return false;
      if (values.status !== 'COMPLETED' || values.kind !== 'PROCEDURE' || !values.procedureId) {
        return false;
      }
      if (selectedPackageId && selectedPatientPkg) {
        return !selectedPatientPkg.financeGenerated;
      }
      return !appointment.financeGenerated;
    },
    [appointment, selectedPackageId, selectedPatientPkg],
  );

  const brl = useMemo(
    () => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }),
    [],
  );

  const slotStart = useMemo(
    () => dayjs(`${selectedDate}T${selectedStartTime}`),
    [selectedDate, selectedStartTime],
  );
  const slotEnd = useMemo(
    () => slotStart.add(selectedProcedure?.durationMinutes ?? 60, 'minute'),
    [slotStart, selectedProcedure?.durationMinutes],
  );
  const slotValid = slotStart.isValid() && slotEnd.isValid() && slotEnd.isAfter(slotStart);

  const { data: availableProfessionals = [], isLoading: loadingProfessionals } = useQuery({
    queryKey: [
      'available-professionals',
      selectedDate,
      selectedStartTime,
      selectedProcedure?.durationMinutes ?? 60,
      appointment?.id,
    ],
    queryFn: () =>
      availabilityApi.listAvailableProfessionals(
        slotStart.toISOString(),
        slotEnd.toISOString(),
        appointment?.id,
      ),
    enabled: open && slotValid,
  });

  const professionalOptions = useMemo(() => {
    const byId = new Map<string, { id: string; name: string }>();
    for (const p of availableProfessionals) byId.set(p.id, p);

    const fallbacks = [appointmentDetail?.professional, appointment?.professional];
    for (const p of fallbacks) {
      if (p?.id && !byId.has(p.id)) byId.set(p.id, p);
    }

    if (selectedProfessionalId) {
      const fromProviders = appointmentProviders.find((p) => p.id === selectedProfessionalId);
      if (fromProviders && !byId.has(fromProviders.id)) byId.set(fromProviders.id, fromProviders);
    }

    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [
    availableProfessionals,
    appointment,
    appointmentDetail,
    selectedProfessionalId,
    appointmentProviders,
  ]);

  const assignedProfessional = useMemo(() => {
    if (appointment?.professional) return appointment.professional;
    const id = selectedProfessionalId;
    if (!id) return undefined;
    return (
      appointmentProviders.find((p) => p.id === id) ??
      availableProfessionals.find((p) => p.id === id)
    );
  }, [appointment?.professional, selectedProfessionalId, appointmentProviders, availableProfessionals]);

  const selectedPerformsAppointments = useMemo(() => {
    if (!selectedProfessionalId) return false;
    return appointmentProviders.some((p) => p.id === selectedProfessionalId);
  }, [selectedProfessionalId, appointmentProviders]);

  const loggedUserCannotBeScheduled =
    !!restrictToOwnAppointments && !!user && user.providesAppointments === false;

  useEffect(() => {
    if (!open || appointment) return;

    if (restrictToOwnAppointments && user) {
      if (loggedUserCannotBeScheduled) {
        setValue('professionalId', '');
        return;
      }
      if (!slotValid || loadingProfessionals) return;
      if (availableProfessionals.some((p) => p.id === user.id)) {
        setValue('professionalId', user.id);
      } else {
        setValue('professionalId', '');
      }
      return;
    }

    if (!slotValid || loadingProfessionals) return;

    if (availableProfessionals.length === 0) {
      setValue('professionalId', '');
      return;
    }

    const currentStillAvailable = availableProfessionals.some(
      (p) => p.id === selectedProfessionalId,
    );
    if (!selectedProfessionalId || !currentStillAvailable) {
      setValue('professionalId', availableProfessionals[0].id);
    }
  }, [
    open,
    appointment,
    restrictToOwnAppointments,
    user,
    slotValid,
    loadingProfessionals,
    availableProfessionals,
    selectedProfessionalId,
    loggedUserCannotBeScheduled,
    setValue,
  ]);

  const noProfessionalAvailable =
    !appointment &&
    slotValid &&
    !loadingProfessionals &&
    !loggedUserCannotBeScheduled &&
    !selectedProfessionalId;

  const timeOrProfessionalChanged = useMemo(() => {
    if (!appointment) return true;
    const start = dayjs(`${selectedDate}T${selectedStartTime}`);
    const duration = selectedProcedure?.durationMinutes ?? 60;
    const end = start.add(duration, 'minute');
    return (
      !start.isSame(appointment.startAt) ||
      !end.isSame(appointment.endAt) ||
      selectedProfessionalId !== appointment.professionalId
    );
  }, [
    appointment,
    selectedDate,
    selectedStartTime,
    selectedProcedure?.durationMinutes,
    selectedProfessionalId,
  ]);

  const scheduleSlotBlocked =
    slotValid &&
    !loadingProfessionals &&
    !!selectedProfessionalId &&
    !availableProfessionals.some((p) => p.id === selectedProfessionalId);

  const requiresValidProvider = !appointment || timeOrProfessionalChanged;

  const professionalSlotConflict =
    (scheduleSlotBlocked && timeOrProfessionalChanged) ||
    (requiresValidProvider && !!selectedProfessionalId && !selectedPerformsAppointments);

  const willDeductMaterials =
    selectedStatus === 'SCHEDULED' ||
    selectedStatus === 'CONFIRMED' ||
    selectedStatus === 'IN_PROGRESS' ||
    selectedStatus === 'COMPLETED';

  const materials = selectedProcedure?.materials ?? [];

  const effectiveAvailable = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of inventory) {
      map.set(item.id, Number(item.quantity));
    }
    const source = appointmentDetail ?? appointment;
    if (source?.materialsDeducted) {
      for (const m of materials) {
        map.set(m.itemId, (map.get(m.itemId) ?? 0) + Number(m.quantity));
      }
      for (const m of source.extraMaterials ?? []) {
        map.set(m.itemId, (map.get(m.itemId) ?? 0) + Number(m.quantity));
      }
    }
    return map;
  }, [inventory, appointment, appointmentDetail, materials]);

  const totalMaterialNeed = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of materials) {
      map.set(m.itemId, (map.get(m.itemId) ?? 0) + Number(m.quantity));
    }
    for (const extra of extraMaterials) {
      if (!extra.itemId || extra.quantity <= 0) continue;
      map.set(extra.itemId, (map.get(extra.itemId) ?? 0) + Number(extra.quantity));
    }
    return map;
  }, [materials, extraMaterials]);

  const hasInsufficient = useMemo(() => {
    for (const [itemId, needed] of totalMaterialNeed) {
      const available = effectiveAvailable.get(itemId);
      if (available !== undefined && available < needed) return true;
    }
    return false;
  }, [totalMaterialNeed, effectiveAvailable]);

  const normalizedExtraMaterials = useMemo(
    () =>
      extraMaterials.filter((m) => m.itemId && m.quantity > 0).map((m) => ({
        itemId: m.itemId,
        quantity: Number(m.quantity),
      })),
    [extraMaterials],
  );

  const deleteMutation = useMutation({
    mutationFn: (id: string) => appointmentsApi.remove(id),
    onSuccess: () => {
      invalidateAppointmentListQueries(queryClient);
      onClose();
    },
  });

  // ─── Controle de tempo de atendimento ───
  const isInProgress = appointmentDetail?.status === 'IN_PROGRESS' || appointment?.status === 'IN_PROGRESS';
  const hasStartedAt = !!(appointmentDetail?.startedAt ?? appointment?.startedAt);
  const hasFinishedAt = !!(appointmentDetail?.finishedAt ?? appointment?.finishedAt);
  const canStartSession =
    appointment &&
    (appointment.status === 'SCHEDULED' || appointment.status === 'CONFIRMED') &&
    !hasStartedAt;
  const canFinishSession = isInProgress;
  const showSessionControls =
    !!appointment && (canStartSession || isInProgress || hasStartedAt);

  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback((startedAt: string) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const calc = () => Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
    setElapsed(calc());
    timerRef.current = setInterval(() => setElapsed(calc()), 1000);
  }, []);

  useEffect(() => {
    if (!open) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      return;
    }
    const detail = appointmentDetail ?? appointment;
    if (detail?.startedAt && !detail?.finishedAt) {
      startTimer(detail.startedAt);
    } else if (detail?.startedAt && detail?.finishedAt) {
      setElapsed(Math.floor((new Date(detail.finishedAt).getTime() - new Date(detail.startedAt).getTime()) / 1000));
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [open, appointmentDetail, appointment, startTimer]);

  const formatElapsed = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const startMutation = useMutation({
    mutationFn: () => appointmentsApi.start(appointment!.id),
    onSuccess: (saved) => {
      invalidateAppointmentListQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ['appointment', saved.id] });
      if (saved.startedAt) startTimer(saved.startedAt);
      setValue('status', 'IN_PROGRESS');
    },
  });

  const pauseMutation = useMutation({
    mutationFn: () => appointmentsApi.finish(appointment!.id),
    onSuccess: (saved) => {
      if (timerRef.current) clearInterval(timerRef.current);
      invalidateAppointmentListQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ['appointment', saved.id] });
    },
  });

  const stopTimerIfRunning = useCallback(async () => {
    if (!appointment) return;
    const detail = appointmentDetail ?? appointment;
    if (detail.status === 'IN_PROGRESS' && !detail.finishedAt) {
      await appointmentsApi.finish(appointment.id);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [appointment, appointmentDetail]);

  const resumeMutation = useMutation({
    mutationFn: () => appointmentsApi.resume(appointment!.id),
    onSuccess: (saved) => {
      invalidateAppointmentListQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ['appointment', saved.id] });
      if (saved.startedAt) startTimer(saved.startedAt);
    },
  });

  const mutation = useMutation({
    mutationFn: ({ values, paymentMethodId }: { values: FormValues; paymentMethodId?: string }) => {
      const start = dayjs(`${values.date}T${values.startTime}`);
      const duration = selectedProcedure?.durationMinutes ?? 60;
      const end = start.add(duration, 'minute');

      // Procedure só vai no payload quando kind === PROCEDURE
      const procedureIdForPayload =
        values.kind === 'PROCEDURE' ? values.procedureId : undefined;
      const payload: AppointmentPayload = {
        patientId: values.patientId,
        procedureId: procedureIdForPayload,
        professionalId: values.professionalId,
        startAt: start.toISOString(),
        endAt: end.toISOString(),
        status: appointment ? values.status : 'SCHEDULED',
        kind: values.kind,
        ...(values.notes ? { notes: values.notes } : {}),
        ...(values.clinicalNotes ? { clinicalNotes: values.clinicalNotes } : {}),
        ...(paymentMethodId ? { paymentMethodId } : {}),
        patientPackageId: selectedPackageId || null,
        extraMaterials: normalizedExtraMaterials,
      };
      return appointment
        ? appointmentsApi.update(appointment.id, payload)
        : appointmentsApi.create(payload);
    },
    onSuccess: (saved) => {
      invalidateAppointmentListQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      queryClient.invalidateQueries({ queryKey: ['patient-packages-active'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['appointment', saved.id] });
      queryClient.invalidateQueries({ queryKey: ['patient', saved.patientId] });
      // Se acabou de ser marcado como COMPLETED, pergunta se quer agendar retorno
      const wasNotCompleted = appointment?.status !== 'COMPLETED';
      const isNowCompleted = saved.status === 'COMPLETED';
      if (
        wasNotCompleted &&
        isNowCompleted &&
        canCreate &&
        saved.kind === 'PROCEDURE' &&
        saved.procedureId
      ) {
        setPendingReturn({
          ...(saved as Appointment),
          professionalId:
            saved.professionalId ?? saved.professional?.id ?? getValues().professionalId,
          procedureId: saved.procedureId ?? saved.procedure?.id ?? getValues().procedureId,
        });
        setReturnCreateError(null);
        setReturnDialogOpen(true);
      } else {
        onClose();
      }
    },
  });

  const handleConfirmFinishSession = async () => {
    setConfirmFinishOpen(false);
    if (!appointment) return;

    await stopTimerIfRunning();

    const values: FormValues = { ...getValues(), status: 'COMPLETED' };
    setValue('status', 'COMPLETED');

    const needsPayment = needsPaymentOnComplete(values);

    if (needsPayment) {
      setPendingFormValues(values);
      setSelectedPaymentMethodId('');
      setPaymentDialogOpen(true);
      return;
    }

    mutation.mutate({ values });
  };

  /** Intercepta o submit: se está concluindo com procedimento, mostra diálogo de pagamento */
  const onSubmit = (values: FormValues) => {
    if (!appointmentProviders.some((p) => p.id === values.professionalId)) {
      return;
    }

    const isCompleting = needsPaymentOnComplete(values);

    if (isCompleting) {
      setPendingFormValues(values);
      setSelectedPaymentMethodId('');
      setPaymentDialogOpen(true);
    } else {
      mutation.mutate({ values });
    }
  };

  const confirmPaymentAndSave = async () => {
    if (!pendingFormValues) return;
    await stopTimerIfRunning();
    mutation.mutate({
      values: pendingFormValues,
      paymentMethodId: selectedPaymentMethodId || undefined,
    });
    setPaymentDialogOpen(false);
    setPendingFormValues(null);
  };

  const pendingReturnProcedure = useMemo(() => {
    if (!pendingReturn) return undefined;
    return (
      pendingReturn.procedure ??
      procedures.find((p) => p.id === pendingReturn.procedureId) ??
      selectedProcedure
    );
  }, [pendingReturn, procedures, selectedProcedure]);

  const returnMinDate = useMemo(() => {
    if (!pendingReturn || !pendingReturnProcedure?.recurrenceDays) return null;
    return computeEarliestRecurrenceDate(
      pendingReturn.startAt,
      pendingReturnProcedure.recurrenceDays,
    );
  }, [pendingReturn, pendingReturnProcedure]);

  const returnDateTooEarly =
    !!returnMinDate &&
    !!returnDate &&
    isDateBeforeRecurrenceEarliest(returnDate, returnMinDate);

  const returnDateTime = useMemo(
    () => (returnDate && returnStartTime ? dayjs(`${returnDate}T${returnStartTime}`) : null),
    [returnDate, returnStartTime],
  );

  const returnProfessionalId = useMemo(
    () => pendingReturn?.professionalId ?? pendingReturn?.professional?.id ?? '',
    [pendingReturn],
  );

  const returnSlotEnd = useMemo(
    () =>
      returnDateTime?.isValid()
        ? returnDateTime.add(pendingReturnProcedure?.durationMinutes ?? 60, 'minute')
        : null,
    [returnDateTime, pendingReturnProcedure?.durationMinutes],
  );

  const returnSlotValid =
    !!returnDateTime?.isValid() &&
    !!returnSlotEnd?.isValid() &&
    returnSlotEnd.isAfter(returnDateTime);

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
    enabled: returnDialogOpen && returnSlotValid,
  });

  const returnProfessionalAvailable = useMemo(() => {
    if (!returnProfessionalId || !returnSlotValid) return false;
    if (loadingReturnAvailability) return true;
    return returnAvailableProfessionals.some((p) => p.id === returnProfessionalId);
  }, [
    returnProfessionalId,
    returnSlotValid,
    loadingReturnAvailability,
    returnAvailableProfessionals,
  ]);

  const closeReturnDialog = useCallback(() => {
    setReturnDialogOpen(false);
    setPendingReturn(null);
    setReturnDate('');
    setReturnStartTime('');
    setReturnCreateError(null);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!returnDialogOpen || !pendingReturn) return;
    const procedure =
      pendingReturn.procedure ??
      procedures.find((p) => p.id === pendingReturn.procedureId);
    const suggested = procedure?.recurrenceDays
      ? dayjs(pendingReturn.startAt).add(procedure.recurrenceDays, 'day')
      : dayjs(pendingReturn.startAt).add(7, 'day');
    setReturnDate(suggested.format('YYYY-MM-DD'));
    setReturnStartTime(suggested.format('HH:mm'));
  }, [returnDialogOpen, pendingReturn, procedures]);

  const createReturnMutation = useMutation({
    mutationFn: async () => {
      if (!pendingReturn || !returnDate || !returnStartTime) return;
      const procedureForReturn =
        pendingReturn.procedure ??
        procedures.find((p) => p.id === pendingReturn.procedureId) ??
        selectedProcedure;
      const professionalId =
        pendingReturn.professionalId ?? pendingReturn.professional?.id;
      const procedureId = pendingReturn.procedureId ?? pendingReturn.procedure?.id;
      if (!professionalId || !procedureId) {
        throw new Error('Dados do atendimento incompletos para agendar o retorno.');
      }
      const returnStart = dayjs(`${returnDate}T${returnStartTime}`);
      if (!returnStart.isValid()) {
        throw new Error('Data ou horário do retorno inválido.');
      }
      if (
        returnMinDate &&
        isDateBeforeRecurrenceEarliest(returnDate, returnMinDate)
      ) {
        throw new Error(
          `Retorno só pode ser agendado a partir de ${formatRecurrenceEarliestLabel(returnMinDate)}.`,
        );
      }
      const durationMinutes = procedureForReturn?.durationMinutes ?? 60;
      const start = returnStart.toISOString();
      const end = returnStart.add(durationMinutes, 'minute').toISOString();
      return appointmentsApi.create({
        patientId: pendingReturn.patientId,
        procedureId,
        professionalId,
        startAt: start,
        endAt: end,
        status: 'SCHEDULED',
        kind: 'RETURN',
        notes: procedureForReturn?.recurrenceDays
          ? 'Retorno automático sugerido'
          : 'Retorno agendado manualmente',
      });
    },
    onSuccess: () => {
      invalidateAppointmentListQueries(queryClient);
      closeReturnDialog();
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (err instanceof Error ? err.message : null) ??
        'Não foi possível agendar o retorno.';
      setReturnCreateError(message);
    },
  });

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="xl"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            maxWidth: isMobile ? '100%' : 1280,
            width: '100%',
            maxHeight: isMobile ? '100%' : '92vh',
            borderRadius: isMobile ? 0 : 3,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        <Box
          component="form"
          onSubmit={handleSubmit(onSubmit)}
          sx={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}
        >
          <DialogTitle
            sx={{
              px: { xs: 2, sm: 3 },
              pt: { xs: 1.5, sm: 2.5 },
              pb: { xs: 1.5, sm: 2 },
              flexShrink: 0,
              borderBottom: 1,
              borderColor: 'divider',
              bgcolor: 'background.paper',
            }}
          >
            <Stack spacing={isMobile ? 1.5 : 0}>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                spacing={1}
              >
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
                  {isMobile && (
                    <IconButton edge="start" onClick={onClose} aria-label="Fechar" size="small">
                      <CloseIcon />
                    </IconButton>
                  )}
                  {!isMobile && (
                    <SectionIcon>
                      <EventAvailableOutlinedIcon fontSize="small" />
                    </SectionIcon>
                  )}
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant={isMobile ? 'subtitle1' : 'h6'} fontWeight={600} noWrap>
                      {appointment ? 'Editar agendamento' : 'Novo agendamento'}
                    </Typography>
                    {!isMobile && (
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {selectedPatient
                          ? `${selectedPatient.name}${slotValid ? ` · ${dayjs(selectedDate).format('DD/MM/YYYY')} às ${selectedStartTime}` : ''}`
                          : 'Preencha os dados para reservar o horário'}
                      </Typography>
                    )}
                  </Box>
                </Stack>

                {/* Status selector — sempre visível no header quando editando */}
                {appointment && !isMobile && (
                  <Stack direction="row" spacing={1.5} alignItems="center" flexShrink={0}>
                    {(isInProgress || hasStartedAt) && (
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.75,
                          px: 1.5,
                          py: 0.5,
                          borderRadius: 2,
                          bgcolor: isInProgress && !hasFinishedAt
                            ? (theme) => alpha(theme.palette.success.main, 0.1)
                            : (theme) => alpha(theme.palette.grey[500], 0.1),
                          border: '1px solid',
                          borderColor: isInProgress && !hasFinishedAt
                            ? (theme) => alpha(theme.palette.success.main, 0.3)
                            : 'divider',
                        }}
                      >
                        <TimerOutlinedIcon
                          fontSize="small"
                          sx={{ color: isInProgress && !hasFinishedAt ? 'success.main' : 'text.secondary' }}
                        />
                        <Typography
                          variant="h6"
                          fontWeight={700}
                          sx={{
                            fontVariantNumeric: 'tabular-nums',
                            color: isInProgress && !hasFinishedAt ? 'success.main' : 'text.primary',
                          }}
                        >
                          {formatElapsed(elapsed)}
                        </Typography>
                      </Box>
                    )}

                    {showSessionControls && (
                      <>
                        <Box sx={{ width: 116, flexShrink: 0 }}>
                          {canStartSession && !isInProgress && !hasFinishedAt ? (
                            <Button
                              variant="contained"
                              color="primary"
                              size="small"
                              fullWidth
                              startIcon={<PlayArrowIcon />}
                              disabled={startMutation.isPending}
                              onClick={() => startMutation.mutate()}
                              sx={{ whiteSpace: 'nowrap' }}
                            >
                              {startMutation.isPending ? 'Iniciando...' : 'Iniciar'}
                            </Button>
                          ) : isInProgress && !hasFinishedAt ? (
                            <Button
                              variant="outlined"
                              color="inherit"
                              size="small"
                              fullWidth
                              startIcon={<PauseIcon />}
                              disabled={pauseMutation.isPending}
                              onClick={() => pauseMutation.mutate()}
                              sx={{ whiteSpace: 'nowrap' }}
                            >
                              {pauseMutation.isPending ? 'Pausando...' : 'Pausar'}
                            </Button>
                          ) : hasFinishedAt && isInProgress ? (
                            <Button
                              variant="outlined"
                              color="primary"
                              size="small"
                              fullWidth
                              startIcon={<PlayArrowIcon />}
                              disabled={resumeMutation.isPending}
                              onClick={() => resumeMutation.mutate()}
                              sx={{ whiteSpace: 'nowrap' }}
                            >
                              {resumeMutation.isPending ? 'Retomando...' : 'Retomar'}
                            </Button>
                          ) : null}
                        </Box>
                        <Box sx={{ width: 116, flexShrink: 0 }}>
                          <Button
                            variant="contained"
                            color="success"
                            size="small"
                            fullWidth
                            startIcon={<CheckCircleOutlineIcon />}
                            disabled={!canFinishSession || mutation.isPending}
                            onClick={() => setConfirmFinishOpen(true)}
                            sx={{ whiteSpace: 'nowrap' }}
                          >
                            Finalizar
                          </Button>
                        </Box>
                      </>
                    )}

                    <Controller
                      name="status"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          select
                          label="Status"
                          size="small"
                          sx={{ minWidth: 180, flexShrink: 0 }}
                        >
                          {statusOptions.map((opt) => (
                            <MenuItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </MenuItem>
                          ))}
                        </TextField>
                      )}
                    />
                  </Stack>
                )}
              </Stack>

              {/* Mobile: controles de sessão e status em linha separada */}
              {appointment && isMobile && (
                <Stack spacing={1}>
                  <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    {(isInProgress || hasStartedAt) && (
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                          px: 1,
                          py: 0.35,
                          borderRadius: 1.5,
                          bgcolor: isInProgress && !hasFinishedAt
                            ? (theme) => alpha(theme.palette.success.main, 0.1)
                            : (theme) => alpha(theme.palette.grey[500], 0.1),
                          border: '1px solid',
                          borderColor: isInProgress && !hasFinishedAt
                            ? (theme) => alpha(theme.palette.success.main, 0.3)
                            : 'divider',
                        }}
                      >
                        <TimerOutlinedIcon sx={{ fontSize: 16, color: isInProgress && !hasFinishedAt ? 'success.main' : 'text.secondary' }} />
                        <Typography variant="body2" fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums', color: isInProgress && !hasFinishedAt ? 'success.main' : 'text.primary' }}>
                          {formatElapsed(elapsed)}
                        </Typography>
                      </Box>
                    )}
                    {showSessionControls && (
                      <>
                        {canStartSession && !isInProgress && !hasFinishedAt && (
                          <Button variant="contained" color="primary" size="small" startIcon={<PlayArrowIcon />} disabled={startMutation.isPending} onClick={() => startMutation.mutate()}>
                            Iniciar
                          </Button>
                        )}
                        {isInProgress && !hasFinishedAt && (
                          <Button variant="outlined" color="inherit" size="small" startIcon={<PauseIcon />} disabled={pauseMutation.isPending} onClick={() => pauseMutation.mutate()}>
                            Pausar
                          </Button>
                        )}
                        {hasFinishedAt && isInProgress && (
                          <Button variant="outlined" color="primary" size="small" startIcon={<PlayArrowIcon />} disabled={resumeMutation.isPending} onClick={() => resumeMutation.mutate()}>
                            Retomar
                          </Button>
                        )}
                        <Button variant="contained" color="success" size="small" startIcon={<CheckCircleOutlineIcon />} disabled={!canFinishSession || mutation.isPending} onClick={() => setConfirmFinishOpen(true)}>
                          Finalizar
                        </Button>
                      </>
                    )}
                  </Stack>
                  <Controller
                    name="status"
                    control={control}
                    render={({ field }) => (
                      <TextField {...field} select label="Status" size="small" fullWidth>
                        {statusOptions.map((opt) => (
                          <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                        ))}
                      </TextField>
                    )}
                  />
                </Stack>
              )}
            </Stack>
          </DialogTitle>

          <DialogContent
            sx={{
              px: { xs: 1.5, sm: 3 },
              pb: 2,
              bgcolor: 'grey.50',
              flex: 1,
              minHeight: 0,
              overflow: isMobile ? 'auto' : 'hidden',
              display: 'flex',
              flexDirection: 'column',
              '&&': {
                pt: { xs: 1.5, sm: 2.5 },
              },
            }}
          >
            <Grid container spacing={{ xs: 1.5, sm: 2.5 }} sx={{ flex: 1, minHeight: 0, alignItems: 'stretch' }}>
              <Grid
                item
                xs={12}
                lg={6}
                sx={{ display: 'flex', flexDirection: 'column', flex: { xs: '0 0 auto', lg: 1 }, minHeight: 0 }}
              >
                <Stack spacing={2} sx={{ flex: 1, minHeight: 0 }}>
                  <AppointmentFormSection title="Paciente e atendimento" icon={<PersonOutlineIcon fontSize="small" />}>
                    <Stack spacing={2}>
                      <Controller
                        name="patientId"
                        control={control}
                        rules={{ required: 'Selecione um paciente' }}
                        render={({ field, fieldState }) => (
                          <Stack direction="row" spacing={1} alignItems="flex-start">
                            <Autocomplete
                              sx={{ flex: 1 }}
                              options={patients}
                              getOptionLabel={(p) => p.name}
                              value={patients.find((p) => p.id === field.value) ?? null}
                              onChange={(_, val) => field.onChange(val?.id ?? '')}
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  label="Paciente"
                                  required
                                  error={!!fieldState.error}
                                  helperText={fieldState.error?.message}
                                />
                              )}
                            />
                            {canViewPatient && field.value && (
                              <Tooltip title="Ver ficha da paciente">
                                <IconButton
                                  onClick={() => setChartPatientId(field.value)}
                                  sx={{ mt: 0.75 }}
                                  color="primary"
                                  aria-label="Ver ficha da paciente"
                                >
                                  <DescriptionOutlinedIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Stack>
                        )}
                      />

                      {reliability && reliability.total >= 3 && (
                        <Tooltip
                          title={`${reliability.completed} concluído(s), ${reliability.cancelled} cancelamento(s), ${reliability.noShow} falta(s) em ${reliability.total} agendamentos`}
                        >
                          <Chip
                            size="small"
                            variant="outlined"
                            color={reliabilityColor}
                            label={`Confiabilidade: ${reliability.reliabilityPercent}%`}
                            sx={{ alignSelf: 'flex-start' }}
                          />
                        </Tooltip>
                      )}

                      <Controller
                        name="kind"
                        control={control}
                        render={({ field }) => (
                          <ToggleButtonGroup
                            exclusive
                            fullWidth
                            value={field.value}
                            onChange={(_, val) => val && field.onChange(val)}
                            size="small"
                          >
                            {kindOptions.map((opt) => (
                              <ToggleButton key={opt.value} value={opt.value} sx={{ flex: 1, py: 0.85 }}>
                                {opt.label}
                              </ToggleButton>
                            ))}
                          </ToggleButtonGroup>
                        )}
                      />

                      {watch('kind') === 'PROCEDURE' && (
                        <>
                          <Controller
                            name="procedureId"
                            control={control}
                            rules={{ required: 'Selecione um procedimento' }}
                            render={({ field, fieldState }) => (
                              <TextField
                                {...field}
                                value={selectValueIfListed(field.value, procedureOptions)}
                                onChange={field.onChange}
                                select
                                label="Procedimento"
                                fullWidth
                                required
                                error={!!fieldState.error}
                                helperText={fieldState.error?.message}
                              >
                                {procedureOptions.map((p) => (
                                  <MenuItem key={p.id} value={p.id}>
                                    {p.name}
                                  </MenuItem>
                                ))}
                              </TextField>
                            )}
                          />
                          {selectedProcedure && (
                            <Stack direction="row" flexWrap="wrap" gap={0.75}>
                              <Chip
                                size="small"
                                variant="outlined"
                                label={`${selectedProcedure.durationMinutes} min`}
                              />
                              <Chip
                                size="small"
                                variant="outlined"
                                label={`Retorno: ${selectedProcedure.recurrenceDays ?? '—'} dias`}
                              />
                              {selectedProcedure.price != null && (
                                <Chip
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                  label={brl.format(Number(selectedProcedure.price))}
                                />
                              )}
                            </Stack>
                          )}
                        </>
                      )}
                    </Stack>
                  </AppointmentFormSection>

                  <AppointmentFormSection title="Data e profissional" icon={<ScheduleOutlinedIcon fontSize="small" />}>
                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        {restrictToOwnAppointments ? (
                          <TextField
                            label="Profissional"
                            value={
                              loadingProfessionals && slotValid
                                ? 'Verificando disponibilidade...'
                                : (assignedProfessional?.name ?? user?.name ?? '—')
                            }
                            fullWidth
                            InputProps={{ readOnly: true }}
                            helperText={
                              loggedUserCannotBeScheduled
                                ? 'Seu usuário não realiza atendimentos'
                                : professionalSlotConflict
                                  ? 'Este profissional já possui agendamento neste horário'
                                  : noProfessionalAvailable
                                    ? 'Nenhum profissional disponível neste horário'
                                    : 'Agendamento vinculado ao seu usuário'
                            }
                            error={
                              loggedUserCannotBeScheduled ||
                              noProfessionalAvailable ||
                              professionalSlotConflict
                            }
                          />
                        ) : (
                          <Controller
                            name="professionalId"
                            control={control}
                            rules={{ required: 'Selecione um profissional' }}
                            render={({ field, fieldState }) => (
                              <TextField
                                {...field}
                                value={selectValueIfListed(field.value, professionalOptions)}
                                onChange={field.onChange}
                                select
                                label="Profissional"
                                fullWidth
                                required
                                disabled={!slotValid || (loadingProfessionals && professionalOptions.length === 0)}
                                error={
                                  !!fieldState.error ||
                                  noProfessionalAvailable ||
                                  professionalSlotConflict
                                }
                                helperText={
                                  fieldState.error?.message ??
                                  (professionalSlotConflict && !selectedPerformsAppointments
                                    ? 'Selecione um profissional que realiza atendimentos'
                                    : professionalSlotConflict
                                      ? 'Este profissional já possui agendamento neste horário'
                                      : noProfessionalAvailable
                                        ? 'Nenhum profissional disponível neste horário'
                                        : loadingProfessionals && slotValid && professionalOptions.length === 0
                                          ? 'Verificando disponibilidade...'
                                          : 'Somente profissionais que realizam atendimentos')
                                }
                              >
                                {loadingProfessionals && slotValid && professionalOptions.length === 0 ? (
                                  <MenuItem disabled value="">
                                    Verificando disponibilidade...
                                  </MenuItem>
                                ) : professionalOptions.length === 0 ? (
                                  <MenuItem disabled value="">
                                    Nenhum profissional disponível
                                  </MenuItem>
                                ) : (
                                  professionalOptions.map((p) => (
                                    <MenuItem key={p.id} value={p.id}>
                                      {p.name}
                                    </MenuItem>
                                  ))
                                )}
                              </TextField>
                            )}
                          />
                        )}
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Controller
                          name="date"
                          control={control}
                          rules={{
                            required: true,
                            validate: (value) => {
                              if (!recurrenceEarliestDate) return true;
                              if (isDateBeforeRecurrenceEarliest(value, recurrenceEarliestDate)) {
                                return `Agende a partir de ${formatRecurrenceEarliestLabel(recurrenceEarliestDate)}`;
                              }
                              return true;
                            },
                          }}
                          render={({ field, fieldState }) => (
                            <TextField
                              {...field}
                              type="date"
                              label="Data"
                              fullWidth
                              required
                              InputLabelProps={{ shrink: true }}
                              inputProps={{
                                min: recurrenceEarliestDate ?? undefined,
                              }}
                              error={!!fieldState.error}
                              helperText={
                                fieldState.error?.message ??
                                (recurrenceEarliestDate && recurrenceLimit?.recurrenceDays
                                  ? `Retorno em ${recurrenceLimit.recurrenceDays} dias — a partir de ${formatRecurrenceEarliestLabel(recurrenceEarliestDate)}`
                                  : undefined)
                              }
                            />
                          )}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Controller
                          name="startTime"
                          control={control}
                          rules={{ required: true }}
                          render={({ field }) => (
                            <TextField
                              {...field}
                              type="time"
                              label="Horário"
                              fullWidth
                              required
                              InputLabelProps={{ shrink: true }}
                            />
                          )}
                        />
                      </Grid>
                    </Grid>

                    {slotValid && (
                      <Box
                        sx={{
                          mt: 2,
                          px: 1.5,
                          py: 1,
                          borderRadius: 2,
                          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.06),
                          border: '1px solid',
                          borderColor: (theme) => alpha(theme.palette.primary.main, 0.18),
                        }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          Término previsto:{' '}
                          <Typography component="span" variant="body2" fontWeight={600} color="text.primary">
                            {slotEnd.format('HH:mm')}
                          </Typography>
                          {selectedProcedure && (
                            <>
                              {' '}
                              · duração de {selectedProcedure.durationMinutes} min
                            </>
                          )}
                        </Typography>
                      </Box>
                    )}
                  </AppointmentFormSection>

                </Stack>
              </Grid>

              <Grid
                item
                xs={12}
                lg={6}
                sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
              >
                <Stack spacing={2} sx={{ flex: 1, minHeight: 0 }}>
                  {selectedKind === 'PROCEDURE' && selectedPatientId && selectedProcedureId && (
                    <AppointmentFormSection title="Pacote" icon={<ViewInArIcon fontSize="small" />}>
                      {filteredPatientPackages.length > 0 && (
                        <TextField
                          select
                          label="Pacote ativo do paciente"
                          value={selectedPackageId}
                          onChange={(e) => setSelectedPackageId(e.target.value)}
                          fullWidth
                          sx={{ mb: 1.5 }}
                          helperText={
                            selectedPatientPkg
                              ? `${selectedPatientPkg.sessionsUsed}/${selectedPatientPkg.sessionsTotal} sessões usadas${
                                  selectedPatientPkg.expiresAt
                                    ? ` · expira em ${formatDateOnlyFromApi(selectedPatientPkg.expiresAt)}`
                                    : ''
                                }`
                              : 'Vincular este agendamento a um pacote ativo'
                          }
                        >
                          <MenuItem value="">
                            <em>Nenhum (avulso)</em>
                          </MenuItem>
                          {filteredPatientPackages.map((pp) => (
                            <MenuItem key={pp.id} value={pp.id}>
                              {pp.package?.name ?? 'Pacote'} — {pp.sessionsUsed}/{pp.sessionsTotal} sessões
                            </MenuItem>
                          ))}
                        </TextField>
                      )}

                      {selectedPatientPkg &&
                        !appointment &&
                        selectedPatientPkg.sessionsTotal - selectedPatientPkg.sessionsUsed > 1 && (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<CalendarMonthIcon />}
                            onClick={() => {
                              setBatchPatientPkg(selectedPatientPkg);
                              setBatchDialogOpen(true);
                            }}
                            sx={{ mb: 1.5 }}
                          >
                            Agendar {selectedPatientPkg.sessionsTotal - selectedPatientPkg.sessionsUsed} sessões
                            restantes
                          </Button>
                        )}

                      {filteredPatientPackages.length === 0 && availableCatalogPackages.length > 0 && (
                        <Stack spacing={1}>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            Pacotes disponíveis para <strong>{selectedProcedure?.name}</strong>
                          </Typography>
                          {availableCatalogPackages.map((pkg) => {
                            const itemForProc = pkg.items?.find((i) => i.procedureId === selectedProcedureId);
                            const sessions =
                              pkg.type === 'SESSIONS'
                                ? (itemForProc?.quantity ?? pkg.sessionCount)
                                : pkg.sessionCount;
                            const price = pkg.totalPrice
                              ? brl.format(Number(pkg.totalPrice))
                              : pkg.discountPercent
                                ? `${Number(pkg.discountPercent)}% de desconto`
                                : '';
                            return (
                              <Box
                                key={pkg.id}
                                sx={{
                                  p: 1.5,
                                  borderRadius: 2,
                                  border: '1px solid',
                                  borderColor: (theme) => alpha(theme.palette.primary.main, 0.22),
                                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: 1.5,
                                }}
                              >
                                <Box sx={{ minWidth: 0 }}>
                                  <Typography variant="body2" fontWeight={600}>
                                    {pkg.name}
                                  </Typography>
                                  <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.5 }}>
                                    <Chip size="small" label={`${sessions} sessões`} color="primary" variant="outlined" />
                                    {price && (
                                      <Typography variant="caption" color="text.secondary">
                                        {price}
                                      </Typography>
                                    )}
                                  </Stack>
                                </Box>
                                <Button
                                  size="small"
                                  variant="contained"
                                  startIcon={<AddShoppingCartIcon />}
                                  onClick={() => {
                                    setSellPackageTarget(pkg);
                                    const sumPrice = (pkg.items ?? []).reduce((sum, item) => {
                                      const p = procedures.find((pr) => pr.id === item.procedureId);
                                      return sum + (p ? Number(p.price) * item.quantity : 0);
                                    }, 0);
                                    if (pkg.totalPrice) {
                                      setSellTotalPaid(Number(pkg.totalPrice));
                                    } else if (pkg.discountPercent) {
                                      setSellTotalPaid(sumPrice * (1 - Number(pkg.discountPercent) / 100));
                                    } else {
                                      setSellTotalPaid(sumPrice);
                                    }
                                    setSellPaymentMethodId('');
                                    setSellDialogOpen(true);
                                  }}
                                  sx={{ flexShrink: 0 }}
                                >
                                  Adquirir
                                </Button>
                              </Box>
                            );
                          })}
                        </Stack>
                      )}

                      {filteredPatientPackages.length === 0 && availableCatalogPackages.length === 0 && (
                        <Typography variant="body2" color="text.secondary">
                          Nenhum pacote disponível para este procedimento.
                        </Typography>
                      )}
                    </AppointmentFormSection>
                  )}

                  <Paper
                    variant="outlined"
                    sx={{
                      flex: activeSideTab === 'materials' ? 1 : '0 1 auto',
                      display: 'flex',
                      flexDirection: 'column',
                      minHeight: activeSideTab === 'materials' ? { xs: 200, lg: 0 } : 0,
                      overflow: 'hidden',
                      bgcolor: 'background.paper',
                    }}
                  >
                    <Tabs
                      value={activeSideTab}
                      onChange={(_, value: 'materials' | 'notes') => setSideTab(value)}
                      sx={{
                        px: 1,
                        borderBottom: 1,
                        borderColor: 'divider',
                        flexShrink: 0,
                        minHeight: 44,
                        '& .MuiTab-root': { minHeight: 44, textTransform: 'none', fontWeight: 500 },
                      }}
                    >
                      {showMaterialsTab && (
                        <Tab
                          value="materials"
                          label={
                            <Stack direction="row" spacing={0.75} alignItems="center">
                              <span>Materiais</span>
                              {willDeductMaterials && hasInsufficient && (
                                <Chip label="!" size="small" color="warning" sx={{ height: 18, fontSize: 11 }} />
                              )}
                            </Stack>
                          }
                          icon={<InventoryIcon sx={{ fontSize: 18 }} />}
                          iconPosition="start"
                        />
                      )}
                      <Tab
                        value="notes"
                        label="Observações"
                        icon={<NotesOutlinedIcon sx={{ fontSize: 18 }} />}
                        iconPosition="start"
                      />
                    </Tabs>

                    <Box
                      sx={{
                        p: 2,
                        flex: 1,
                        minHeight: 0,
                        overflowX: 'hidden',
                        overflowY: activeSideTab === 'materials' ? 'auto' : 'visible',
                      }}
                    >
                      {activeSideTab === 'materials' && showMaterialsTab && (
                        <Stack spacing={2}>
                          {materials.length > 0 && (
                            <Box>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                fontWeight={600}
                                sx={{ display: 'block', mb: 0.75 }}
                              >
                                Previstos no procedimento
                                {!willDeductMaterials && ' (reservados)'}
                              </Typography>
                              <Stack direction="row" flexWrap="wrap" gap={0.75}>
                                {materials.map((m) => {
                                  const needed = totalMaterialNeed.get(m.itemId) ?? Number(m.quantity);
                                  const available = effectiveAvailable.get(m.itemId);
                                  const insufficient =
                                    available !== undefined && available < needed;
                                  return (
                                    <Chip
                                      key={m.id}
                                      size="small"
                                      label={`${m.item?.name ?? 'Item'} — ${m.quantity}${m.item?.unit ? ` ${m.item.unit}` : ''}`}
                                      color={insufficient ? 'warning' : 'default'}
                                      variant={insufficient ? 'outlined' : 'filled'}
                                    />
                                  );
                                })}
                              </Stack>
                            </Box>
                          )}

                          <Box>
                            <Stack
                              direction="row"
                              alignItems="center"
                              justifyContent="space-between"
                              sx={{ mb: 1 }}
                            >
                              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                Materiais extras
                              </Typography>
                              <Button
                                size="small"
                                startIcon={<AddIcon />}
                                onClick={() =>
                                  setExtraMaterials((rows) => [...rows, { itemId: '', quantity: 1 }])
                                }
                              >
                                Adicionar
                              </Button>
                            </Stack>

                            {extraMaterials.length === 0 ? (
                              <Typography variant="body2" color="text.secondary">
                                Nenhum material extra além do previsto no procedimento.
                              </Typography>
                            ) : (
                              <Stack spacing={1.25}>
                                {extraMaterials.map((row, index) => {
                                  const otherUsedIds = new Set(
                                    extraMaterials
                                      .filter((_, i) => i !== index)
                                      .map((m) => m.itemId)
                                      .filter(Boolean),
                                  );
                                  const availableItems = inventory.filter(
                                    (i) => i.id === row.itemId || !otherUsedIds.has(i.id),
                                  );
                                  const totalForItem = row.itemId
                                    ? totalMaterialNeed.get(row.itemId) ?? 0
                                    : 0;
                                  const available = row.itemId
                                    ? effectiveAvailable.get(row.itemId)
                                    : undefined;
                                  const insufficient =
                                    !!row.itemId &&
                                    available !== undefined &&
                                    available < totalForItem;

                                  return (
                                    <Stack
                                      key={index}
                                      direction={{ xs: 'column', sm: 'row' }}
                                      spacing={1}
                                      alignItems={{ sm: 'flex-start' }}
                                    >
                                      <Autocomplete
                                        sx={{ flex: 1, minWidth: 0 }}
                                        size="small"
                                        options={availableItems}
                                        getOptionLabel={(i) =>
                                          `${i.name}${i.unit ? ` (${i.unit})` : ''} — disp.: ${effectiveAvailable.get(i.id) ?? i.quantity}`
                                        }
                                        value={
                                          availableItems.find((i) => i.id === row.itemId) ?? null
                                        }
                                        onChange={(_, val) => {
                                          setExtraMaterials((rows) =>
                                            rows.map((r, i) =>
                                              i === index ? { ...r, itemId: val?.id ?? '' } : r,
                                            ),
                                          );
                                        }}
                                        renderInput={(params) => (
                                          <TextField
                                            {...params}
                                            label="Material"
                                            size="small"
                                            required
                                          />
                                        )}
                                      />
                                      <Stack direction="row" spacing={0.5} alignItems="flex-start">
                                        <TextField
                                          type="number"
                                          size="small"
                                          label="Qtd"
                                          value={row.quantity}
                                          inputProps={{ min: 0.001, step: 0.001 }}
                                          sx={{ width: 88 }}
                                          error={!!insufficient}
                                          onChange={(e) => {
                                            const quantity = Number(e.target.value);
                                            setExtraMaterials((rows) =>
                                              rows.map((r, i) =>
                                                i === index ? { ...r, quantity } : r,
                                              ),
                                            );
                                          }}
                                        />
                                        <Tooltip title="Remover">
                                          <IconButton
                                            size="small"
                                            onClick={() =>
                                              setExtraMaterials((rows) =>
                                                rows.filter((_, i) => i !== index),
                                              )
                                            }
                                            sx={{ mt: 0.25 }}
                                          >
                                            <DeleteOutlineIcon fontSize="small" />
                                          </IconButton>
                                        </Tooltip>
                                      </Stack>
                                    </Stack>
                                  );
                                })}
                              </Stack>
                            )}
                          </Box>

                          {willDeductMaterials && hasInsufficient && (
                            <Alert severity="error">
                              Estoque insuficiente para os materiais previstos e extras.
                            </Alert>
                          )}
                        </Stack>
                      )}

                      {activeSideTab === 'notes' && (
                        <Stack spacing={2}>
                          <Controller
                            name="notes"
                            control={control}
                            render={({ field }) => (
                              <TextField
                                {...field}
                                label="Observações administrativas"
                                fullWidth
                                multiline
                                minRows={4}
                                placeholder="Lembretes internos, preferências do paciente..."
                              />
                            )}
                          />
                          <Controller
                            name="clinicalNotes"
                            control={control}
                            render={({ field }) => (
                              <TextField
                                {...field}
                                label="Anotações clínicas"
                                placeholder="Avaliação da pele, produtos usados, reações..."
                                fullWidth
                                multiline
                                minRows={5}
                              />
                            )}
                          />
                        </Stack>
                      )}
                    </Box>
                  </Paper>

                  {(loggedUserCannotBeScheduled || noProfessionalAvailable || professionalSlotConflict) && (
                    <Alert severity="error">
                      {loggedUserCannotBeScheduled
                        ? 'Seu usuário não realiza atendimentos e não pode receber agendamentos.'
                        : professionalSlotConflict && !selectedPerformsAppointments
                          ? 'Selecione um profissional que realiza atendimentos.'
                          : professionalSlotConflict
                            ? 'Este profissional já tem agendamento ativo no mesmo horário.'
                            : 'Nenhum profissional disponível para este horário.'}
                    </Alert>
                  )}

                  {mutation.isError && (
                    <Alert severity="error">
                      {(mutation.error as any)?.response?.data?.message ?? 'Erro ao salvar agendamento'}
                    </Alert>
                  )}
                </Stack>
              </Grid>
            </Grid>
          </DialogContent>

          <DialogActions
            sx={{
              px: { xs: 1.5, sm: 3 },
              py: { xs: 1.5, sm: 2 },
              flexShrink: 0,
              borderTop: 1,
              borderColor: 'divider',
              bgcolor: 'background.paper',
              flexWrap: isMobile ? 'wrap' : 'nowrap',
              gap: isMobile ? 1 : 0,
            }}
          >
            {appointment && canDelete && (
              <Button
                color="error"
                startIcon={<DeleteOutlineIcon />}
                disabled={deleteMutation.isPending}
                size={isMobile ? 'small' : 'medium'}
                onClick={async () => {
                  const ok = await confirm({
                    title: 'Excluir agendamento',
                    message: 'Excluir este agendamento?',
                    confirmLabel: 'Excluir',
                    confirmColor: 'error',
                  });
                  if (ok) deleteMutation.mutate(appointment.id);
                }}
              >
                Excluir
              </Button>
            )}
            {appointment && selectedPatient?.phone && (
              <Tooltip title="Enviar mensagem de confirmação via WhatsApp">
                <Button
                  startIcon={<WhatsAppIcon />}
                  onClick={() => setWhatsappOpen(true)}
                  size={isMobile ? 'small' : 'medium'}
                  sx={{ color: '#25D366' }}
                >
                  WhatsApp
                </Button>
              </Tooltip>
            )}
            <Box sx={{ flex: 1 }} />
            {!isMobile && <Button onClick={onClose}>Cancelar</Button>}
            <Button
              type="submit"
              variant="contained"
              fullWidth={isMobile}
              disabled={
                mutation.isPending ||
                loggedUserCannotBeScheduled ||
                noProfessionalAvailable ||
                professionalSlotConflict ||
                (requiresValidProvider && !selectedPerformsAppointments) ||
                (willDeductMaterials && hasInsufficient && watch('kind') === 'PROCEDURE')
              }
            >
              {mutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* WhatsApp de confirmação - usa template de categoria 'confirmacao' */}
      {appointment && (
        <SendWhatsAppDialog
          open={whatsappOpen}
          onClose={() => setWhatsappOpen(false)}
          phone={selectedPatient?.phone}
          vars={varsFromAppointment({
            patient: selectedPatient,
            procedure: selectedProcedure,
            professional: appointmentProviders.find((p) => p.id === appointment.professionalId),
            startAt: appointment.startAt,
          })}
          preferredCategory="confirmacao"
          title="Enviar confirmação do agendamento"
        />
      )}

      {/* Dialog de método de pagamento ao concluir */}
      <Dialog
        open={paymentDialogOpen}
        onClose={() => {
          setPaymentDialogOpen(false);
          setPendingFormValues(null);
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" spacing={1} alignItems="center">
            <PaymentIcon color="primary" />
            <span>Registrar pagamento</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Ao concluir este agendamento, uma receita de{' '}
            <strong>
              {paymentAmountOnComplete > 0
                ? brl.format(paymentAmountOnComplete)
                : '—'}
            </strong>{' '}
            será registrada no financeiro
            {selectedPackageId && selectedPatientPkg ? ' (valor do pacote)' : ''}. Como foi o
            pagamento?
          </Typography>
          <TextField
            select
            label="Método de pagamento"
            value={selectedPaymentMethodId}
            onChange={(e) => setSelectedPaymentMethodId(e.target.value)}
            fullWidth
            required
          >
            {paymentMethods.filter((m) => m.active).map((m) => (
              <MenuItem key={m.id} value={m.id}>
                {m.name}{Number(m.feePercent) > 0 ? ` (${Number(m.feePercent)}%)` : ''}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => {
              setPaymentDialogOpen(false);
              setPendingFormValues(null);
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            disabled={!selectedPaymentMethodId || mutation.isPending}
            onClick={confirmPaymentAndSave}
          >
            {mutation.isPending ? 'Salvando...' : 'Concluir e registrar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de agendar retorno após COMPLETED */}
      <Dialog
        open={returnDialogOpen}
        onClose={closeReturnDialog}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" spacing={1} alignItems="center">
            <EventRepeatIcon color="primary" />
            <span>Agendar retorno?</span>
          </Stack>
        </DialogTitle>
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
            {returnCreateError && (
              <Alert severity="error">{returnCreateError}</Alert>
            )}
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
          <Button onClick={closeReturnDialog}>
            Agora não
          </Button>
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

      {/* ─── Dialog de venda inline de pacote ─── */}
      <Dialog
        open={sellDialogOpen}
        onClose={() => {
          setSellDialogOpen(false);
          setSellPackageTarget(null);
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" spacing={1} alignItems="center">
            <AddShoppingCartIcon color="primary" />
            <span>Adquirir pacote</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {sellPackageTarget && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography variant="body2">
                Vincular o pacote <strong>{sellPackageTarget.name}</strong> ao paciente{' '}
                <strong>{selectedPatient?.name}</strong>.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {sellPackageTarget.sessionCount} sessões
                {sellPackageTarget.validityDays
                  ? ` · Validade: ${sellPackageTarget.validityDays} dias`
                  : ' · Sem validade'}
              </Typography>

              <Alert severity="info" sx={{ py: 0.5 }}>
                O pagamento será registrado ao concluir o primeiro agendamento. Você pode informar
                o pagamento agora, se preferir.
              </Alert>

              <TextField
                type="number"
                label="Valor acordado"
                value={sellTotalPaid}
                onChange={(e) => setSellTotalPaid(Number(e.target.value))}
                fullWidth
                inputProps={{ step: '0.01', min: 0 }}
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 0.5 }}>R$</Typography>,
                }}
              />

              <Typography variant="subtitle2" color="text.secondary">
                Pagamento antecipado (opcional)
              </Typography>

              <TextField
                select
                label="Método de pagamento"
                value={sellPaymentMethodId}
                onChange={(e) => setSellPaymentMethodId(e.target.value)}
                fullWidth
                helperText="Deixe em branco para cobrar ao concluir o agendamento"
              >
                <MenuItem value="">—</MenuItem>
                {paymentMethods.filter((m) => m.active).map((m) => (
                  <MenuItem key={m.id} value={m.id}>
                    {m.name}{Number(m.feePercent) > 0 ? ` (${Number(m.feePercent)}%)` : ''}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => {
              setSellDialogOpen(false);
              setSellPackageTarget(null);
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            disabled={!sellPackageTarget}
            onClick={async () => {
              if (!sellPackageTarget || !selectedPatientId) return;
              try {
                const created = await packagesApi.createPatientPackage({
                  patientId: selectedPatientId,
                  packageId: sellPackageTarget.id,
                  totalPaid: sellTotalPaid,
                  ...(sellPaymentMethodId ? { paymentMethodId: sellPaymentMethodId } : {}),
                });
                queryClient.invalidateQueries({ queryKey: ['patient-packages-active'] });
                queryClient.invalidateQueries({ queryKey: ['patient-packages'] });
                setSellDialogOpen(false);
                setSellPackageTarget(null);
                // Selecionar o pacote recém-criado
                setSelectedPackageId(created.id);
                // Oferecer agendamento em lote se tem mais de 1 sessão
                if (created.sessionsTotal > 1 && selectedProcedure?.recurrenceDays) {
                  setBatchPatientPkg(created);
                  setBatchDialogOpen(true);
                }
              } catch (err: any) {
                await alert({
                  title: 'Erro',
                  message: err?.response?.data?.message ?? 'Erro ao vincular pacote',
                  severity: 'error',
                });
              }
            }}
          >
            Vincular pacote
          </Button>
        </DialogActions>
      </Dialog>

      {/* ─── Dialog de agendamento em lote de sessões ─── */}
      <Dialog
        open={batchDialogOpen}
        onClose={() => {
          setBatchDialogOpen(false);
          setBatchPatientPkg(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" spacing={1} alignItems="center">
            <CalendarMonthIcon color="primary" />
            <span>Agendar sessões do pacote</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {batchPatientPkg && selectedProcedure && (
            <Stack spacing={2} sx={{ mt: 1 }}>
              <Typography variant="body2">
                O pacote <strong>{batchPatientPkg.package?.name}</strong> possui{' '}
                <strong>{batchPatientPkg.sessionsTotal - batchPatientPkg.sessionsUsed}</strong> sessões
                restantes de <strong>{selectedProcedure.name}</strong>.
              </Typography>

              {selectedProcedure.recurrenceDays ? (
                <>
                  <Typography variant="body2" color="text.secondary">
                    Serão agendadas com intervalo de <strong>{selectedProcedure.recurrenceDays} dias</strong>{' '}
                    entre cada sessão, a partir de{' '}
                    <strong>{dayjs(`${selectedDate}T${selectedStartTime}`).format('DD/MM/YYYY [às] HH:mm')}</strong>,
                    com o mesmo profissional.
                  </Typography>

                  <Typography variant="overline" color="text.secondary">
                    Sessões que serão agendadas (altere data/horário se precisar):
                  </Typography>
                  <List dense disablePadding sx={{ maxHeight: 320, overflow: 'auto' }}>
                    {batchSessions.map((session, i) => (
                      <ListItem key={i} disableGutters sx={{ py: 0.75 }}>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%' }}>
                          <Chip
                            size="small"
                            label={`${i + 1}ª`}
                            color="primary"
                            variant="outlined"
                            sx={{ minWidth: 36 }}
                          />
                          <TextField
                            type="date"
                            size="small"
                            value={session.date}
                            onChange={(e) =>
                              setBatchSessions((prev) =>
                                prev.map((s, idx) =>
                                  idx === i ? { ...s, date: e.target.value } : s,
                                ),
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
                              setBatchSessions((prev) =>
                                prev.map((s, idx) =>
                                  idx === i ? { ...s, startTime: e.target.value } : s,
                                ),
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
          <Button
            onClick={() => {
              setBatchDialogOpen(false);
              setBatchPatientPkg(null);
            }}
          >
            Agendar só esta sessão
          </Button>
          <Button
            variant="contained"
            startIcon={batchCreating ? <CircularProgress size={18} /> : <CalendarMonthIcon />}
            disabled={batchCreating || !selectedProcedure?.recurrenceDays}
            onClick={async () => {
              if (!batchPatientPkg || !selectedProcedure?.recurrenceDays) return;
              setBatchCreating(true);
              try {
                const remaining = batchSessions.length;
                const duration = selectedProcedure.durationMinutes;
                const professionalId = selectedProfessionalId;

                for (let i = 0; i < remaining; i++) {
                  const session = batchSessions[i];
                  const sessionStart = dayjs(`${session.date}T${session.startTime}`);
                  const sessionEnd = sessionStart.add(duration, 'minute');

                  await appointmentsApi.create({
                    patientId: selectedPatientId,
                    procedureId: selectedProcedureId,
                    professionalId,
                    startAt: sessionStart.toISOString(),
                    endAt: sessionEnd.toISOString(),
                    status: 'SCHEDULED',
                    kind: 'PROCEDURE',
                    notes: `Sessão ${i + 1}/${remaining} — ${batchPatientPkg.package?.name ?? 'Pacote'}`,
                    patientPackageId: batchPatientPkg.id,
                  });
                }

                invalidateAppointmentListQueries(queryClient);
                queryClient.invalidateQueries({ queryKey: ['patient-packages-active'] });
                queryClient.invalidateQueries({ queryKey: ['patient-packages'] });
                setBatchDialogOpen(false);
                setBatchPatientPkg(null);
                onClose();
              } catch (err: any) {
                await alert({
                  title: 'Erro',
                  message: err?.response?.data?.message ?? 'Erro ao criar agendamentos em lote',
                  severity: 'error',
                });
              } finally {
                setBatchCreating(false);
              }
            }}
          >
            {batchCreating ? 'Agendando...' : `Agendar ${batchSessions.length} sessões`}
          </Button>
        </DialogActions>
      </Dialog>

      <PatientDetailDrawer
        patientId={chartPatientId}
        onClose={() => setChartPatientId(null)}
        defaultTab="notes"
        highlightAppointmentId={appointment?.id ?? null}
      />

      {/* Modal de confirmação para finalizar atendimento */}
      <Dialog open={confirmFinishOpen} onClose={() => setConfirmFinishOpen(false)} maxWidth="xs">
        <DialogTitle>Concluir atendimento?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Tempo registrado: <strong>{formatElapsed(elapsed)}</strong>.
            {hasFinishedAt ? ' O cronômetro está pausado.' : ' O cronômetro será parado.'}
            {' '}O agendamento será marcado como <strong>Concluído</strong>.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmFinishOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            color="success"
            disabled={mutation.isPending}
            onClick={() => void handleConfirmFinishSession()}
          >
            {mutation.isPending ? 'Concluindo...' : 'Concluir'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

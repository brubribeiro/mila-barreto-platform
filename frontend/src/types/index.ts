export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  isSystem: boolean;
  restrictToOwnAppointments: boolean;
  createdAt?: string;
  updatedAt?: string;
  _count?: { users: number };
}

/**
 * Usuário tal como retornado por /auth/me e /auth/login.
 * Inclui permissões já achatadas para checagem rápida no front.
 */
export interface User {
  id: string;
  name: string;
  email: string;
  roleId: string;
  roleName: string;
  permissions: string[];
  restrictToOwnAppointments: boolean;
  active: boolean;
  providesAppointments: boolean;
  /** true quando um admin está personificando este usuário */
  impersonating?: boolean;
  impersonatorName?: string;
}

/** Forma resumida do usuário usada em listagens/dropdowns. */
export interface UserSummary {
  id: string;
  name: string;
  email: string;
  active: boolean;
  providesAppointments: boolean;
  isPrimary?: boolean;
  roleId: string;
  createdAt: string;
  role: { id: string; name: string; isSystem: boolean };
}

/** M = masculino, F = feminino */
export type PatientSex = 'M' | 'F';

export type PatientReferralSource =
  | 'INSTAGRAM'
  | 'REFERRAL'
  | 'GOOGLE'
  | 'LOCATION'
  | 'OTHER';

export interface Patient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  birthDate?: string;
  sex?: PatientSex | null;
  document?: string;
  cep?: string | null;
  addressStreet?: string | null;
  addressNeighborhood?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressNumber?: string | null;
  addressComplement?: string | null;
  address?: string;
  notes?: string;
  referralSource?: PatientReferralSource | null;
  referralSourceOther?: string | null;
  photoStorageKey?: string | null;
  photoUrl?: string | null;
  anamnesis?: Record<string, any> | null;
  createdAt: string;
}

export interface Procedure {
  id: string;
  name: string;
  description?: string;
  durationMinutes: number;
  price: number | string;
  active: boolean;
  recurrenceDays?: number | null;
  baseCost?: number;
  maxFeePercent?: number;
  maxFeeCost?: number;
  fixedCostShare?: number;
  hourlyCost?: number;
  totalCost?: number;
  profitMargin?: number;
  materials?: ProcedureMaterial[];
}

export interface ProcedureMaterial {
  id: string;
  procedureId: string;
  itemId: string;
  quantity: number;
  item?: InventoryItem;
}

export interface AppointmentMaterial {
  id: string;
  appointmentId: string;
  itemId: string;
  quantity: number;
  item?: InventoryItem;
}

export type AppointmentStatus =
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export type AppointmentKind = 'EVALUATION' | 'PROCEDURE' | 'RETURN';

export interface Appointment {
  id: string;
  patientId: string;
  procedureId: string;
  professionalId: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  kind: AppointmentKind;
  notes?: string;
  clinicalNotes?: string;
  financeGenerated?: boolean;
  materialsDeducted?: boolean;
  patientPackageId?: string | null;
  patient?: Patient;
  procedure?: Procedure;
  professional?: UserSummary;
  patientPackage?: PatientPackage;
  extraMaterials?: AppointmentMaterial[];
  startedAt?: string | null;
  finishedAt?: string | null;
}

// ─── Pacotes ───

export type PackageType = 'COMBO' | 'SESSIONS';
export type PatientPackageStatus = 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED';

export interface PackageItem {
  id: string;
  packageId: string;
  procedureId: string;
  quantity: number;
  sortOrder: number;
  procedure?: Procedure;
}

export interface Package {
  id: string;
  name: string;
  description?: string;
  type: PackageType;
  totalPrice?: number | string | null;
  discountPercent?: number | string | null;
  validityDays?: number | null;
  sessionCount: number;
  active: boolean;
  items: PackageItem[];
  _count?: { patientPackages: number };
  createdAt?: string;
}

export interface PatientPackage {
  id: string;
  patientId: string;
  packageId: string;
  status: PatientPackageStatus;
  totalPaid: number | string;
  paymentMethod?: string;
  purchaseDate: string;
  expiresAt?: string | null;
  sessionsTotal: number;
  sessionsUsed: number;
  notes?: string;
  financeGenerated?: boolean;
  patient?: Patient;
  package?: Package;
  appointments?: Appointment[];
}

export type FinancialType = 'INCOME' | 'EXPENSE';

export type ExpenseType = 'FIXED' | 'VARIABLE';

// ─── Formas de pagamento ───

export interface PaymentMethodEntry {
  id: string;
  name: string;
  feePercent: number | string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
  _count?: { financialEntries: number };
}

export interface FinancialEntry {
  id: string;
  type: FinancialType;
  description: string;
  amount: number | string;
  netAmount?: number | string | null;
  feePercent?: number | string | null;
  paymentMethodId?: string | null;
  paymentMethod?: PaymentMethodEntry | null;
  category?: string;
  paidAt?: string;
  dueDate?: string;
  patientId?: string;
  appointmentId?: string;
  equipmentId?: string;
  invoiceIssued?: boolean;
  invoiceIssuedAt?: string;
  expenseType?: ExpenseType;
  recurringExpenseId?: string;
  materialCost?: number | null;
  profitMargin?: number | null;
  appointment?: {
    id: string;
    procedure?: { name: string };
  };
  equipment?: { id: string; name: string };
}

export interface RecurringExpense {
  id: string;
  name: string;
  description?: string;
  amount: number | string;
  category?: string;
  expenseType: ExpenseType;
  dueDay: number;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
  _count?: { generatedEntries: number };
}

export interface MessageTemplate {
  id: string;
  name: string;
  category?: string;
  content: string;
  procedureId?: string | null;
  procedure?: { id: string; name: string; price: number | string } | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkingHours {
  id: string;
  userId: string;
  dayOfWeek: number; // 0-6
  startTime: string; // HH:mm
  endTime: string;
}

export interface Unavailability {
  id: string;
  userId: string;
  startAt: string;
  endAt: string;
  reason?: string;
}

export interface UnavailabilityCalendarItem extends Unavailability {
  user: { id: string; name: string };
}

export interface Equipment {
  id: string;
  name: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  purchaseDate?: string;
  purchaseValue?: number;
  maintenanceValue?: number;
  maintenanceIntervalMonths?: number;
  maintenanceNotifyDaysBefore?: number;
  lastMaintenanceAt?: string;
  nextMaintenanceAt?: string;
  scheduledMaintenanceAt?: string;
  notes?: string;
  active: boolean;
  createdAt?: string;
}

export interface DocumentFile {
  id: string;
  name: string;
  category?: string;
  storageKey?: string;
  fileUrl?: string;
  mimeType?: string;
  size?: number;
  notes?: string;
  patientId?: string;
  equipmentId?: string;
  createdAt: string;
  patient?: { id: string; name: string };
  equipment?: { id: string; name: string };
}

export interface InventoryItem {
  id: string;
  name: string;
  sku?: string;
  description?: string;
  quantity: number;
  minQuantity: number;
  unit?: string;
  costPrice?: number | string;
  expiresAt?: string;
  expiryNotifyDaysBefore?: number;
}

// ─── Promoções ───

export type DiscountType = 'PERCENTAGE' | 'FIXED';

export interface Promotion {
  id: string;
  name: string;
  description?: string;
  commemorativeDate?: string;
  startAt: string;
  endAt: string;
  discountType: DiscountType;
  discountValue: number | string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
  procedures?: { procedureId: string; procedure: { id: string; name: string; price: number | string } }[];
  packages?: { packageId: string; package: { id: string; name: string; totalPrice: number | string } }[];
  _count?: { appointments: number };
}

export type NotificationType =
  | 'APPOINTMENT_CREATED'
  | 'APPOINTMENT_CANCELLED'
  | 'INVENTORY_LOW_STOCK'
  | 'INVENTORY_EXPIRING'
  | 'PATIENT_CREATED'
  | 'PATIENT_RETURN_DUE'
  | 'PATIENT_REACTIVATION'
  | 'USER_CREATED'
  | 'EQUIPMENT_MAINTENANCE';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  readAt?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface NotificationPreference {
  type: NotificationType;
  enabled: boolean;
}

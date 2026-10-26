export interface Role {
  id: string;
  name: string;
  description?: string;
  color?: string | null;
  permissions: string[];
  isSystem: boolean;
  restrictToOwnAppointments: boolean;
  createdAt?: string;
  updatedAt?: string;
  _count?: { users: number };
}

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
  /** Clínica do usuário; null para o super-admin fora de uma clínica */
  tenantId?: string | null;
  /** Dono da plataforma: usa só a área /admin (ou "entra como" uma clínica) */
  isSuperAdmin?: boolean;
  /** Nome da clínica quando o super-admin "entrou como" ela */
  tenantName?: string;
}

// ===== Painel administrativo da plataforma (super-admin) =====

export interface AdminTenantMetrics {
  activeUsers: number;
  patients: number;
  appointmentsThisMonth: number;
  lastAccessAt: string | null;
}

export interface AdminTenant {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  suspendedAt: string | null;
  createdAt: string;
  updatedAt: string;
  metrics: AdminTenantMetrics;
}

export interface AdminTenantDetail extends Omit<AdminTenant, 'metrics'> {
  admins: { id: string; name: string; email: string; active: boolean; lastAccessAt: string | null }[];
  metrics: AdminTenantMetrics & { totalUsers: number; storageBytes: number; files: number };
}

export type PlatformAuditAction =
  | 'TENANT_CREATE'
  | 'TENANT_UPDATE'
  | 'TENANT_SUSPEND'
  | 'TENANT_REACTIVATE'
  | 'TENANT_ENTER'
  | 'CATALOG_CREATE'
  | 'CATALOG_UPDATE'
  | 'CATALOG_ACTIVATE'
  | 'CATALOG_DEACTIVATE';

export interface PlatformAuditLog {
  id: string;
  action: PlatformAuditAction;
  actorId: string;
  actorName: string;
  actorEmail: string;
  targetTenantId: string | null;
  targetName: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
}

export type PlatformCatalogKind =
  | 'document_category'
  | 'message_category'
  | 'message_trigger'
  | 'procedure_category'
  | 'inventory_unit';

/** Item completo (painel /admin). */
export interface PlatformCatalogItem {
  id: string;
  kind: PlatformCatalogKind;
  value: string;
  label: string;
  sortOrder: number;
  active: boolean;
  meta?: Record<string, unknown> | null;
  createdAt?: string;
  updatedAt?: string;
}

/** Leitura no app da clínica (só ativos). */
export type PlatformCatalogOption = Pick<
  PlatformCatalogItem,
  'id' | 'kind' | 'value' | 'label' | 'sortOrder' | 'meta'
>;

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
  // Perfil de profissional (preenchido quando providesAppointments = true)
  specialty?: string | null;
  specialties?: string[];
  councilRegister?: string | null;
  calendarColor?: string | null;
  bio?: string | null;
  photoStorageKey?: string | null;
  photoUrl?: string | null;
  appointmentsCount?: number;
  appointmentsCountMonth?: number;
  appointmentsCountWeek?: number;
  availability?: ProfessionalAvailability | null;
}

export type ProfessionalAvailability = 'IN_SERVICE' | 'OFF' | 'OUTSIDE_HOURS' | 'AVAILABLE';

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
  /** Agregações retornadas na listagem */
  lastVisit?: string | null;
  totalSpent?: number;
  reliabilityPercent?: number;
  appointmentsCount?: number;
}

export interface PatientStats {
  total: number;
  active90: number;
  newThisMonth: number;
  averageTicket: number;
}

export type PatientPhotoPhase = 'BEFORE' | 'AFTER';

export interface PatientPhoto {
  id: string;
  patientId: string;
  appointmentId: string;
  phase: PatientPhotoPhase;
  label?: string | null;
  pairId?: string | null;
  takenAt: string;
  url?: string | null;
  mimeType?: string | null;
  size?: number | null;
  createdAt: string;
  appointment?: {
    id: string;
    startAt: string;
    kind?: AppointmentKind;
    procedure?: { name: string } | null;
  } | null;
}

export interface Procedure {
  id: string;
  name: string;
  description?: string;
  category?: string | null;
  durationMinutes: number;
  price: number | string;
  active: boolean;
  recurrenceDays?: number | null;
  applicationMap?: boolean;
  appointmentsCount?: number;
  baseCost?: number;
  equipmentCost?: number;
  maxFeePercent?: number;
  maxFeeCost?: number;
  fixedCostShare?: number;
  hourlyCost?: number;
  totalCost?: number;
  profitMargin?: number;
  materials?: ProcedureMaterial[];
  equipments?: ProcedureEquipmentLink[];
}

export interface ProcedureEquipmentLink {
  id: string;
  equipmentId: string;
  costPerUse: number | string;
  equipment?: { id: string; name: string };
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
  /** Número da sessão (1-based) deste agendamento dentro do pacote. */
  sessionIndex?: number | null;
  /** Receitas (INCOME) vinculadas — para exibir forma/valor pago. */
  financialEntries?: {
    id: string;
    amount: number | string;
    netAmount?: number | string | null;
    paymentMethod?: { name: string } | null;
  }[];
  extraMaterials?: AppointmentMaterial[];
  startedAt?: string | null;
  finishedAt?: string | null;
}

export type PackageType = 'COMBO' | 'SESSIONS';
export type PackageHighlight = 'BEST_SELLER' | 'RECURRING';
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
  /** Destaque manual: 'BEST_SELLER' | 'RECURRING' | null */
  highlight?: PackageHighlight | null;
  items: PackageItem[];
  _count?: { patientPackages: number };
  createdAt?: string;
  /** Agregações retornadas na listagem */
  originalPrice?: number;
  salePrice?: number;
  savingsPercent?: number;
  activePatientsCount?: number;
  bestSeller?: boolean;
}

export interface PackageStats {
  activePackages: number;
  patientsWithPackage: number;
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

export type MessageTrigger =
  | 'ON_BOOKING'
  | 'DAY_BEFORE'
  | 'BIRTHDAY'
  | 'AFTER_APPOINTMENT'
  | 'INACTIVE_90_DAYS'
  | 'MANUAL';

export interface MessageTemplate {
  id: string;
  name: string;
  category?: string | null;
  trigger: MessageTrigger;
  active: boolean;
  content: string;
  procedureId?: string | null;
  procedure?: { id: string; name: string; price: number | string } | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkingHours {
  id: string;
  userId: string;
  dayOfWeek: number;
  startTime: string;
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

export type DocumentStatus = 'PENDING' | 'SENT' | 'SIGNED';

export interface DocumentFile {
  id: string;
  name: string;
  category?: string | null;
  status: DocumentStatus;
  signedAt?: string | null;
  storageKey?: string | null;
  fileUrl?: string | null;
  mimeType?: string | null;
  size?: number | null;
  notes?: string | null;
  /** Texto gerado a partir de um modelo; só vem em GET /documents/:id */
  content?: string | null;
  /** Indica se há texto gerado (a listagem não traz `content`) */
  hasContent?: boolean;
  templateId?: string | null;
  patientId?: string | null;
  equipmentId?: string | null;
  createdAt: string;
  updatedAt?: string;
  patient?: { id: string; name: string } | null;
  equipment?: { id: string; name: string } | null;
  template?: { id: string; name: string } | null;
}

export interface DocumentTemplate {
  id: string;
  name: string;
  category?: string | null;
  content: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { documents: number };
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

export type DiscountType = 'PERCENTAGE' | 'FIXED' | 'COMBO';

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

export type FeedbackType = 'BUG' | 'SUGGESTION';

export interface FeedbackReport {
  id: string;
  type: FeedbackType;
  title: string;
  description: string;
  pageUrl?: string | null;
  userId: string;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export type GoalMetric =
  | 'REVENUE'
  | 'NEW_PATIENTS'
  | 'PROCEDURES'
  | 'AVERAGE_TICKET'
  | 'OCCUPANCY'
  | 'RETURN_RATE'
  | 'MANUAL';
export type GoalFormat = 'CURRENCY' | 'NUMBER' | 'PERCENT';
export type GoalPeriodType = 'MONTH' | 'QUARTER' | 'YEAR';

export interface Goal {
  id: string;
  name: string;
  metric: GoalMetric;
  format: GoalFormat;
  target: number;
  manualValue: number | null;
  periodType: GoalPeriodType;
  /** Primeiro dia do período (YYYY-MM-DD). */
  periodStart: string;
  /** Último dia do período (YYYY-MM-DD). */
  periodEnd: string;
  color: string;
  currentValue: number;
  /** Percentual do objetivo (pode passar de 100). */
  progress: number;
  createdAt?: string;
  updatedAt?: string;
}

export type PendingRule =
  | 'LOW_STOCK'
  | 'EXPIRING_STOCK'
  | 'BILLS_DUE'
  | 'APPOINTMENT_NO_OUTCOME'
  | 'EQUIPMENT_MAINTENANCE'
  | 'DOCUMENT_UNSIGNED'
  | 'COMMEMORATIVE_DATE';

export type PendingCategory =
  | 'ADMINISTRATIVE'
  | 'FINANCE'
  | 'INVENTORY'
  | 'OPERATIONAL'
  | 'MAINTENANCE'
  | 'HEALTH_SURVEILLANCE'
  | 'MARKETING'
  | 'TEAM'
  | 'PATIENTS'
  | 'MANAGEMENT';

export type PendingGroup = 'URGENT' | 'OVERDUE' | 'UPCOMING';

export interface PendingItem {
  /** `MANUAL:<id>` para pendências manuais; chave da origem para as geradas por regra. */
  key: string;
  taskId: string | null;
  rule: PendingRule | null;
  category: PendingCategory;
  group: PendingGroup;
  title: string;
  subtitle: string;
  description: string | null;
  deadlineLabel: string;
  dueDate: string | null;
  urgent: boolean;
  link: string | null;
  assignee: { id: string; name: string } | null;
}

export interface PendingList {
  items: PendingItem[];
  resolvedCount: number;
  activeRules: number;
  totalRules: number;
}

export interface PendingTask {
  id: string;
  rule: PendingRule | null;
  sourceKey: string | null;
  title: string;
  description: string | null;
  category: PendingCategory;
  dueDate: string | null;
  urgent: boolean;
  link: string | null;
  assigneeId: string | null;
  assignee: { id: string; name: string } | null;
  resolvedAt: string | null;
  resolvedByName: string | null;
  createdAt: string;
}

export interface PendingRuleConfig {
  rule: PendingRule;
  enabled: boolean;
  param: number | null;
  assigneeId: string | null;
}

// =========================
// ROTINAS DE SKINCARE (anamnese de pele)
// =========================

export type SkincareMoment = 'manha' | 'noite' | 'semanal';
export type SkincareStep = 'limpeza' | 'tratamento' | 'hidratacao' | 'protetor' | 'olhos' | 'esfoliacao' | 'mascara';
export type SkincareTag = 'acido' | 'acido-alto' | 'retinoide' | 'fragrancia' | 'oleo';
export type SkincareRuleField = 'pele' | 'afeccao' | 'olheira' | 'idade';

export interface SkincareProduct {
  id: string;
  name: string;
  brand: string | null;
  activeIngredient: string | null;
  moments: SkincareMoment[];
  step: SkincareStep;
  tags: SkincareTag[];
  howTo: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SkincareRule {
  id: string;
  field: SkincareRuleField;
  value: string;
  productIds: string[];
  avoidTags: SkincareTag[];
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Respostas da anamnese de pele. */
export interface SkinAnswers {
  pele: string;
  afec: string[];
  afecOutra: string;
  olheira: '' | 'sim' | 'nao';
  olheiraTipo: string;
  idade: string;
}

/** Produto na rotina, copiado do catálogo no momento em que a rotina foi gerada. */
export interface SkincareRoutineItem {
  moment: SkincareMoment;
  step: SkincareStep;
  productId: string | null;
  name: string;
  brand: string | null;
  activeIngredient: string | null;
  howTo: string | null;
  note: string | null;
}

export interface SkincareAvoided {
  productId: string | null;
  name: string;
  reason: string;
}

export interface SkincareGuideline {
  text: string;
  source: string;
}

export interface SkincareRoutine {
  id: string;
  patientId: string;
  patient?: { id: string; name: string; phone?: string | null; email?: string | null };
  consultDate: string;
  answers: SkinAnswers;
  items: SkincareRoutineItem[];
  avoided: SkincareAvoided[];
  guidelines: SkincareGuideline[];
  notes: string | null;
  createdById: string | null;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}

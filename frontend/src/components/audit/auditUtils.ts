import dayjs from 'dayjs';

import type { AuditLogEntry } from '../../api/auditLogs';
import { patientReferralSourceLabel } from '../../utils/patientReferralSource';
import { patientSexLabel } from '../../utils/patientSex';

export const actionConfig = {
  CREATE: { label: 'Criação', color: 'success' as const },
  UPDATE: { label: 'Edição', color: 'warning' as const },
  DELETE: { label: 'Exclusão', color: 'error' as const },
} as const;

export const fieldLabels: Record<string, string> = {
  name: 'Nome',
  email: 'E-mail',
  phone: 'Telefone',
  birthDate: 'Data de nascimento',
  sex: 'Sexo',
  document: 'CPF',
  address: 'Endereço',
  notes: 'Observações',
  clinicalNotes: 'Notas clínicas',
  status: 'Status',
  startAt: 'Início',
  endAt: 'Fim',
  price: 'Preço',
  amount: 'Valor',
  netAmount: 'Valor líquido',
  description: 'Descrição',
  category: 'Categoria',
  quantity: 'Quantidade',
  minQuantity: 'Qtd. mínima',
  durationMinutes: 'Duração (min)',
  active: 'Ativo',
  paidAt: 'Pago em',
  dueDate: 'Vencimento',
  type: 'Tipo',
  kind: 'Tipo de agendamento',
  recurrenceDays: 'Dias para retorno',
  feePercent: 'Taxa (%)',
  invoiceIssued: 'NF emitida',
  expenseType: 'Tipo de despesa',
  discountType: 'Tipo de desconto',
  discountValue: 'Valor do desconto',
  sessionCount: 'Sessões',
  sessionsUsed: 'Sessões usadas',
  sessionsTotal: 'Total de sessões',
  totalPaid: 'Valor pago',
  validityDays: 'Validade (dias)',
  totalPrice: 'Preço total',
  discountPercent: 'Desconto (%)',
  referralSource: 'Como conheceu',
  anamnesis: 'Anamnese',
  permissions: 'Permissões',
  roleId: 'Grupo',
  professionalId: 'Profissional',
  patientId: 'Paciente',
  procedureId: 'Procedimento',
  equipmentId: 'Equipamento',
  paymentMethodId: 'Forma de pagamento',
  photoStorageKey: 'Foto',
  storageKey: 'Arquivo',
  mimeType: 'Tipo do arquivo',
  size: 'Tamanho (bytes)',
  title: 'Título',
  body: 'Mensagem',
  channel: 'Canal',
  trigger: 'Gatilho',
  isDefault: 'Padrão',
  frequency: 'Frequência',
  dayOfMonth: 'Dia do mês',
  includeVariable: 'Incluir variável',
  cep: 'CEP',
  addressStreet: 'Rua',
  addressNeighborhood: 'Bairro',
  addressCity: 'Cidade',
  addressState: 'UF',
  addressNumber: 'Número',
  addressComplement: 'Complemento',
  purchaseValue: 'Valor de aquisição',
  maintenanceValue: 'Valor manutenção',
  maintenanceIntervalMonths: 'Intervalo manutenção (meses)',
  brand: 'Marca',
  model: 'Modelo',
  serialNumber: 'Nº de série',
  sku: 'SKU',
  unit: 'Unidade',
  costPrice: 'Preço de custo',
  content: 'Conteúdo',
  commemorativeDate: 'Data comemorativa',
  startedAt: 'Iniciado em',
  finishedAt: 'Finalizado em',
  materialsDeducted: 'Materiais deduzidos',
  financeGenerated: 'Financeiro gerado',
  extraMaterials: 'Materiais extras',
  patientPackageId: 'Pacote do paciente',
  promotionId: 'Promoção',
  packageId: 'Pacote',
  purchaseDate: 'Data de compra',
  expiresAt: 'Expira em',
  dueDay: 'Dia de vencimento',
  itemId: 'Item',
  reason: 'Motivo',
  appointmentId: 'Agendamento',
  paymentMethod: 'Forma de pagamento',
};

const HIDDEN_AUDIT_FIELDS = new Set([
  'appointments',
  'financialEntries',
  'documents',
  'packages',
  'patient',
  'professional',
  'procedure',
  'role',
  'package',
  'photoUrl',
  'fileUrl',
  'paymentMethod',
  'referralSourceOther',
  'extraMaterials',
  'patientPackage',
  'promotion',
  'items',
  'patientPackages',
  'procedures',
  'promotions',
  'generatedEntries',
  'item',
  'appointment',
  'materials',
]);

export function getFieldLabel(field: string): string {
  return fieldLabels[field] ?? field;
}

function isEmptyAuditValue(val: unknown): boolean {
  return val === null || val === undefined || val === '';
}

const enumLabels: Record<string, Record<string, string>> = {
  status: {
    SCHEDULED: 'Agendado',
    CONFIRMED: 'Confirmado',
    IN_PROGRESS: 'Em andamento',
    COMPLETED: 'Concluído',
    CANCELLED: 'Cancelado',
    NO_SHOW: 'Não compareceu',
    ACTIVE: 'Ativo',
    INACTIVE: 'Inativo',
    EXPIRED: 'Expirado',
  },
  kind: {
    EVALUATION: 'Avaliação',
    PROCEDURE: 'Procedimento',
    RETURN: 'Retorno',
  },
  type: {
    INCOME: 'Receita',
    EXPENSE: 'Despesa',
    COMBO: 'Combo',
    SESSIONS: 'Sessões',
    IN: 'Entrada',
    OUT: 'Saída',
    ADJUSTMENT: 'Ajuste',
  },
  expenseType: {
    FIXED: 'Fixa',
    VARIABLE: 'Variável',
  },
  discountType: {
    PERCENTAGE: 'Percentual',
    FIXED: 'Valor fixo',
  },
  channel: {
    WHATSAPP: 'WhatsApp',
    EMAIL: 'E-mail',
    SMS: 'SMS',
  },
  trigger: {
    APPOINTMENT_CREATED: 'Agendamento criado',
    APPOINTMENT_CANCELLED: 'Agendamento cancelado',
    PATIENT_CREATED: 'Paciente criado',
    PATIENT_RETURN_DUE: 'Retorno pendente',
    PATIENT_REACTIVATION: 'Reativação de paciente',
    INVENTORY_LOW_STOCK: 'Estoque baixo',
    INVENTORY_EXPIRING: 'Estoque vencendo',
    USER_CREATED: 'Usuário criado',
  },
  frequency: {
    MONTHLY: 'Mensal',
    WEEKLY: 'Semanal',
    YEARLY: 'Anual',
  },
};

export function formatAuditValue(field: string, val: unknown): string {
  if (isEmptyAuditValue(val)) return '—';
  if (field === 'photoStorageKey' || field === 'storageKey') return val ? 'Sim' : '—';
  if (field === 'sex') return patientSexLabel(val as string);
  if (field === 'referralSource') return patientReferralSourceLabel(val as string);
  if (typeof val === 'string' && enumLabels[field]?.[val]) return enumLabels[field][val];
  if (typeof val === 'boolean') return val ? 'Sim' : 'Não';
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(val)) {
    return dayjs(val).format('DD/MM/YYYY HH:mm');
  }
  if (Array.isArray(val)) return val.length ? val.join(', ') : '—';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

function getVisibleChanges(changes: Record<string, unknown> | null): [string, unknown][] {
  if (!changes) return [];

  return Object.entries(changes).filter(([field, value]) => {
    if (HIDDEN_AUDIT_FIELDS.has(field)) return false;

    const change = value as { old?: unknown; new?: unknown } | unknown;
    if (typeof change === 'object' && change !== null && ('old' in change || 'new' in change)) {
      const c = change as { old?: unknown; new?: unknown };
      return !(isEmptyAuditValue(c.old) && isEmptyAuditValue(c.new));
    }

    return !isEmptyAuditValue(change);
  });
}

export type AuditChangeRow = {
  id: string;
  logId: string;
  createdAt: string;
  userName: string;
  action: AuditLogEntry['action'];
  field: string;
  fieldLabel: string;
  oldValue: string | null;
  newValue: string | null;
};

export function flattenAuditLogs(logs: AuditLogEntry[]): AuditChangeRow[] {
  const rows: AuditChangeRow[] = [];

  for (const log of logs) {
    const visibleChanges = getVisibleChanges(log.changes as Record<string, unknown> | null);
    if (visibleChanges.length === 0) continue;

    for (const [field, value] of visibleChanges) {
      const change = value as { old?: unknown; new?: unknown } | unknown;

      if (log.action === 'UPDATE' && typeof change === 'object' && change !== null && 'old' in change) {
        const c = change as { old?: unknown; new?: unknown };
        rows.push({
          id: `${log.id}-${field}`,
          logId: log.id,
          createdAt: log.createdAt,
          userName: log.userName || 'Sistema',
          action: log.action,
          field,
          fieldLabel: getFieldLabel(field),
          oldValue: formatAuditValue(field, c.old),
          newValue: formatAuditValue(field, c.new),
        });
        continue;
      }

      rows.push({
        id: `${log.id}-${field}`,
        logId: log.id,
        createdAt: log.createdAt,
        userName: log.userName || 'Sistema',
        action: log.action,
        field,
        fieldLabel: getFieldLabel(field),
        oldValue: log.action === 'DELETE' ? formatAuditValue(field, change) : null,
        newValue: log.action === 'CREATE' ? formatAuditValue(field, change) : null,
      });
    }
  }

  return rows;
}

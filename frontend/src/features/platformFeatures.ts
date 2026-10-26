/** Catálogo de módulos (espelha backend/src/common/platform-features.ts). */

export const PLATFORM_FEATURES = [
  'appointments',
  'patients',
  'procedures',
  'packages',
  'promotions',
  'routines',
  'availability',
  'equipment',
  'inventory',
  'finance',
  'recurring_expenses',
  'payment_methods',
  'metrics',
  'goals',
  'documents',
  'messages',
] as const;

export type PlatformFeature = (typeof PLATFORM_FEATURES)[number];

export const PLATFORM_FEATURE_LABELS: Record<PlatformFeature, string> = {
  appointments: 'Agenda',
  patients: 'Pacientes',
  procedures: 'Procedimentos',
  packages: 'Pacotes',
  promotions: 'Promoções',
  routines: 'Rotinas de skincare',
  availability: 'Horários',
  equipment: 'Equipamentos',
  inventory: 'Estoque',
  finance: 'Financeiro',
  recurring_expenses: 'Despesas recorrentes',
  payment_methods: 'Formas de pagamento',
  metrics: 'Métricas',
  goals: 'Metas',
  documents: 'Documentos',
  messages: 'Mensagens',
};

export function isPlatformFeature(value: string): value is PlatformFeature {
  return (PLATFORM_FEATURES as readonly string[]).includes(value);
}

export function formatFeatureList(features: string[] | null | undefined): string {
  if (!features?.length) return 'Nenhum';
  return features.map((f) => PLATFORM_FEATURE_LABELS[f as PlatformFeature] ?? f).join(', ');
}

export function formatPlanPrice(priceCents: number | null | undefined, currency = 'BRL'): string {
  if (priceCents == null) return 'Sem preço';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(priceCents / 100);
}

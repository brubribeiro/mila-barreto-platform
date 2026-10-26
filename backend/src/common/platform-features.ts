/**
 * Catálogo fixo de módulos da plataforma (alinhado às rotas do app da clínica).
 * O plano lista quais estão incluídos; a clínica pode acrescentar (extra) ou tirar (denied).
 * Efetivo = (módulos do plano ∪ extra) − denied.
 * Sem plano: todos os módulos (clínicas legadas / sem vínculo).
 */

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

const FEATURE_SET = new Set<string>(PLATFORM_FEATURES);

export function isPlatformFeature(value: string): value is PlatformFeature {
  return FEATURE_SET.has(value);
}

/** Rótulos em português para UI e mensagens de erro. */
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

/** Remove duplicatas e chaves desconhecidas; ordem estável do catálogo. */
export function normalizeFeatures(raw: unknown): PlatformFeature[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item === 'string' && isPlatformFeature(item)) seen.add(item);
  }
  return PLATFORM_FEATURES.filter((f) => seen.has(f));
}

export type FeatureSource = {
  /** false/ausente = sem plano → todos os módulos. */
  hasPlan: boolean;
  planFeatures?: unknown;
  featuresExtra?: unknown;
  featuresDenied?: unknown;
};

/**
 * Features efetivas da clínica.
 * Sem plano: catálogo inteiro (legado). Com plano: (plano ∪ extra) − denied.
 */
export function resolveEffectiveFeatures(source: FeatureSource): PlatformFeature[] {
  const extra = normalizeFeatures(source.featuresExtra);
  const denied = new Set(normalizeFeatures(source.featuresDenied));

  const base = source.hasPlan ? normalizeFeatures(source.planFeatures) : [...PLATFORM_FEATURES];
  const set = new Set<PlatformFeature>([...base, ...extra]);
  for (const d of denied) set.delete(d);
  return PLATFORM_FEATURES.filter((f) => set.has(f));
}

export function tenantHasFeature(
  features: readonly string[] | null | undefined,
  feature: PlatformFeature,
): boolean {
  return (features ?? []).includes(feature);
}

/** Calcula features a partir do tenant (com plan opcional) carregado do Prisma. */
export function featuresFromTenant(tenant: {
  planId?: string | null;
  featuresExtra?: unknown;
  featuresDenied?: unknown;
  plan?: { features?: unknown } | null;
} | null | undefined): PlatformFeature[] {
  if (!tenant) return [];
  return resolveEffectiveFeatures({
    hasPlan: !!tenant.planId,
    planFeatures: tenant.plan?.features,
    featuresExtra: tenant.featuresExtra,
    featuresDenied: tenant.featuresDenied,
  });
}

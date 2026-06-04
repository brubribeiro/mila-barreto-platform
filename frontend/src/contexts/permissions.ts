/**
 * Catálogo de permissões da plataforma (espelha o backend).
 * Permissões são strings "<resource>:<action>".
 */

export const RESOURCES = [
  { key: 'patients', label: 'Pacientes' },
  { key: 'appointments', label: 'Agendamentos' },
  { key: 'procedures', label: 'Procedimentos' },
  { key: 'packages', label: 'Pacotes' },
  { key: 'finance', label: 'Financeiro' },
  { key: 'inventory', label: 'Estoque' },
  { key: 'users', label: 'Profissionais' },
  { key: 'roles', label: 'Grupos / Permissões' },
  { key: 'messages', label: 'Mensagens / Templates' },
  { key: 'availability', label: 'Horários e indisponibilidade' },
  { key: 'equipment', label: 'Equipamentos' },
  { key: 'documents', label: 'Documentos' },
  { key: 'metrics', label: 'Métricas' },
  { key: 'promotions', label: 'Promoções' },
  { key: 'payment-methods', label: 'Formas de pagamento' },
] as const;

export const ACTIONS = [
  { key: 'view', label: 'Visualizar' },
  { key: 'create', label: 'Criar' },
  { key: 'edit', label: 'Editar' },
  { key: 'delete', label: 'Excluir' },
] as const;

export type ResourceKey = (typeof RESOURCES)[number]['key'];
export type ActionKey = (typeof ACTIONS)[number]['key'];
export type Permission = `${ResourceKey}:${ActionKey}`;

export const ALL_PERMISSIONS: Permission[] = RESOURCES.flatMap((r) =>
  ACTIONS.map((a) => `${r.key}:${a.key}` as Permission),
);

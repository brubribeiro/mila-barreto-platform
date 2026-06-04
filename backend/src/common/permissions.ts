/**
 * Catálogo central de permissões da plataforma.
 * Permissões são strings no formato "<resource>:<action>".
 *
 * Para adicionar um novo módulo, basta adicionar o recurso aqui e usar
 * @RequirePermissions('<resource>:<action>') no controller.
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

export function isValidPermission(value: string): value is Permission {
  return (ALL_PERMISSIONS as readonly string[]).includes(value);
}

/** Role de sistema que sempre equivale a possuir todas as permissões do catálogo. */
export const SYSTEM_ADMIN_ROLE_NAME = 'Administrador';

/**
 * Permissões efetivas do usuário: administradores sempre têm o catálogo completo,
 * independentemente do que esteja gravado na role (ex.: inconsistência manual no BD).
 */
export function effectivePermissions(roleName: string, storedPermissions: string[]): Permission[] {
  if (roleName === SYSTEM_ADMIN_ROLE_NAME) {
    return [...ALL_PERMISSIONS];
  }
  return storedPermissions.slice() as Permission[];
}

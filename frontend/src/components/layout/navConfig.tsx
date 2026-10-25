import { AuroraIcon } from '../AuroraIcon';
import type { Permission } from '../../contexts/permissions';

export interface NavRouteItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  permission?: Permission;
}

export interface NavGroup {
  title?: string;
  items: NavRouteItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Principal',
    items: [
      { label: 'Dashboard', path: '/', icon: <AuroraIcon name="dashboard" /> },
      { label: 'Pendências', path: '/pendencias', icon: <AuroraIcon name="pendencias" />, permission: 'pendencias:view' },
      { label: 'Agenda', path: '/agenda', icon: <AuroraIcon name="agenda" />, permission: 'appointments:view' },
      { label: 'Pacientes', path: '/pacientes', icon: <AuroraIcon name="clientes" />, permission: 'patients:view' },
    ],
  },
  {
    title: 'Catálogo',
    items: [
      { label: 'Procedimentos', path: '/procedimentos', icon: <AuroraIcon name="procedimentos" />, permission: 'procedures:view' },
      { label: 'Rotinas de skincare', path: '/rotinas', icon: <AuroraIcon name="rotinas" />, permission: 'routines:view' },
      { label: 'Pacotes', path: '/pacotes', icon: <AuroraIcon name="pacotes" />, permission: 'packages:view' },
      { label: 'Promoções', path: '/promocoes', icon: <AuroraIcon name="promocoes" />, permission: 'promotions:view' },
    ],
  },
  {
    title: 'Equipe & recursos',
    items: [
      { label: 'Profissionais', path: '/profissionais', icon: <AuroraIcon name="profissionais" />, permission: 'users:view' },
      { label: 'Usuários', path: '/usuarios', icon: <AuroraIcon name="permissoes" />, permission: 'users:view' },
      { label: 'Horários', path: '/horarios', icon: <AuroraIcon name="horarios" /> },
      { label: 'Equipamentos', path: '/equipamentos', icon: <AuroraIcon name="equipamentos" />, permission: 'equipment:view' },
      { label: 'Estoque', path: '/estoque', icon: <AuroraIcon name="estoque" />, permission: 'inventory:view' },
    ],
  },
  {
    title: 'Financeiro',
    items: [
      { label: 'Financeiro', path: '/financeiro', icon: <AuroraIcon name="financeiro" />, permission: 'finance:view' },
      { label: 'Despesas recorrentes', path: '/despesas-recorrentes', icon: <AuroraIcon name="despesas" />, permission: 'finance:view' },
      { label: 'Formas de pagamento', path: '/formas-pagamento', icon: <AuroraIcon name="pagamentos" />, permission: 'payment-methods:view' },
    ],
  },
  {
    title: 'Análise',
    items: [
      { label: 'Métricas', path: '/metricas', icon: <AuroraIcon name="relatorios" />, permission: 'metrics:view' },
      { label: 'Metas', path: '/metas', icon: <AuroraIcon name="metas" />, permission: 'goals:view' },
      { label: 'Documentos', path: '/documentos', icon: <AuroraIcon name="documentos" />, permission: 'documents:view' },
    ],
  },
  {
    title: 'Configurações',
    items: [
      { label: 'Mensagens', path: '/mensagens', icon: <AuroraIcon name="mensagens" />, permission: 'messages:view' },
      { label: 'Grupos', path: '/grupos', icon: <AuroraIcon name="permissoes" />, permission: 'roles:view' },
    ],
  },
];

export function isNavPathActive(pathname: string, itemPath: string): boolean {
  return itemPath === '/' ? pathname === '/' : pathname.startsWith(itemPath);
}

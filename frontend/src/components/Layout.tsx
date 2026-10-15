import { Fragment, useState, useMemo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  alpha,
  AppBar,
  Avatar,
  Box,
  Button,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import SwitchAccountIcon from '@mui/icons-material/SwitchAccount';

import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../contexts/usePermissions';
import { useAppointmentDialog } from '../contexts/AppointmentDialogContext';
import type { Permission } from '../contexts/permissions';
import { NotificationsBell } from './notifications/NotificationsBell';
import { AuditHistoryDialog } from './audit/AuditHistoryDialog';
import { AuroraIcon } from './AuroraIcon';
import { fontSizes } from '../theme/fontSizes';
import { isMoneyHidden, setMoneyHidden } from '../utils/money';

const DRAWER_WIDTH = 258;
const DRAWER_COLLAPSED_WIDTH = 68;

// Paleta do sidebar Aurora (verde escuro)
const SIDEBAR_BG = '#0E2926';
const SIDEBAR_TEXT = '#8FAAA4';
const SIDEBAR_ACTIVE = '#15998B';
const SIDEBAR_HOVER = 'rgba(255,255,255,0.05)';
const SIDEBAR_BORDER = 'rgba(255,255,255,0.07)';

// Mesmo visual do sino (NotificationsBell)
const HEADER_ICON_BUTTON_SX = {
  width: 38,
  height: 38,
  borderRadius: '12px',
  border: '1px solid',
  borderColor: 'divider',
  bgcolor: 'grey.50',
  color: 'text.secondary',
  '&:hover': { bgcolor: 'grey.100' },
} as const;

function isNavPathActive(pathname: string, itemPath: string): boolean {
  return itemPath === '/' ? pathname === '/' : pathname.startsWith(itemPath);
}

interface NavRouteItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  permission?: Permission;
}

interface NavGroup {
  title?: string;
  items: NavRouteItem[];
}

const navGrouped: NavGroup[] = [
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

interface PageMeta {
  title: string;
  subtitle: string;
  /** Entidade do AuditHistoryDialog aberto pelo relógio do header. */
  auditEntity?: string;
}

const PAGE_META: (PageMeta & { path: string; exact?: boolean })[] = [
  { path: '/', exact: true, title: 'Dashboard', subtitle: 'Visão geral da clínica' },
  { path: '/pendencias', title: 'Central de Pendências', subtitle: 'O que precisa de atenção na clínica', auditEntity: 'PendingTask' },
  { path: '/agenda', title: 'Agenda', subtitle: 'Agendamentos e horários', auditEntity: 'Appointment' },
  { path: '/pacientes', title: 'Pacientes', subtitle: 'Cadastro e histórico dos pacientes', auditEntity: 'Patient' },
  { path: '/horarios', title: 'Horários', subtitle: 'Disponibilidade da equipe' },
  { path: '/procedimentos', title: 'Procedimentos', subtitle: 'Catálogo de procedimentos', auditEntity: 'Procedure' },
  { path: '/pacotes', title: 'Pacotes', subtitle: 'Combos de procedimentos e sessões', auditEntity: 'Package' },
  { path: '/promocoes', title: 'Promoções', subtitle: 'Campanhas e descontos sazonais', auditEntity: 'Promotion' },
  { path: '/financeiro', title: 'Financeiro', subtitle: 'Receitas e despesas', auditEntity: 'FinancialEntry' },
  { path: '/despesas-recorrentes', title: 'Despesas recorrentes', subtitle: 'Custos fixos e periódicos', auditEntity: 'RecurringExpense' },
  { path: '/formas-pagamento', title: 'Formas de pagamento', subtitle: 'Métodos de pagamento', auditEntity: 'PaymentMethod' },
  { path: '/estoque', title: 'Estoque', subtitle: 'Produtos e insumos', auditEntity: 'InventoryItem' },
  { path: '/profissionais', title: 'Profissionais', subtitle: 'Equipe que realiza atendimentos' },
  { path: '/usuarios', title: 'Usuários', subtitle: 'Contas e permissões', auditEntity: 'User' },
  { path: '/grupos', title: 'Grupos', subtitle: 'Papéis e permissões', auditEntity: 'Role' },
  { path: '/mensagens', title: 'Mensagens', subtitle: 'Modelos e envios', auditEntity: 'MessageTemplate' },
  { path: '/documentos', title: 'Documentos', subtitle: 'Arquivos e modelos', auditEntity: 'Document' },
  { path: '/equipamentos', title: 'Equipamentos', subtitle: 'Aparelhos e manutenção', auditEntity: 'Equipment' },
  { path: '/metricas', title: 'Métricas', subtitle: 'Indicadores e relatórios' },
  { path: '/metas', title: 'Metas', subtitle: 'Objetivos e progresso da clínica', auditEntity: 'Goal' },
];

function getPageMeta(pathname: string): PageMeta {
  const match = PAGE_META.find((m) =>
    m.exact ? pathname === m.path : pathname === m.path || pathname.startsWith(`${m.path}/`),
  );
  return match ?? { title: 'Mila Barreto', subtitle: '' };
}

export function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, stopImpersonating } = useAuth();
  const isImpersonating = user?.impersonating === true;
  const { has, isAdmin } = usePermissions();
  const { openAppointmentDialog } = useAppointmentDialog();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [moneyHidden, setMoneyHiddenState] = useState(isMoneyHidden);

  const toggleMoneyHidden = () => {
    setMoneyHidden(!moneyHidden);
    setMoneyHiddenState(!moneyHidden);
  };

  const visibleGroups = useMemo(() => {
    return navGrouped
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => !item.permission || has(item.permission)),
      }))
      .filter((group) => group.items.length > 0);
  }, [has]);

  const theme = useTheme();

  const pageMeta = getPageMeta(location.pathname);
  const pageSubtitle =
    location.pathname === '/'
      ? `${pageMeta.subtitle} · Hoje, ${new Intl.DateTimeFormat('pt-BR', {
          day: 'numeric',
          month: 'long',
        }).format(new Date())}`
      : pageMeta.subtitle;

  const userInitials = (user?.name ?? '?')
    .trim()
    .split(/\s+/)
    .map((w) => w[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const currentDrawerWidth = collapsed ? DRAWER_COLLAPSED_WIDTH : DRAWER_WIDTH;

  const navScrollSx = {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    overflowX: 'hidden',
    py: 1.25,
    px: collapsed ? 0.5 : 1,
    scrollbarWidth: 'thin' as const,
    scrollbarColor: `rgba(255,255,255,0.16) transparent`,
    '&::-webkit-scrollbar': { width: 7 },
    '&::-webkit-scrollbar-track': {
      margin: '6px 0',
      backgroundColor: 'transparent',
      borderRadius: 10,
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: 'rgba(255,255,255,0.14)',
      borderRadius: 10,
      border: '2px solid transparent',
      backgroundClip: 'padding-box',
      '&:hover': {
        backgroundColor: 'rgba(255,255,255,0.24)',
      },
    },
  };

  const drawer = (isCollapsed: boolean) => (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        bgcolor: SIDEBAR_BG,
      }}
    >
      <Box
        sx={{
          flexShrink: 0,
          px: isCollapsed ? 0.75 : 2.25,
          py: isCollapsed ? 1 : 2,
          borderBottom: '1px solid',
          borderColor: SIDEBAR_BORDER,
          bgcolor: SIDEBAR_BG,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            width: '100%',
            gap: 1.5,
            justifyContent: isCollapsed ? 'center' : 'flex-start',
          }}
        >
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '12px',
              background: 'linear-gradient(135deg,#22BBAA,#0E7C7B)',
              boxShadow: '0 6px 18px -4px rgba(15,124,123,.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff">
              <path d="M12 3c4.2 5 6.2 8.2 6.2 11.2A6.2 6.2 0 0 1 5.8 14.2C5.8 11.2 7.8 8 12 3z" />
            </svg>
          </Box>
          {!isCollapsed && (
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="subtitle1"
                fontWeight={800}
                sx={{ letterSpacing: '-0.02em', lineHeight: 1.05, color: '#fff' }}
              >
                Mila Barreto
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  mt: 0,
                  lineHeight: 1.1,
                  color: SIDEBAR_TEXT,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  fontSize: fontSizes['3xs'],
                  textTransform: 'uppercase',
                }}
              >
                Estética avançada
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      <Box sx={navScrollSx}>
        {visibleGroups.map((group, groupIndex) => {
          const contentTransition = theme.transitions.create(
            ['opacity', 'max-height', 'padding', 'margin', 'background-color'],
            {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.leavingScreen,
            },
          );
          return (
            <Fragment key={group.items.map((it) => it.path).join('-')}>
              {group.title && (
                <Box
                  component="span"
                  sx={{
                    display: 'block',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    color: SIDEBAR_TEXT,
                    opacity: isCollapsed ? 0 : 0.5,
                    maxHeight: isCollapsed ? 0 : 40,
                    px: 1.75,
                    pt: isCollapsed ? 0 : groupIndex === 0 ? 0.5 : 1.75,
                    pb: isCollapsed ? 0 : 0.75,
                    fontSize: fontSizes['3xs'],
                    fontWeight: 800,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    transition: contentTransition,
                  }}
                >
                  {group.title}
                </Box>
              )}
              <List disablePadding sx={{ px: isCollapsed ? 0.5 : 0.85, py: 0 }}>
                {group.items.map((item) => {
                  const selected = isNavPathActive(location.pathname, item.path);
                  return (
                    <Tooltip
                      key={item.path}
                      title={isCollapsed ? item.label : ''}
                      placement="right"
                      arrow
                      disableHoverListener={!isCollapsed}
                      disableFocusListener={!isCollapsed}
                      disableTouchListener={!isCollapsed}
                    >
                      <ListItemButton
                        selected={selected}
                        onClick={() => {
                          navigate(item.path);
                          setMobileOpen(false);
                        }}
                        sx={{
                          minHeight: 44,
                          mb: 0.35,
                          py: 0.9,
                          px: isCollapsed ? 1.25 : 1.15,
                          borderRadius: '12px',
                          position: 'relative',
                          justifyContent: isCollapsed ? 'center' : 'flex-start',
                          color: selected ? '#fff' : SIDEBAR_TEXT,
                          transition: contentTransition,
                          '& .MuiListItemIcon-root': {
                            minWidth: 0,
                            justifyContent: 'center',
                            mr: isCollapsed ? 0 : 1.75,
                            color: selected ? '#fff' : SIDEBAR_TEXT,
                            transition: contentTransition,
                          },
                          '& .MuiListItemText-root': {
                            my: 0,
                            flexGrow: isCollapsed ? 0 : 1,
                            width: isCollapsed ? 0 : 'auto',
                            overflow: 'hidden',
                            opacity: isCollapsed ? 0 : 1,
                            transition: contentTransition,
                          },
                          '& .MuiListItemText-primary': {
                            whiteSpace: 'nowrap',
                            fontSize: theme.typography.body2.fontSize,
                            fontWeight: selected ? 700 : 600,
                            color: selected ? '#fff' : SIDEBAR_TEXT,
                          },
                          '&.Mui-selected': {
                            bgcolor: SIDEBAR_ACTIVE,
                            color: '#fff',
                            boxShadow: '0 6px 16px -6px rgba(21,153,139,.8)',
                            '& .MuiListItemIcon-root': { color: '#fff' },
                            '& .MuiListItemText-primary': { color: '#fff' },
                            '&:hover': { bgcolor: SIDEBAR_ACTIVE },
                            '&::before': {
                              content: '""',
                              position: 'absolute',
                              left: 0,
                              top: '50%',
                              transform: 'translateY(-50%)',
                              width: 3,
                              height: 18,
                              borderRadius: '0 4px 4px 0',
                              bgcolor: '#fff',
                              opacity: isCollapsed ? 0 : 1,
                            },
                          },
                          '&:hover': {
                            bgcolor: SIDEBAR_HOVER,
                          },
                        }}
                      >
                        <ListItemIcon>{item.icon}</ListItemIcon>
                        <ListItemText primary={item.label} />
                      </ListItemButton>
                    </Tooltip>
                  );
                })}
              </List>
            </Fragment>
          );
        })}
      </Box>

      <Box
        sx={{
          flexShrink: 0,
          px: isCollapsed ? 0.75 : 1.5,
          py: 1.25,
          borderTop: '1px solid',
          borderColor: SIDEBAR_BORDER,
        }}
      >
        {isCollapsed ? (
          <Stack alignItems="center" spacing={1}>
            <Tooltip title={`${user?.name ?? 'Usuário'}${user?.roleName ? ` · ${user.roleName}` : ''}`} placement="right">
              <Avatar
                variant="rounded"
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: '11px',
                  background: 'linear-gradient(135deg,#3A6B64,#1F4A45)',
                  color: '#CFECE7',
                  fontSize: fontSizes.xs,
                  fontWeight: 700,
                }}
              >
                {userInitials}
              </Avatar>
            </Tooltip>
            <Tooltip title="Sair" placement="right">
              <IconButton
                size="small"
                onClick={logout}
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: '10px',
                  bgcolor: SIDEBAR_HOVER,
                  color: SIDEBAR_TEXT,
                  '&:hover': { color: '#F08A8A', bgcolor: 'rgba(214,90,90,.18)' },
                }}
              >
                <AuroraIcon name="logout" size={18} strokeWidth={2} />
              </IconButton>
            </Tooltip>
          </Stack>
        ) : (
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Avatar
              variant="rounded"
              sx={{
                width: 38,
                height: 38,
                borderRadius: '11px',
                background: 'linear-gradient(135deg,#3A6B64,#1F4A45)',
                color: '#CFECE7',
                fontSize: fontSizes.xs,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {userInitials}
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography noWrap sx={{ fontSize: fontSizes.sm, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
                {user?.name ?? 'Usuário'}
              </Typography>
              {user?.roleName && (
                <Typography noWrap sx={{ fontSize: fontSizes['2xs'], color: SIDEBAR_TEXT, lineHeight: 1.2 }}>
                  {user.roleName}
                </Typography>
              )}
            </Box>
            <Tooltip title="Sair">
              <IconButton
                size="small"
                onClick={logout}
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: '10px',
                  bgcolor: SIDEBAR_HOVER,
                  color: SIDEBAR_TEXT,
                  flexShrink: 0,
                  '&:hover': { color: '#F08A8A', bgcolor: 'rgba(214,90,90,.18)' },
                }}
              >
                <AuroraIcon name="logout" size={18} strokeWidth={2} />
              </IconButton>
            </Tooltip>
          </Stack>
        )}
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {isImpersonating && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: theme.zIndex.modal + 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            py: 0.75,
            px: 2,
            bgcolor: '#C25A4C',
            color: '#fff',
          }}
        >
          <SwitchAccountIcon sx={{ fontSize: 20 }} />
          <Typography variant="body2" fontWeight={600}>
            Você está visualizando como {user?.name}
          </Typography>
          <Box
            component="button"
            onClick={stopImpersonating}
            sx={{
              ml: 1,
              px: 2,
              py: 0.5,
              border: '1px solid rgba(255,255,255,0.6)',
              borderRadius: 1.5,
              bgcolor: 'transparent',
              color: '#fff',
              cursor: 'pointer',
              fontSize: fontSizes.sm,
              fontWeight: 600,
              '&:hover': { bgcolor: 'rgba(255,255,255,0.15)' },
            }}
          >
            Voltar à minha conta
          </Box>
        </Box>
      )}
      <AppBar
        position="fixed"
        color="inherit"
        elevation={0}
        sx={{
          top: isImpersonating ? 40 : 0,
          width: { md: `calc(100% - ${currentDrawerWidth}px)` },
          ml: { md: `${currentDrawerWidth}px` },
          transition: theme.transitions.create(['width', 'margin-left'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Toolbar sx={{ minHeight: { xs: 58, md: 66 }, px: { xs: 1.5, md: 2.5 }, gap: 1.5 }}>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setMobileOpen(!mobileOpen)}
            sx={{
              mr: { xs: 0.5, md: 0 },
              display: { md: 'none' },
              border: '1px solid',
              borderColor: alpha(theme.palette.divider, 0.9),
              borderRadius: 2,
            }}
          >
            <AuroraIcon name="menu" size={22} strokeWidth={1.9} />
          </IconButton>

          <IconButton
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
            sx={{
              display: { xs: 'none', md: 'inline-flex' },
              width: 40,
              height: 40,
              mr: 1.5,
              color: 'text.secondary',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: '11px',
              '&:hover': { color: 'primary.main', borderColor: 'primary.main' },
            }}
          >
            <AuroraIcon name="menu" size={20} strokeWidth={1.9} />
          </IconButton>

          <Box sx={{ minWidth: 0, mr: 1.5 }}>
            <Typography
              noWrap
              component="h1"
              sx={{
                fontSize: { xs: '1.05rem', md: '1.25rem' },
                fontWeight: 800,
                letterSpacing: '-0.5px',
                lineHeight: 1.15,
                color: 'text.primary',
              }}
            >
              {pageMeta.title}
            </Typography>
            {pageSubtitle && (
              <Typography
                noWrap
                variant="caption"
                sx={{
                  display: { xs: 'none', sm: 'block' },
                  color: 'text.secondary',
                  fontWeight: 500,
                  lineHeight: 1.2,
                }}
              >
                {pageSubtitle}
              </Typography>
            )}
          </Box>

          <Box sx={{ flex: 1 }} />

          <Stack direction="row" spacing={{ xs: 0.75, sm: 1 }} alignItems="center" sx={{ flexShrink: 0 }}>
            {isAdmin && pageMeta.auditEntity && (
              <Tooltip title="Histórico de alterações">
                <IconButton onClick={() => setHistoryOpen(true)} sx={HEADER_ICON_BUTTON_SX}>
                  <AuroraIcon name="clock" size={20} strokeWidth={1.8} />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip title={moneyHidden ? 'Mostrar valores' : 'Ocultar valores'}>
              <IconButton
                onClick={toggleMoneyHidden}
                aria-pressed={moneyHidden}
                sx={{
                  ...HEADER_ICON_BUTTON_SX,
                  ...(moneyHidden && {
                    bgcolor: 'primary.main',
                    borderColor: 'primary.main',
                    color: 'primary.contrastText',
                    '&:hover': { bgcolor: 'primary.dark' },
                  }),
                }}
              >
                <AuroraIcon name={moneyHidden ? 'eyeOff' : 'eye'} size={20} strokeWidth={1.8} />
              </IconButton>
            </Tooltip>
            <NotificationsBell />
            {has('appointments:view') && (
              <>
                <Box sx={{ display: { xs: 'none', sm: 'block' }, width: '1px', height: 26, bgcolor: 'divider', mx: 1 }} />
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AuroraIcon name="plus" size={18} strokeWidth={2.2} />}
                  onClick={() => openAppointmentDialog()}
                  sx={{
                    height: 38,
                    minWidth: { xs: 38, sm: 64 },
                    px: { xs: 1.25, md: 2.25 },
                    borderRadius: '12px',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    boxShadow: '0 6px 16px -6px rgba(21,153,139,.8)',
                    '& .MuiButton-startIcon': { mr: { xs: 0, sm: 1 }, ml: { xs: 0, sm: -0.5 } },
                  }}
                >
                  <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
                    Novo agendamento
                  </Box>
                </Button>
              </>
            )}
          </Stack>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{
          width: { md: currentDrawerWidth },
          flexShrink: { md: 0 },
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              bgcolor: SIDEBAR_BG,
              borderRight: 'none',
              ...(isImpersonating ? { top: 40, height: 'calc(100% - 40px)' } : {}),
            },
          }}
        >
          {drawer(false)}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              width: currentDrawerWidth,
              borderRight: 'none',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              bgcolor: SIDEBAR_BG,
              transition: theme.transitions.create('width', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.leavingScreen,
              }),
              overflowX: 'hidden',
              ...(isImpersonating ? { top: 40, height: 'calc(100% - 40px)' } : {}),
            },
          }}
          open
        >
          {drawer(collapsed)}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 1.5, sm: 2, md: 4 },
          width: { md: `calc(100% - ${currentDrawerWidth}px)` },
          overflow: 'hidden',
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
        }}
      >
        <Toolbar />
        {isImpersonating && <Box sx={{ height: 40 }} />}
        {/* Remonta a página ao alternar o olho para os formatadores de moeda relerem a preferência. */}
        <Fragment key={moneyHidden ? 'money-hidden' : 'money-visible'}>
          <Outlet />
        </Fragment>
      </Box>

      {pageMeta.auditEntity && (
        <AuditHistoryDialog
          key={pageMeta.auditEntity}
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          entity={pageMeta.auditEntity}
          title={pageMeta.title}
        />
      )}
    </Box>
  );
}

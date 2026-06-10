import { Fragment, useState, useMemo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  alpha,
  AppBar,
  Avatar,
  Box,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DashboardIcon from '@mui/icons-material/Dashboard';
import EventIcon from '@mui/icons-material/Event';
import PeopleIcon from '@mui/icons-material/People';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import SpaIcon from '@mui/icons-material/Spa';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import LogoutIcon from '@mui/icons-material/Logout';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import SwitchAccountIcon from '@mui/icons-material/SwitchAccount';

import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing';
import BadgeIcon from '@mui/icons-material/Badge';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import RepeatIcon from '@mui/icons-material/Repeat';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import InsightsIcon from '@mui/icons-material/Insights';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import CreditCardIcon from '@mui/icons-material/CreditCard';

import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../contexts/usePermissions';
import type { Permission } from '../contexts/permissions';
import { NotificationsBell } from './notifications/NotificationsBell';
import { APP_VERSION } from '../version';

const DRAWER_WIDTH = 258;
const DRAWER_COLLAPSED_WIDTH = 68;

function isNavPathActive(pathname: string, itemPath: string): boolean {
  return itemPath === '/' ? pathname === '/' : pathname.startsWith(itemPath);
}

interface NavRouteItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  permission?: Permission;
}

const navGrouped: NavRouteItem[][] = [
  [{ label: 'Dashboard', path: '/', icon: <DashboardIcon /> }],
  [
    { label: 'Agenda', path: '/agenda', icon: <EventIcon />, permission: 'appointments:view' },
    { label: 'Pacientes', path: '/pacientes', icon: <PeopleIcon />, permission: 'patients:view' },
    { label: 'Horários', path: '/horarios', icon: <AccessTimeIcon /> },
  ],
  [
    {
      label: 'Procedimentos',
      path: '/procedimentos',
      icon: <SpaIcon />,
      permission: 'procedures:view',
    },
    {
      label: 'Pacotes',
      path: '/pacotes',
      icon: <ViewInArIcon />,
      permission: 'packages:view',
    },
    {
      label: 'Estoque',
      path: '/estoque',
      icon: <Inventory2Icon />,
      permission: 'inventory:view',
    },
  ],
  [
    {
      label: 'Financeiro',
      path: '/financeiro',
      icon: <AccountBalanceWalletIcon />,
      permission: 'finance:view',
    },
    {
      label: 'Despesas recorrentes',
      path: '/despesas-recorrentes',
      icon: <RepeatIcon />,
      permission: 'finance:view',
    },
    {
      label: 'Formas de pagamento',
      path: '/formas-pagamento',
      icon: <CreditCardIcon />,
      permission: 'payment-methods:view',
    },
    {
      label: 'Promoções',
      path: '/promocoes',
      icon: <LocalOfferIcon />,
      permission: 'promotions:view',
    },
    {
      label: 'Métricas',
      path: '/metricas',
      icon: <InsightsIcon />,
      permission: 'metrics:view',
    },
  ],
  [
    {
      label: 'Profissionais',
      path: '/profissionais',
      icon: <BadgeIcon />,
      permission: 'users:view',
    },
    {
      label: 'Grupos',
      path: '/grupos',
      icon: <GroupsOutlinedIcon />,
      permission: 'roles:view',
    },
  ],
  [
    {
      label: 'Mensagens',
      path: '/mensagens',
      icon: <ChatBubbleOutlineIcon />,
      permission: 'messages:view',
    },
    {
      label: 'Documentos',
      path: '/documentos',
      icon: <FolderOutlinedIcon />,
      permission: 'documents:view',
    },
    {
      label: 'Equipamentos',
      path: '/equipamentos',
      icon: <PrecisionManufacturingIcon />,
      permission: 'equipment:view',
    },
  ],
];

export function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, stopImpersonating } = useAuth();
  const isImpersonating = user?.impersonating === true;
  const { has } = usePermissions();

  const visibleGroups = useMemo(() => {
    return navGrouped
      .map((group) => group.filter((item) => !item.permission || has(item.permission)))
      .filter((group) => group.length > 0);
  }, [has]);

  const theme = useTheme();

  const currentDrawerWidth = collapsed ? DRAWER_COLLAPSED_WIDTH : DRAWER_WIDTH;

  const navScrollSx = {
    flex: 1,
    minHeight: 0,
    overflow: 'auto',
    py: 1.25,
    px: collapsed ? 0.5 : 1,
    scrollbarWidth: 'thin' as const,
    scrollbarColor: `${alpha(theme.palette.text.secondary, 0.32)} ${alpha(theme.palette.divider, 0.12)}`,
    '&::-webkit-scrollbar': { width: 7 },
    '&::-webkit-scrollbar-track': {
      margin: '6px 0',
      backgroundColor: alpha(theme.palette.divider, 0.12),
      borderRadius: 10,
    },
    '&::-webkit-scrollbar-thumb': {
      backgroundColor: alpha(theme.palette.text.secondary, 0.28),
      borderRadius: 10,
      border: `2px solid ${alpha(theme.palette.background.paper, 0)}`,
      backgroundClip: 'padding-box',
      '&:hover': {
        backgroundColor: alpha(theme.palette.text.secondary, 0.42),
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
        bgcolor: '#FFFFFF',
      }}
    >
      <Box
        sx={{
          flexShrink: 0,
          px: isCollapsed ? 0.75 : 2.25,
          py: isCollapsed ? 1 : 2,
          borderBottom: '1px solid',
          borderColor: alpha(theme.palette.divider, 0.85),
          bgcolor: '#FFFFFF',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            width: '100%',
            gap: 0.5,
            justifyContent: isCollapsed ? 'flex-end' : 'space-between',
          }}
        >
          {!isCollapsed && (
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0, flex: 1 }}>
              <Avatar
                variant="rounded"
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2,
                  bgcolor: 'primary.main',
                  fontSize: '0.95rem',
                  fontWeight: 800,
                  boxShadow: `0 3px 10px ${alpha(theme.palette.primary.main, 0.35)}`,
                  flexShrink: 0,
                }}
              >
                MB
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  variant="subtitle1"
                  fontWeight={800}
                  sx={{ letterSpacing: '-0.02em', lineHeight: 1.25 }}
                >
                  Mila Barreto
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
                  Gestão da clínica
                </Typography>
              </Box>
            </Stack>
          )}

          <Tooltip
            title={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
            placement="right"
            sx={{ display: { xs: 'none', md: 'flex' }, flexShrink: 0 }}
          >
            <IconButton
              size="small"
              onClick={() => setCollapsed((c) => !c)}
              sx={{
                color: 'text.secondary',
                '&:hover': { color: 'primary.main' },
              }}
            >
              {isCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Box sx={navScrollSx}>
        {visibleGroups.map((group, groupIndex) => (
          <Fragment key={group.map((it) => it.path).join('-')}>
            <List disablePadding sx={{ px: isCollapsed ? 0.25 : 0.85, py: groupIndex === 0 ? 0.25 : 0 }}>
              {group.map((item) => {
                const selected = isNavPathActive(location.pathname, item.path);
                return isCollapsed ? (
                  <Tooltip key={item.path} title={item.label} placement="right" arrow>
                    <ListItemButton
                      selected={selected}
                      onClick={() => {
                        navigate(item.path);
                        setMobileOpen(false);
                      }}
                      sx={{
                        mb: 0.2,
                        py: 0.85,
                        px: 0,
                        borderRadius: 1.25,
                        justifyContent: 'center',
                        minHeight: 42,
                        borderLeft: '3px solid',
                        borderLeftColor: selected ? theme.palette.primary.main : 'transparent',
                        '& .MuiListItemIcon-root': {
                          minWidth: 0,
                          color: selected ? 'primary.main' : 'text.secondary',
                        },
                        '&.Mui-selected': {
                          bgcolor: alpha(theme.palette.primary.main, 0.07),
                        },
                        '&:hover': {
                          bgcolor: alpha(theme.palette.primary.main, 0.045),
                        },
                        '&.Mui-selected:hover': {
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                        },
                      }}
                    >
                      <ListItemIcon sx={{ '& .MuiSvgIcon-root': { fontSize: 22 } }}>{item.icon}</ListItemIcon>
                    </ListItemButton>
                  </Tooltip>
                ) : (
                  <ListItemButton
                    key={item.path}
                    selected={selected}
                    onClick={() => {
                      navigate(item.path);
                      setMobileOpen(false);
                    }}
                    sx={{
                      mx: 0.35,
                      mb: 0.2,
                      py: 0.85,
                      px: 1.15,
                      pl: theme.spacing(1.15),
                      borderRadius: 1.25,
                      borderLeft: '3px solid',
                      borderLeftColor: selected ? theme.palette.primary.main : 'transparent',
                      '& .MuiListItemIcon-root': {
                        minWidth: 40,
                        color: selected ? 'primary.main' : 'text.secondary',
                      },
                      '& .MuiListItemText-primary': {
                        fontSize: theme.typography.body2.fontSize,
                        fontWeight: selected ? 600 : 480,
                      },
                      '&.Mui-selected': {
                        bgcolor: alpha(theme.palette.primary.main, 0.07),
                      },
                      '&:hover': {
                        bgcolor: alpha(theme.palette.primary.main, 0.045),
                      },
                      '&.Mui-selected:hover': {
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                      },
                    }}
                  >
                    <ListItemIcon sx={{ '& .MuiSvgIcon-root': { fontSize: 22 } }}>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.label} />
                  </ListItemButton>
                );
              })}
            </List>
            {groupIndex < visibleGroups.length - 1 && (
              <Divider sx={{ mx: isCollapsed ? 0.5 : 1.5, my: 1, opacity: 0.85 }} />
            )}
          </Fragment>
        ))}
      </Box>

      <Box
        sx={{
          flexShrink: 0,
          px: isCollapsed ? 0.5 : 2,
          py: 1.25,
          borderTop: '1px solid',
          borderColor: alpha(theme.palette.divider, 0.85),
        }}
      >
        {isCollapsed ? (
          <Tooltip title={`Versão ${APP_VERSION}`} placement="right">
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', textAlign: 'center', fontSize: '0.62rem', lineHeight: 1.3 }}
            >
              v{APP_VERSION}
            </Typography>
          </Tooltip>
        ) : (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
            Versão {APP_VERSION}
          </Typography>
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
              fontSize: '0.8rem',
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
          borderColor: alpha(theme.palette.divider, 0.95),
          background: `linear-gradient(180deg,
            ${alpha(theme.palette.background.paper, 0.98)} 0%,
            ${alpha(theme.palette.primary.main, 0.03)} 100%)`,
          backdropFilter: 'blur(10px)',
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
            <MenuIcon />
          </IconButton>

          <Box sx={{ flex: 1 }} />

          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ flexShrink: 0 }}>
            <NotificationsBell />
            <Box
              component="button"
              type="button"
              onClick={(e) => setAnchorEl(e.currentTarget as HTMLElement)}
              aria-label="Menu da conta"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                ml: 0.5,
                py: 0.5,
                pl: 0.5,
                pr: { xs: 0.5, sm: 1.25 },
                border: '1px solid',
                borderColor: alpha(theme.palette.divider, 0.95),
                borderRadius: 999,
                bgcolor: alpha(theme.palette.background.paper, 0.85),
                cursor: 'pointer',
                transition: 'box-shadow 120ms ease, border-color 120ms ease',
                '&:hover': {
                  borderColor: alpha(theme.palette.primary.main, 0.35),
                  boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.12)}`,
                },
              }}
            >
              <Avatar sx={{ bgcolor: 'primary.main', width: 34, height: 34, fontSize: '0.9rem' }}>
                {user?.name?.charAt(0).toUpperCase() ?? '?'}
              </Avatar>
              <Box sx={{ display: { xs: 'none', md: 'block' }, textAlign: 'left', minWidth: 0 }}>
                <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: 140, lineHeight: 1.2 }}>
                  {user?.name ?? 'Usuário'}
                </Typography>
                {user?.roleName && (
                  <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 140, display: 'block' }}>
                    {user.roleName}
                  </Typography>
                )}
              </Box>
              <KeyboardArrowDownIcon
                sx={{ display: { xs: 'none', md: 'block' }, fontSize: 20, color: 'text.secondary' }}
              />
            </Box>
          </Stack>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            PaperProps={{
              sx: {
                mt: 1,
                minWidth: 220,
                borderRadius: 2,
                border: '1px solid',
                borderColor: alpha(theme.palette.divider, 0.9),
                boxShadow: `0 8px 24px ${alpha(theme.palette.common.black, 0.08)}`,
              },
            }}
          >
            <MenuItem disabled>
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  {user?.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {user?.email}
                </Typography>
                {user?.roleName && (
                  <Box sx={{ mt: 0.5 }}>
                    <Chip
                      size="small"
                      label={user.roleName}
                      color="primary"
                      variant="outlined"
                    />
                  </Box>
                )}
              </Box>
            </MenuItem>
            <Divider />
            <MenuItem onClick={logout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              Sair
            </MenuItem>
          </Menu>
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
              bgcolor: '#FFFFFF',
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
              borderRight: '1px solid #E8E6E2',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              bgcolor: '#FFFFFF',
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
        <Outlet />
      </Box>
    </Box>
  );
}

import { Fragment } from 'react';
import {
  Avatar,
  Box,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';

import type { User } from '../../types';
import { AuroraIcon } from '../AuroraIcon';
import { fontSizes } from '../../theme/fontSizes';
import { isNavPathActive, type NavGroup } from './navConfig';
import {
  SIDEBAR_ACTIVE,
  SIDEBAR_BG,
  SIDEBAR_BORDER,
  SIDEBAR_HOVER,
  SIDEBAR_TEXT,
  drawerTransition,
} from './layoutTheme';

const USER_AVATAR_SX = {
  width: 38,
  height: 38,
  borderRadius: '11px',
  background: 'linear-gradient(135deg,#3A6B64,#1F4A45)',
  color: '#CFECE7',
  fontSize: fontSizes.xs,
  fontWeight: 700,
} as const;

const LOGOUT_BUTTON_SX = {
  width: 34,
  height: 34,
  borderRadius: '10px',
  bgcolor: SIDEBAR_HOVER,
  color: SIDEBAR_TEXT,
  '&:hover': { color: '#F08A8A', bgcolor: 'rgba(214,90,90,.18)' },
} as const;

function userInitials(name: string | undefined) {
  return (name ?? '?')
    .trim()
    .split(/\s+/)
    .map((w) => w[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

interface SidebarContentProps {
  collapsed: boolean;
  groups: NavGroup[];
  pathname: string;
  onNavigate: (path: string) => void;
  user: User | null;
  onLogout: () => void;
}

export function SidebarContent({ collapsed: isCollapsed, groups, pathname, onNavigate, user, onLogout }: SidebarContentProps) {
  const theme = useTheme();
  const initials = userInitials(user?.name);

  const navScrollSx = {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    overflowX: 'hidden',
    py: 1.25,
    px: isCollapsed ? 0.5 : 1,
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

  const contentTransition = drawerTransition(theme, [
    'opacity',
    'max-height',
    'padding',
    'margin',
    'background-color',
  ]);

  return (
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
        {groups.map((group, groupIndex) => (
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
                const selected = isNavPathActive(pathname, item.path);
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
                      onClick={() => onNavigate(item.path)}
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
        ))}
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
              <Avatar variant="rounded" sx={USER_AVATAR_SX}>
                {initials}
              </Avatar>
            </Tooltip>
            <Tooltip title="Sair" placement="right">
              <IconButton size="small" onClick={onLogout} sx={LOGOUT_BUTTON_SX}>
                <AuroraIcon name="logout" size={18} strokeWidth={2} />
              </IconButton>
            </Tooltip>
          </Stack>
        ) : (
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Avatar variant="rounded" sx={{ ...USER_AVATAR_SX, flexShrink: 0 }}>
              {initials}
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
              <IconButton size="small" onClick={onLogout} sx={{ ...LOGOUT_BUTTON_SX, flexShrink: 0 }}>
                <AuroraIcon name="logout" size={18} strokeWidth={2} />
              </IconButton>
            </Tooltip>
          </Stack>
        )}
      </Box>
    </Box>
  );
}

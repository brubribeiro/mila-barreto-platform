import { Box, ButtonBase, Tooltip, Typography } from '@mui/material';
import { useMemo } from 'react';

import { ACTIONS, RESOURCES } from '../../contexts/permissions';
import type { ActionKey, Permission } from '../../contexts/permissions';
import { AuroraIcon } from '../AuroraIcon';
import { fontSizes } from '../../theme/fontSizes';

interface PermissionsMatrixProps {
  value: readonly string[];
  onChange?: (next: string[]) => void;
  /** Sem `onChange` ou com `readOnly`, a matriz só exibe as marcas. */
  readOnly?: boolean;
}

const ACTION_SHORT_LABELS: Record<ActionKey, string> = {
  view: 'Ver',
  create: 'Criar',
  edit: 'Editar',
  delete: 'Excluir',
};

const GRID_SX = {
  display: 'grid',
  gridTemplateColumns: '1.6fr repeat(4, minmax(64px, 1fr))',
  gap: 1,
  alignItems: 'center',
  px: { xs: 2, sm: 2.75 },
} as const;

const CHECK_COLOR = '#11A893';

function Mark({ on }: { on: boolean }) {
  return on ? (
    <Box
      sx={{
        width: 24,
        height: 24,
        borderRadius: '8px',
        bgcolor: 'rgba(17,168,147,.14)',
        color: CHECK_COLOR,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <AuroraIcon name="check" size={15} strokeWidth={2.2} />
    </Box>
  ) : (
    <Box
      sx={{
        width: 24,
        height: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'text.disabled',
        fontWeight: 700,
      }}
    >
      —
    </Box>
  );
}

export function PermissionsMatrix({ value, onChange, readOnly }: PermissionsMatrixProps) {
  const set = useMemo(() => new Set(value), [value]);
  const editable = !!onChange && !readOnly;

  const apply = (perms: Permission[]) => {
    if (!onChange) return;
    const allOn = perms.every((p) => set.has(p));
    const next = new Set(set);
    perms.forEach((p) => (allOn ? next.delete(p) : next.add(p)));
    onChange([...next]);
  };

  return (
    <Box sx={{ overflowX: 'auto' }}>
      <Box sx={{ minWidth: 480 }}>
        <Box
          sx={{
            ...GRID_SX,
            py: 1.5,
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'grey.50',
          }}
        >
          <HeaderLabel>Módulo</HeaderLabel>
          {ACTIONS.map((a) => {
            const label = <HeaderLabel center>{ACTION_SHORT_LABELS[a.key]}</HeaderLabel>;
            return editable ? (
              <Tooltip key={a.key} title={`Marcar/desmarcar "${a.label}" em todos os módulos`}>
                <ButtonBase
                  onClick={() => apply(RESOURCES.map((r) => `${r.key}:${a.key}` as Permission))}
                  sx={{ borderRadius: '8px', py: 0.25, '&:hover': { bgcolor: 'grey.100' } }}
                >
                  {label}
                </ButtonBase>
              </Tooltip>
            ) : (
              <Box key={a.key}>{label}</Box>
            );
          })}
        </Box>

        {RESOURCES.map((r, index) => {
          const rowPerms = ACTIONS.map((a) => `${r.key}:${a.key}` as Permission);
          return (
            <Box
              key={r.key}
              sx={{
                ...GRID_SX,
                py: 1.5,
                borderBottom: index === RESOURCES.length - 1 ? 0 : 1,
                borderColor: 'grey.100',
              }}
            >
              {editable ? (
                <Tooltip title="Marcar/desmarcar o módulo inteiro" placement="top-start">
                  <ButtonBase
                    onClick={() => apply(rowPerms)}
                    sx={{
                      justifyContent: 'flex-start',
                      textAlign: 'left',
                      borderRadius: '8px',
                      mx: -0.75,
                      px: 0.75,
                      py: 0.25,
                      '&:hover': { bgcolor: 'grey.100' },
                    }}
                  >
                    <ModuleLabel>{r.label}</ModuleLabel>
                  </ButtonBase>
                </Tooltip>
              ) : (
                <ModuleLabel>{r.label}</ModuleLabel>
              )}
              {rowPerms.map((perm, i) => (
                <Box key={perm} sx={{ display: 'flex', justifyContent: 'center' }}>
                  {editable ? (
                    <ButtonBase
                      aria-label={`${ACTIONS[i].label} ${r.label}`}
                      aria-pressed={set.has(perm)}
                      onClick={() => apply([perm])}
                      sx={{
                        borderRadius: '9px',
                        p: 0.25,
                        border: 1,
                        borderColor: 'transparent',
                        '&:hover': { borderColor: 'divider', bgcolor: 'grey.50' },
                      }}
                    >
                      <Mark on={set.has(perm)} />
                    </ButtonBase>
                  ) : (
                    <Mark on={set.has(perm)} />
                  )}
                </Box>
              ))}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

function HeaderLabel({ children, center }: { children: string; center?: boolean }) {
  return (
    <Typography
      component="span"
      sx={{
        display: 'block',
        width: '100%',
        textAlign: center ? 'center' : 'left',
        fontSize: fontSizes['2xs'],
        fontWeight: 700,
        letterSpacing: '0.4px',
        textTransform: 'uppercase',
        color: 'text.disabled',
      }}
    >
      {children}
    </Typography>
  );
}

function ModuleLabel({ children }: { children: string }) {
  return (
    <Typography component="span" sx={{ fontSize: fontSizes.sm, fontWeight: 700, color: 'text.primary' }}>
      {children}
    </Typography>
  );
}

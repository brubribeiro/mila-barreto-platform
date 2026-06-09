import {
  Box,
  Button,
  Checkbox,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useMemo } from 'react';

import { ACTIONS, ALL_PERMISSIONS, countCatalogPermissions, RESOURCES } from '../../contexts/permissions';
import type { Permission } from '../../contexts/permissions';

interface PermissionsMatrixProps {
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  disableClear?: boolean;
}

/**
 * Matriz de checkboxes 7 recursos × 4 ações.
 * Permite marcar/desmarcar linha inteira (recurso) e coluna inteira (ação).
 */
export function PermissionsMatrix({ value, onChange, disabled, disableClear }: PermissionsMatrixProps) {
  const set = useMemo(() => new Set(value), [value]);

  const toggle = (perm: Permission) => {
    const next = new Set(set);
    if (next.has(perm)) next.delete(perm);
    else next.add(perm);
    onChange([...next]);
  };

  const toggleRow = (resourceKey: string) => {
    const rowPerms = ACTIONS.map((a) => `${resourceKey}:${a.key}` as Permission);
    const allOn = rowPerms.every((p) => set.has(p));
    const next = new Set(set);
    rowPerms.forEach((p) => (allOn ? next.delete(p) : next.add(p)));
    onChange([...next]);
  };

  const toggleColumn = (actionKey: string) => {
    const colPerms = RESOURCES.map((r) => `${r.key}:${actionKey}` as Permission);
    const allOn = colPerms.every((p) => set.has(p));
    const next = new Set(set);
    colPerms.forEach((p) => (allOn ? next.delete(p) : next.add(p)));
    onChange([...next]);
  };

  const selectAll = () => onChange(
    RESOURCES.flatMap((r) => ACTIONS.map((a) => `${r.key}:${a.key}`)),
  );
  const clearAll = () => onChange([]);

  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
        <Button size="small" onClick={selectAll} disabled={disabled}>
          Marcar todas
        </Button>
        <Button size="small" onClick={clearAll} disabled={disabled || disableClear}>
          Limpar
        </Button>
        <Box sx={{ flex: 1 }} />
        <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
          {countCatalogPermissions(value)} de {ALL_PERMISSIONS.length} selecionada(s)
        </Typography>
      </Stack>

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 600 }}>Recurso</TableCell>
            {ACTIONS.map((a) => (
              <TableCell key={a.key} align="center" sx={{ fontWeight: 600 }}>
                <Stack alignItems="center">
                  <Typography variant="caption" color="text.secondary">
                    {a.label}
                  </Typography>
                  <Button
                    size="small"
                    sx={{ minWidth: 0, fontSize: 11, py: 0 }}
                    onClick={() => toggleColumn(a.key)}
                    disabled={disabled}
                  >
                    todos
                  </Button>
                </Stack>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {RESOURCES.map((r) => (
            <TableRow key={r.key} hover>
              <TableCell>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography variant="body2" fontWeight={500}>
                    {r.label}
                  </Typography>
                  <Button
                    size="small"
                    sx={{ minWidth: 0, fontSize: 11, py: 0 }}
                    onClick={() => toggleRow(r.key)}
                    disabled={disabled}
                  >
                    todas
                  </Button>
                </Stack>
              </TableCell>
              {ACTIONS.map((a) => {
                const perm = `${r.key}:${a.key}` as Permission;
                return (
                  <TableCell key={a.key} align="center" padding="none">
                    <Checkbox
                      checked={set.has(perm)}
                      onChange={() => toggle(perm)}
                      disabled={disabled}
                      size="small"
                    />
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

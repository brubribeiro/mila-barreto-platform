import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Alert, Box } from '@mui/material';

import { usePermissions } from '../contexts/usePermissions';
import type { Permission } from '../contexts/permissions';

interface PermissionRouteProps {
  permission: Permission;
  children: ReactNode;
  fallback?: string;
}

/**
 * Protege uma rota exigindo uma permissão específica.
 * Sem permissão → redireciona para o fallback (padrão: /).
 */
export function PermissionRoute({ permission, children, fallback = '/' }: PermissionRouteProps) {
  const { has, permissions } = usePermissions();
  if (permissions.length === 0) return <Navigate to="/login" replace />;
  if (!has(permission)) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
        <Alert severity="warning">
          Você não tem permissão para acessar esta página.
        </Alert>
        <Navigate to={fallback} replace />
      </Box>
    );
  }
  return <>{children}</>;
}

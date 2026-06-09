import { useMemo } from 'react';
import { useAuth } from './AuthContext';
import type { Permission } from './permissions';

export function usePermissions() {
  const { user } = useAuth();
  return useMemo(() => {
    const permissions = new Set(user?.permissions ?? []);
    const has = (perm: Permission) => permissions.has(perm);
    const hasAny = (...perms: Permission[]) => perms.some(has);
    return {
      permissions: user?.permissions ?? [],
      roleName: user?.roleName,
      isAdmin: user?.roleName === 'Administrador',
      restrictToOwnAppointments: !!user?.restrictToOwnAppointments,
      has,
      hasAny,
    };
  }, [user]);
}

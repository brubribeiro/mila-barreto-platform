import { SetMetadata } from '@nestjs/common';
import type { Permission } from '../permissions';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Exige uma ou mais permissões para acessar a rota.
 * Uso: @RequirePermissions('patients:view', 'patients:edit')
 * Sem decorator, qualquer usuário autenticado tem acesso.
 */
export const RequirePermissions = (...perms: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, perms);

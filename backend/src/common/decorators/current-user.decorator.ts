import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  /** Clínica do usuário. Null só para super-admin. */
  tenantId: string | null;
  /** Super-admin da plataforma: sem clínica e sem grupo; só usa rotas com SuperAdminGuard. */
  isSuperAdmin: boolean;
  roleId: string | null;
  roleName: string;
  permissions: string[];
  restrictToOwnAppointments: boolean;
  active: boolean;
  providesAppointments: boolean;
  /** Preenchido quando um admin está personificando este usuário */
  impersonatorId?: string;
}

/**
 * Injeta o usuário autenticado (vindo do JwtStrategy.validate) no handler.
 * Uso: foo(@CurrentUser() user: AuthenticatedUser) { ... }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

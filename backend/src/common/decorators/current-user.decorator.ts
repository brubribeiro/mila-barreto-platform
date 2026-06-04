import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  roleId: string;
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

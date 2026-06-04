import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { SYSTEM_ADMIN_ROLE_NAME, type Permission } from '../permissions';

/**
 * Guard que valida se o usuário tem todas as permissões exigidas pela rota.
 * Combinar com JwtAuthGuard nos controllers: @UseGuards(JwtAuthGuard, PermissionsGuard)
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Permission[] | undefined>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException('Não autenticado.');

    if (user.roleName === SYSTEM_ADMIN_ROLE_NAME) return true;

    const userPerms: string[] = user.permissions ?? [];
    const missing = required.filter((p) => !userPerms.includes(p));
    if (missing.length > 0) {
      throw new ForbiddenException(`Permissão necessária: ${missing.join(', ')}`);
    }
    return true;
  }
}

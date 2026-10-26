import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { TenantContext } from '../tenancy/tenant-context';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';

/** Autentica pelo JWT e define a clínica do usuário no contexto da requisição. */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const allowed = (await super.canActivate(context)) as boolean;
    const user: AuthenticatedUser | undefined = context.switchToHttp().getRequest().user;
    if (allowed && user) TenantContext.setTenant(user.tenantId);
    return allowed;
  }
}

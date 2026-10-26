import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { FEATURE_KEY } from '../decorators/require-feature.decorator';
import {
  PLATFORM_FEATURE_LABELS,
  type PlatformFeature,
  tenantHasFeature,
} from '../platform-features';
import type { AuthenticatedUser } from '../decorators/current-user.decorator';

/**
 * Bloqueia rotas marcadas com @RequireFeature se o módulo não estiver no plano efetivo.
 * Sem decorator = libera. Super-admin sem clínica (painel /admin) não cai aqui.
 */
@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const feature = this.reflector.getAllAndOverride<PlatformFeature | undefined>(FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!feature) return true;

    const { user } = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    if (!user) throw new ForbiddenException('Não autenticado.');

    // Painel da plataforma: sem tenantId; rotas admin não usam @RequireFeature.
    if (user.isSuperAdmin && !user.tenantId) return true;

    if (tenantHasFeature(user.features, feature)) return true;

    const label = PLATFORM_FEATURE_LABELS[feature] ?? feature;
    throw new ForbiddenException(`O módulo "${label}" não está incluído no plano desta clínica.`);
  }
}

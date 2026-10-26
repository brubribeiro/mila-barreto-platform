import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from './auth.service';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { effectivePermissions, SYSTEM_ADMIN_ROLE_NAME } from '../common/permissions';
import { featuresFromTenant } from '../common/platform-features';
import { TenantContext } from '../tenancy/tenant-context';
import { assertTenantActive } from '../tenancy/tenant-status';

const LAST_ACCESS_INTERVAL_MS = 5 * 60 * 1000;

const TENANT_WITH_PLAN = {
  include: { plan: { select: { features: true } } },
} as const;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    // Carrega fresh do banco com a role para permissões sempre atuais.
    // Sem escopo: a clínica ainda não está no contexto (é este usuário que a define).
    const user = await TenantContext.runUnscoped(() =>
      this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { role: true, tenant: TENANT_WITH_PLAN },
      }),
    );
    if (!user || !user.active) {
      throw new UnauthorizedException('Usuário inativo ou inexistente.');
    }

    // Super-admin "entrando como" uma clínica (painel admin): age como administrador dela.
    if (user.isSuperAdmin && payload.tenantId && payload.impersonatorId === user.id) {
      const tenant = await TenantContext.runUnscoped(() =>
        this.prisma.tenant.findUnique({ where: { id: payload.tenantId! }, ...TENANT_WITH_PLAN }),
      );
      if (!tenant) throw new UnauthorizedException('Clínica não encontrada.');
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        tenantId: tenant.id,
        tenantName: tenant.name,
        isSuperAdmin: true,
        active: user.active,
        roleId: null,
        roleName: SYSTEM_ADMIN_ROLE_NAME,
        permissions: effectivePermissions(SYSTEM_ADMIN_ROLE_NAME, []),
        restrictToOwnAppointments: false,
        providesAppointments: false,
        features: featuresFromTenant(tenant),
        impersonatorId: user.id,
      };
    }

    // Token anterior ao multi-tenant (sem tenantId) ou de outra clínica: exige novo login.
    if (payload.tenantId === undefined || payload.tenantId !== user.tenantId) {
      throw new UnauthorizedException('Sessão inválida. Entre novamente.');
    }
    assertTenantActive(user.tenant);

    if (!payload.impersonatorId) await this.touchLastAccess(user.id, user.lastAccessAt);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      tenantId: user.tenantId,
      isSuperAdmin: user.isSuperAdmin,
      active: user.active,
      roleId: user.roleId,
      roleName: user.role?.name ?? '',
      permissions: effectivePermissions(user.role?.name ?? '', user.role?.permissions ?? []),
      restrictToOwnAppointments: user.role?.restrictToOwnAppointments ?? false,
      providesAppointments: user.providesAppointments,
      features: featuresFromTenant(user.tenant),
      ...(payload.impersonatorId ? { impersonatorId: payload.impersonatorId } : {}),
    };
  }

  /** Último acesso (métrica do painel admin), gravado no máximo a cada LAST_ACCESS_INTERVAL_MS. */
  private async touchLastAccess(userId: string, lastAccessAt: Date | null) {
    if (lastAccessAt && Date.now() - lastAccessAt.getTime() < LAST_ACCESS_INTERVAL_MS) return;
    await TenantContext.runUnscoped(() =>
      this.prisma.user.update({ where: { id: userId }, data: { lastAccessAt: new Date() } }),
    ).catch(() => undefined);
  }
}

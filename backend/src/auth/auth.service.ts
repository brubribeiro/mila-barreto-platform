import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';

import { UsersService } from '../users/users.service';
import { GoogleLoginDto } from './dto/google-login.dto';
import type { AuthPanel } from './dto/select-panel.dto';
import { effectivePermissions, SYSTEM_ADMIN_ROLE_NAME } from '../common/permissions';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { featuresFromTenant } from '../common/platform-features';
import { assertTenantActive } from '../tenancy/tenant-status';

export interface JwtPayload {
  sub: string;
  email: string;
  /** Clínica do usuário (null para super-admin). Conferida contra o banco a cada requisição. */
  tenantId: string | null;
  /** ID do admin original quando em modo de personificação */
  impersonatorId?: string;
  /** Token provisório após login Google quando o usuário tem clínica e super-admin */
  panelSelectionPending?: boolean;
}

/** Duração do token de "entrar como" uma clínica (super-admin). */
export const TENANT_ACCESS_EXPIRES_IN = '2h';

@Injectable()
export class AuthService {
  private readonly googleClient: OAuth2Client;

  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {
    this.googleClient = new OAuth2Client(
      this.config.get<string>('GOOGLE_CLIENT_ID'),
    );
  }

  private canChoosePanel(user: { isSuperAdmin?: boolean; tenantId?: string | null }) {
    return !!(user.isSuperAdmin && user.tenantId);
  }

  private buildUserResponse(user: any, opts?: { panelSelectionPending?: boolean; sessionTenantId?: string | null }) {
    const sessionTenantId =
      opts && 'sessionTenantId' in opts ? (opts.sessionTenantId ?? null) : (user.tenantId ?? null);
    const pending = opts?.panelSelectionPending ?? false;
    const platformSession = user.isSuperAdmin && sessionTenantId === null && !pending;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      tenantId: sessionTenantId,
      isSuperAdmin: user.isSuperAdmin ?? false,
      canChoosePanel: this.canChoosePanel(user),
      ...(pending ? { panelSelectionPending: true as const } : {}),
      roleId: platformSession ? null : user.roleId,
      roleName: platformSession ? SYSTEM_ADMIN_ROLE_NAME : user.role?.name,
      permissions: platformSession
        ? effectivePermissions(SYSTEM_ADMIN_ROLE_NAME, [])
        : effectivePermissions(user.role?.name ?? '', user.role?.permissions ?? []),
      restrictToOwnAppointments: platformSession ? false : user.role?.restrictToOwnAppointments ?? false,
      active: user.active,
      providesAppointments: platformSession ? false : user.providesAppointments,
      features: platformSession ? [] : featuresFromTenant(user.tenant),
    };
  }

  async loginWithGoogle(dto: GoogleLoginDto) {
    // Verifica o token recebido do Google
    const ticket = await this.googleClient.verifyIdToken({
      idToken: dto.credential,
      audience: this.config.get<string>('GOOGLE_CLIENT_ID'),
    });

    const googlePayload = ticket.getPayload();
    if (!googlePayload?.email) {
      throw new UnauthorizedException('Token Google inválido');
    }

    // Busca o profissional pelo email na base de usuários
    const user = await this.users.findByEmail(googlePayload.email);

    if (!user) {
      throw new UnauthorizedException(
        'Nenhum profissional cadastrado com este e-mail. Solicite acesso ao administrador.',
      );
    }

    if (!user.active) {
      throw new UnauthorizedException('Usuário inativo. Contate o administrador.');
    }
    const dualPanel = this.canChoosePanel(user);

    if (dualPanel) {
      const payload: JwtPayload = {
        sub: user.id,
        email: user.email,
        tenantId: null,
        panelSelectionPending: true,
      };
      return {
        access_token: await this.jwt.signAsync(payload),
        user: this.buildUserResponse(user, { panelSelectionPending: true, sessionTenantId: null }),
        needsPanelSelection: true as const,
      };
    }

    assertTenantActive(user.tenant);

    const payload: JwtPayload = { sub: user.id, email: user.email, tenantId: user.tenantId ?? null };

    return {
      access_token: await this.jwt.signAsync(payload),
      user: this.buildUserResponse(user, { sessionTenantId: user.tenantId ?? null }),
    };
  }

  async selectPanel(actor: AuthenticatedUser, panel: AuthPanel) {
    const user = await this.users.findById(actor.id);
    if (!user?.active) throw new UnauthorizedException('Usuário inativo ou inexistente.');
    if (!this.canChoosePanel(user)) {
      throw new ForbiddenException('Este usuário não pode escolher entre painéis.');
    }

    if (panel === 'admin') {
      const payload: JwtPayload = { sub: user.id, email: user.email, tenantId: null };
      return {
        access_token: await this.jwt.signAsync(payload),
        user: this.buildUserResponse(user, { sessionTenantId: null }),
      };
    }

    assertTenantActive(user.tenant);
    const payload: JwtPayload = { sub: user.id, email: user.email, tenantId: user.tenantId };
    return {
      access_token: await this.jwt.signAsync(payload),
      user: this.buildUserResponse(user, { sessionTenantId: user.tenantId }),
    };
  }

  /**
   * Token do super-admin agindo como administrador da clínica tenantId ("entrar como" do
   * painel admin). Vale menos que a sessão normal; quem chama registra a auditoria.
   */
  signTenantAccess(superAdmin: AuthenticatedUser, tenantId: string) {
    const payload: JwtPayload = {
      sub: superAdmin.id,
      email: superAdmin.email,
      tenantId,
      impersonatorId: superAdmin.id,
    };
    return this.jwt.signAsync(payload, { expiresIn: TENANT_ACCESS_EXPIRES_IN });
  }

  async impersonate(targetUserId: string, admin: AuthenticatedUser) {
    // Super-admin dentro de uma clínica não personifica: sairia da trilha de auditoria da plataforma.
    if (admin.isSuperAdmin) {
      throw new ForbiddenException('O super-admin não pode personificar usuários da clínica.');
    }
    if (admin.roleName !== SYSTEM_ADMIN_ROLE_NAME) {
      throw new ForbiddenException('Apenas administradores podem personificar usuários.');
    }

    if (targetUserId === admin.id) {
      throw new ForbiddenException('Não é possível personificar a si mesmo.');
    }

    const target = await this.users.findById(targetUserId);
    if (!target) throw new UnauthorizedException('Usuário não encontrado.');
    if (!target.active) throw new UnauthorizedException('Usuário inativo.');

    const payload: JwtPayload = {
      sub: target.id,
      email: target.email,
      tenantId: target.tenantId,
      impersonatorId: admin.id,
    };

    return {
      access_token: await this.jwt.signAsync(payload),
      user: {
        ...this.buildUserResponse(target),
        impersonating: true,
        impersonatorName: admin.name,
      },
    };
  }
}

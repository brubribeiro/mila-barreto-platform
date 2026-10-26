import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';

import { UsersService } from '../users/users.service';
import { GoogleLoginDto } from './dto/google-login.dto';
import { effectivePermissions, SYSTEM_ADMIN_ROLE_NAME } from '../common/permissions';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { featuresFromTenant } from '../common/platform-features';
import { assertTenantActive } from '../tenancy/tenant-status';
import { TenantContext } from '../tenancy/tenant-context';
import { PrismaService } from '../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  /** Clínica do usuário (null para super-admin). Conferida contra o banco a cada requisição. */
  tenantId: string | null;
  /** Versão de sessão; deve bater com User.tokenVersion (logout incrementa). */
  tv: number;
  /** ID do admin original quando em modo de personificação */
  impersonatorId?: string;
}

/** Duração do token de "entrar como" uma clínica (super-admin). */
export const TENANT_ACCESS_EXPIRES_IN = '2h';

@Injectable()
export class AuthService {
  private readonly googleClient: OAuth2Client;
  private readonly googleClientId: string;

  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.googleClientId = (this.config.get<string>('GOOGLE_CLIENT_ID') ?? '').trim();
    this.googleClient = new OAuth2Client(this.googleClientId || undefined);
  }

  private buildUserResponse(user: any) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      tenantId: user.tenantId ?? null,
      isSuperAdmin: user.isSuperAdmin ?? false,
      roleId: user.roleId,
      roleName: user.role?.name,
      permissions: effectivePermissions(
        user.role?.name ?? '',
        user.role?.permissions ?? [],
      ),
      restrictToOwnAppointments: user.role?.restrictToOwnAppointments ?? false,
      active: user.active,
      providesAppointments: user.providesAppointments,
      features: featuresFromTenant(user.tenant),
    };
  }

  private async signAccessToken(payload: JwtPayload, expiresIn?: string) {
    return this.jwt.signAsync(payload, expiresIn ? { expiresIn } : undefined);
  }

  async loginWithGoogle(dto: GoogleLoginDto) {
    if (!this.googleClientId) {
      throw new UnauthorizedException('Login Google não configurado no servidor.');
    }

    // Verifica o token recebido do Google (audience obrigatória — sem omitir a checagem)
    const ticket = await this.googleClient.verifyIdToken({
      idToken: dto.credential,
      audience: this.googleClientId,
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
    assertTenantActive(user.tenant);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      tv: user.tokenVersion ?? 0,
    };

    return {
      access_token: await this.signAccessToken(payload),
      user: this.buildUserResponse(user),
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
      tv: superAdmin.tokenVersion,
      impersonatorId: superAdmin.id,
    };
    return this.signAccessToken(payload, TENANT_ACCESS_EXPIRES_IN);
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
      tv: target.tokenVersion ?? 0,
      impersonatorId: admin.id,
    };

    return {
      access_token: await this.signAccessToken(payload),
      user: {
        ...this.buildUserResponse(target),
        impersonating: true,
        impersonatorName: admin.name,
      },
    };
  }

  /**
   * Invalida a sessão atual (e a do admin guardada na personificação, se houver)
   * incrementando User.tokenVersion. Tokens com `tv` antigo passam a ser rejeitados.
   */
  async revokeSessions(userIds: string[]) {
    const unique = [...new Set(userIds.filter(Boolean))];
    if (unique.length === 0) return;
    await TenantContext.runUnscoped(() =>
      Promise.all(
        unique.map((id) =>
          this.prisma.user.update({
            where: { id },
            data: { tokenVersion: { increment: 1 } },
          }),
        ),
      ),
    );
  }

  /** Decodifica payload sem validar assinatura (só para ler sub/tv de cookie admin no logout). */
  peekPayload(token: string): JwtPayload | null {
    try {
      const payload = this.jwt.decode(token);
      if (!payload || typeof payload !== 'object') return null;
      return payload as JwtPayload;
    } catch {
      return null;
    }
  }
}

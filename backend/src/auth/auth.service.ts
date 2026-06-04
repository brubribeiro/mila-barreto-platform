import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';

import { UsersService } from '../users/users.service';
import { GoogleLoginDto } from './dto/google-login.dto';
import { effectivePermissions, SYSTEM_ADMIN_ROLE_NAME } from '../common/permissions';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';

export interface JwtPayload {
  sub: string;
  email: string;
  /** ID do admin original quando em modo de personificação */
  impersonatorId?: string;
}

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

  private buildUserResponse(user: any) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      roleId: user.roleId,
      roleName: user.role?.name,
      permissions: effectivePermissions(
        user.role?.name ?? '',
        user.role?.permissions ?? [],
      ),
      restrictToOwnAppointments: user.role?.restrictToOwnAppointments ?? false,
      active: user.active,
      providesAppointments: user.providesAppointments,
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

    const payload: JwtPayload = { sub: user.id, email: user.email };

    return {
      access_token: await this.jwt.signAsync(payload),
      user: this.buildUserResponse(user),
    };
  }

  async impersonate(targetUserId: string, admin: AuthenticatedUser) {
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

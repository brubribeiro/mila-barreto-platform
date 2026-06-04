import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from './auth.service';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { effectivePermissions } from '../common/permissions';

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
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: true },
    });
    if (!user || !user.active) {
      throw new UnauthorizedException('Usuário inativo ou inexistente.');
    }
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      active: user.active,
      roleId: user.roleId,
      roleName: user.role.name,
      permissions: effectivePermissions(user.role.name, user.role.permissions),
      restrictToOwnAppointments: user.role.restrictToOwnAppointments,
      providesAppointments: user.providesAppointments,
      ...(payload.impersonatorId ? { impersonatorId: payload.impersonatorId } : {}),
    };
  }
}

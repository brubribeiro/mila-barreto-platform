import { Body, Controller, Get, Param, Post, UseGuards, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { GoogleLoginDto } from './dto/google-login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @Post('google')
  loginWithGoogle(@Body() dto: GoogleLoginDto) {
    return this.auth.loginWithGoogle(dto);
  }

  /**
   * Retorna o usuário autenticado com role e permissões.
   * Chamado pelo frontend ao iniciar a app para hidratar o contexto.
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return {
      ...user,
      ...(user.impersonatorId ? { impersonating: true } : {}),
    };
  }

  /**
   * Permite que um administrador personifique outro profissional.
   * Retorna um novo JWT com as permissões do usuário alvo.
   */
  @UseGuards(JwtAuthGuard)
  @Post('impersonate/:userId')
  impersonate(
    @Param('userId') userId: string,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.auth.impersonate(userId, admin);
  }
}

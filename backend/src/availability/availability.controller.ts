import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';

import {
  AvailabilityService,
  UpsertWorkingHoursDto,
  CreateUnavailabilityDto,
} from './availability.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

/**
 * Rotas centradas em "users/:userId". Quando o usuário não tem permissão
 * de "availability:edit" sobre OUTRO usuário, pode editar apenas o próprio.
 */
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('users/:userId/availability')
export class AvailabilityController {
  constructor(private readonly availability: AvailabilityService) {}

  // GET é aberto para qualquer autenticado (necessário para validar agendamento)
  @Get('working-hours')
  listWorkingHours(@Param('userId') userId: string) {
    return this.availability.listWorkingHours(userId);
  }

  @Put('working-hours')
  upsertWorkingHours(
    @Param('userId') userId: string,
    @Body() dto: UpsertWorkingHoursDto,
    @CurrentUser() me: AuthenticatedUser,
  ) {
    this.requireOwnOrPermission(me, userId);
    return this.availability.upsertWorkingHours(userId, dto);
  }

  @Delete('working-hours/:dayOfWeek')
  removeWorkingHours(
    @Param('userId') userId: string,
    @Param('dayOfWeek') dayOfWeek: string,
    @CurrentUser() me: AuthenticatedUser,
  ) {
    this.requireOwnOrPermission(me, userId);
    return this.availability.removeWorkingHours(userId, Number(dayOfWeek));
  }

  @Get('unavailability')
  listUnavailability(@Param('userId') userId: string) {
    return this.availability.listUnavailability(userId);
  }

  @Post('unavailability')
  createUnavailability(
    @Param('userId') userId: string,
    @Body() dto: CreateUnavailabilityDto,
    @CurrentUser() me: AuthenticatedUser,
  ) {
    this.requireOwnOrPermission(me, userId);
    return this.availability.createUnavailability(userId, dto);
  }

  @Delete('unavailability/:id')
  removeUnavailability(
    @Param('userId') userId: string,
    @Param('id') id: string,
    @CurrentUser() me: AuthenticatedUser,
  ) {
    this.requireOwnOrPermission(me, userId);
    return this.availability.removeUnavailability(userId, id);
  }

  private requireOwnOrPermission(me: AuthenticatedUser, userId: string) {
    if (me.id === userId) return;
    if (!me.permissions.includes('availability:edit')) {
      throw new ForbiddenException(
        'Você só pode editar seus próprios horários sem a permissão "availability:edit".',
      );
    }
  }
}

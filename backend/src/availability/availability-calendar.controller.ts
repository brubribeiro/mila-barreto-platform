import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { AvailabilityService } from './availability.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('availability')
export class AvailabilityCalendarController {
  constructor(private readonly availability: AvailabilityService) {}

  /** Indisponibilidades visíveis no calendário (intervalo sobreposto). */
  @Get('unavailability-range')
  listUnavailabilityInRange(
    @Query('from') from: string,
    @Query('to') to: string,
    @CurrentUser() me: AuthenticatedUser,
  ) {
    const onlyUserId = me.restrictToOwnAppointments ? me.id : undefined;
    return this.availability.listUnavailabilityInRange(from, to, onlyUserId);
  }

  /** Profissionais livres no intervalo (horário semanal + bloqueios + conflitos). */
  @Get('available-professionals')
  listAvailableProfessionals(
    @Query('startAt') startAt: string,
    @Query('endAt') endAt: string,
    @Query('excludeAppointmentId') excludeAppointmentId?: string,
  ) {
    return this.availability.listAvailableProfessionals(startAt, endAt, excludeAppointmentId);
  }
}

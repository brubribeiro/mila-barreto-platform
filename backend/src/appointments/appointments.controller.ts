import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appts: AppointmentsService) {}

  @RequirePermissions('appointments:view')
  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const professionalId = user.restrictToOwnAppointments ? user.id : undefined;
    return this.appts.list(from, to, professionalId);
  }

  @RequirePermissions('appointments:view')
  @Get('recurrence-limit')
  getRecurrenceLimit(
    @Query('patientId') patientId: string,
    @Query('procedureId') procedureId: string,
    @Query('excludeId') excludeId?: string,
  ) {
    return this.appts.getRecurrenceLimit(patientId, procedureId, excludeId);
  }

  @RequirePermissions('appointments:view')
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.appts.findOne(id, user);
  }

  @RequirePermissions('appointments:create')
  @Post()
  create(@Body() dto: CreateAppointmentDto) {
    return this.appts.create(dto);
  }

  @RequirePermissions('appointments:edit')
  @Post('backfill-finance')
  backfillFinance() {
    return this.appts.backfillFinance();
  }

  @RequirePermissions('appointments:edit')
  @Patch(':id/start')
  start(@Param('id', ParseUUIDPipe) id: string) {
    return this.appts.start(id);
  }

  @RequirePermissions('appointments:edit')
  @Patch(':id/finish')
  finish(@Param('id', ParseUUIDPipe) id: string) {
    return this.appts.finish(id);
  }

  @RequirePermissions('appointments:edit')
  @Patch(':id/resume')
  resume(@Param('id', ParseUUIDPipe) id: string) {
    return this.appts.resume(id);
  }

  @RequirePermissions('appointments:edit')
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAppointmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.appts.update(id, dto, user);
  }

  @RequirePermissions('appointments:delete')
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.appts.remove(id);
  }
}

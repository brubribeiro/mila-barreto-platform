import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import {
  EquipmentService,
  CreateEquipmentDto,
  UpdateEquipmentDto,
} from './equipment.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('equipment')
export class EquipmentController {
  constructor(private readonly equipment: EquipmentService) {}

  @RequirePermissions('equipment:view')
  @Get()
  list() {
    return this.equipment.list();
  }

  @RequirePermissions('equipment:view')
  @Get('due-soon')
  dueSoon(@Query('days') days?: string) {
    return this.equipment.dueSoon(days ? Number(days) : 30);
  }

  @RequirePermissions('equipment:view')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.equipment.findOne(id);
  }

  @RequirePermissions('equipment:create')
  @Post()
  create(@Body() dto: CreateEquipmentDto) {
    return this.equipment.create(dto);
  }

  @RequirePermissions('equipment:edit')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEquipmentDto) {
    return this.equipment.update(id, dto);
  }

  @RequirePermissions('equipment:edit')
  @Post(':id/maintenance')
  registerMaintenance(@Param('id') id: string) {
    return this.equipment.registerMaintenance(id);
  }

  @RequirePermissions('equipment:delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.equipment.remove(id);
  }

  /** Endpoint para disparar checagem de notificações de manutenção (pode ser chamado via cron). */
  @RequirePermissions('equipment:view')
  @Post('check-maintenance-notifications')
  checkMaintenanceNotifications() {
    return this.equipment.checkMaintenanceNotifications();
  }
}

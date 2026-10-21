import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';

import { PendenciasService } from './pendencias.service';
import {
  AssignPendingDto,
  CreatePendingTaskDto,
  PendingKeyDto,
  UpdatePendingRulesDto,
  UpdatePendingTaskDto,
} from './dto/pending-task.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('pendencias')
export class PendenciasController {
  constructor(private readonly service: PendenciasService) {}

  @RequirePermissions('pendencias:view')
  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.service.list(user);
  }

  @RequirePermissions('pendencias:view')
  @Get('resolved')
  listResolved() {
    return this.service.listResolved();
  }

  @RequirePermissions('pendencias:view')
  @Get('rules')
  getRules() {
    return this.service.getRules();
  }

  @RequirePermissions('pendencias:edit')
  @Put('rules')
  updateRules(@Body() dto: UpdatePendingRulesDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.updateRules(dto, user);
  }

  @RequirePermissions('pendencias:edit')
  @Post('resolve')
  resolve(@Body() dto: PendingKeyDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.resolve(dto.key, user);
  }

  @RequirePermissions('pendencias:edit')
  @Post('assign')
  assign(@Body() dto: AssignPendingDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.assign(dto, user);
  }

  @RequirePermissions('pendencias:edit')
  @Post(':id/reopen')
  reopen(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.reopen(id, user);
  }

  @RequirePermissions('pendencias:create')
  @Post()
  create(@Body() dto: CreatePendingTaskDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(dto, user);
  }

  @RequirePermissions('pendencias:edit')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePendingTaskDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.update(id, dto, user);
  }

  @RequirePermissions('pendencias:delete')
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, user);
  }
}

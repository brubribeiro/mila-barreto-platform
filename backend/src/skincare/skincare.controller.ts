import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';

import { SkincareService } from './skincare.service';
import {
  CreateSkincareProductDto,
  CreateSkincareRoutineDto,
  CreateSkincareRuleDto,
  UpdateSkincareProductDto,
  UpdateSkincareRoutineDto,
  UpdateSkincareRuleDto,
} from './dto/skincare.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

/** Produtos e regras da anamnese de pele (configuração) e rotinas salvas na ficha da paciente. */
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('skincare')
export class SkincareController {
  constructor(private readonly service: SkincareService) {}

  @RequirePermissions('routines:view')
  @Get('products')
  listProducts() {
    return this.service.listProducts();
  }

  @RequirePermissions('routines:edit')
  @Post('products')
  createProduct(@Body() dto: CreateSkincareProductDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.createProduct(dto, user);
  }

  @RequirePermissions('routines:edit')
  @Patch('products/:id')
  updateProduct(@Param('id') id: string, @Body() dto: UpdateSkincareProductDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.updateProduct(id, dto, user);
  }

  @RequirePermissions('routines:delete')
  @Delete('products/:id')
  removeProduct(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.removeProduct(id, user);
  }

  @RequirePermissions('routines:view')
  @Get('rules')
  listRules() {
    return this.service.listRules();
  }

  @RequirePermissions('routines:edit')
  @Post('rules')
  createRule(@Body() dto: CreateSkincareRuleDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.createRule(dto, user);
  }

  @RequirePermissions('routines:edit')
  @Patch('rules/:id')
  updateRule(@Param('id') id: string, @Body() dto: UpdateSkincareRuleDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.updateRule(id, dto, user);
  }

  @RequirePermissions('routines:delete')
  @Delete('rules/:id')
  removeRule(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.removeRule(id, user);
  }

  @RequirePermissions('routines:view')
  @Get('routines')
  listRoutines(@Query('patientId') patientId?: string) {
    return this.service.listRoutines(patientId);
  }

  @RequirePermissions('routines:view')
  @Get('routines/:id')
  findRoutine(@Param('id') id: string) {
    return this.service.findRoutine(id);
  }

  @RequirePermissions('routines:create')
  @Post('routines')
  createRoutine(@Body() dto: CreateSkincareRoutineDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.createRoutine(dto, user);
  }

  @RequirePermissions('routines:edit')
  @Patch('routines/:id')
  updateRoutine(@Param('id') id: string, @Body() dto: UpdateSkincareRoutineDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.updateRoutine(id, dto, user);
  }

  @RequirePermissions('routines:delete')
  @Delete('routines/:id')
  removeRoutine(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.removeRoutine(id, user);
  }
}

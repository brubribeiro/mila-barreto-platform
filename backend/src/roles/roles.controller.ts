import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('roles')
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  /** Catálogo de permissões disponíveis - aberto para qualquer autenticado
   *  (front usa para montar a UI; só faz sentido para quem pode ver/editar grupos
   *  mas deixar aberto não vaza nada sensível). */
  @Get('catalog')
  catalog() {
    return this.roles.catalog();
  }

  @RequirePermissions('roles:view')
  @Get()
  list() {
    return this.roles.list();
  }

  @RequirePermissions('roles:view')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.roles.findOne(id);
  }

  @RequirePermissions('roles:create')
  @Post()
  create(@Body() dto: CreateRoleDto) {
    return this.roles.create(dto);
  }

  @RequirePermissions('roles:edit')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.roles.update(id, dto);
  }

  @RequirePermissions('roles:delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.roles.remove(id);
  }
}

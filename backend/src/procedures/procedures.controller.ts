import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';

import { ProceduresService } from './procedures.service';
import { CreateProcedureDto } from './dto/create-procedure.dto';
import { UpdateProcedureDto } from './dto/update-procedure.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('procedures')
export class ProceduresController {
  constructor(private readonly procedures: ProceduresService) {}

  @RequirePermissions('procedures:view')
  @Get()
  list() {
    return this.procedures.list();
  }

  @RequirePermissions('procedures:view')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.procedures.findOne(id);
  }

  @RequirePermissions('procedures:create')
  @Post()
  create(@Body() dto: CreateProcedureDto) {
    return this.procedures.create(dto);
  }

  @RequirePermissions('procedures:edit')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProcedureDto) {
    return this.procedures.update(id, dto);
  }

  @RequirePermissions('procedures:delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.procedures.remove(id);
  }
}

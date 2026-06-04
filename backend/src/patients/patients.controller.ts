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

import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('patients')
export class PatientsController {
  constructor(private readonly patients: PatientsService) {}

  @RequirePermissions('patients:view')
  @Get()
  list(@Query('search') search?: string) {
    return this.patients.list(search);
  }

  @RequirePermissions('patients:view')
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.patients.findOne(id);
  }

  @RequirePermissions('patients:view')
  @Get(':id/reliability')
  getReliability(@Param('id', ParseUUIDPipe) id: string) {
    return this.patients.getReliabilityStats(id);
  }

  @RequirePermissions('patients:create')
  @Post()
  create(@Body() dto: CreatePatientDto) {
    return this.patients.create(dto);
  }

  @RequirePermissions('patients:edit')
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePatientDto) {
    return this.patients.update(id, dto);
  }

  @RequirePermissions('patients:delete')
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.patients.remove(id);
  }
}

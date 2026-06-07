import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

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
  create(@Body() dto: CreatePatientDto, @CurrentUser() user: AuthenticatedUser) {
    return this.patients.create(dto, user);
  }

  @RequirePermissions('patients:edit')
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePatientDto, @CurrentUser() user: AuthenticatedUser) {
    return this.patients.update(id, dto, user);
  }

  @RequirePermissions('patients:edit')
  @Post(':id/photo')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (allowed.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Use uma imagem JPEG, PNG ou WebP.'), false);
        }
      },
    }),
  )
  uploadPhoto(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Arquivo de imagem é obrigatório.');
    return this.patients.uploadPhoto(id, file);
  }

  @RequirePermissions('patients:edit')
  @Delete(':id/photo')
  removePhoto(@Param('id', ParseUUIDPipe) id: string) {
    return this.patients.removePhoto(id);
  }

  @RequirePermissions('patients:delete')
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.patients.remove(id, user);
  }
}

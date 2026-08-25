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

import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @RequirePermissions('users:view')
  @Get()
  list() {
    return this.users.list();
  }

  /** Listagem resumida para dropdowns (todo autenticado). */
  @Get('active')
  listActive(@Query('forAppointments') forAppointments?: string) {
    return this.users.listActive(forAppointments === 'true');
  }

  @RequirePermissions('users:create')
  @Post()
  create(@Body() dto: CreateUserDto, @CurrentUser() user: AuthenticatedUser) {
    return this.users.create(dto, user);
  }

  @RequirePermissions('users:edit')
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto, @CurrentUser() user: AuthenticatedUser) {
    return this.users.update(id, dto, user);
  }

  @RequirePermissions('users:delete')
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() me: AuthenticatedUser) {
    return this.users.remove(id, me.id, me);
  }

  @RequirePermissions('users:view')
  @Get(':id/photo-url')
  getPhotoAccessUrl(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.getPhotoAccessUrl(id);
  }

  @RequirePermissions('users:edit')
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
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!file) throw new BadRequestException('Arquivo de imagem é obrigatório.');
    return this.users.uploadPhoto(id, file, user);
  }

  @RequirePermissions('users:edit')
  @Delete(':id/photo')
  removePhoto(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.users.removePhoto(id, user);
  }
}

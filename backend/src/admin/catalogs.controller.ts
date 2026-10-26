import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { SuperAdminGuard } from '../tenancy/super-admin.guard';
import { CatalogsService } from './catalogs.service';
import { CreateCatalogItemDto, UpdateCatalogItemDto } from './dto/catalog.dto';

/** CRUD do catálogo global da plataforma: só o super-admin. */
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('admin/catalogs')
export class CatalogsController {
  constructor(private readonly catalogs: CatalogsService) {}

  @Get()
  list(@Query('kind') kind?: string) {
    return this.catalogs.listForAdmin(kind || undefined);
  }

  @Post()
  create(@Body() dto: CreateCatalogItemDto, @CurrentUser() user: AuthenticatedUser) {
    return this.catalogs.create(dto, user);
  }

  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.catalogs.getForAdmin(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCatalogItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.catalogs.update(id, dto, user);
  }

  @Post(':id/activate')
  activate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.catalogs.setActive(id, true, user);
  }

  @Post(':id/deactivate')
  deactivate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.catalogs.setActive(id, false, user);
  }
}

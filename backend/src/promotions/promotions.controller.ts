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

import { PromotionsService } from './promotions.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotions: PromotionsService) {}

  @RequirePermissions('promotions:view')
  @Get()
  list() {
    return this.promotions.list();
  }

  @RequirePermissions('promotions:view')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.promotions.findOne(id);
  }

  @RequirePermissions('promotions:create')
  @Post()
  create(@Body() dto: CreatePromotionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.promotions.create(dto, user);
  }

  @RequirePermissions('promotions:edit')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePromotionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.promotions.update(id, dto, user);
  }

  @RequirePermissions('promotions:delete')
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.promotions.remove(id, user);
  }
}

import {
  BadRequestException,
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
import { GoalMetric, GoalPeriodType } from '@prisma/client';

import { GoalsService, GoalScope } from './goals.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { FeatureGuard } from '../common/guards/feature.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { RequireFeature } from '../common/decorators/require-feature.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

const SCOPES: GoalScope[] = ['current', 'upcoming', 'past', 'all'];

@RequireFeature('goals')
@UseGuards(JwtAuthGuard, FeatureGuard, PermissionsGuard)
@Controller('goals')
export class GoalsController {
  constructor(private readonly service: GoalsService) {}

  @RequirePermissions('goals:view')
  @Get()
  list(@Query('scope') scope?: string, @Query('at') at?: string) {
    const parsed = SCOPES.includes(scope as GoalScope) ? (scope as GoalScope) : 'current';
    return this.service.list(parsed, at);
  }

  @RequirePermissions('goals:view')
  @Get('preview')
  preview(
    @Query('metric') metric: string,
    @Query('periodType') periodType: string,
    @Query('periodStart') periodStart: string,
  ) {
    if (
      !Object.values(GoalMetric).includes(metric as GoalMetric) ||
      !Object.values(GoalPeriodType).includes(periodType as GoalPeriodType) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(periodStart ?? '')
    ) {
      throw new BadRequestException('Parâmetros inválidos');
    }
    return this.service.preview(metric as GoalMetric, periodType as GoalPeriodType, periodStart);
  }

  @RequirePermissions('goals:view')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @RequirePermissions('goals:create')
  @Post()
  create(@Body() dto: CreateGoalDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(dto, user);
  }

  @RequirePermissions('goals:edit')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateGoalDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.update(id, dto, user);
  }

  @RequirePermissions('goals:delete')
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, user);
  }
}

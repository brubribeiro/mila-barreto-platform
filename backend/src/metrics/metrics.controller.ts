import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { MetricsService } from './metrics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @RequirePermissions('metrics:view')
  @Get()
  getMetrics(@Query('from') from: string, @Query('to') to: string) {
    return this.metrics.getMetrics({ from, to });
  }
}

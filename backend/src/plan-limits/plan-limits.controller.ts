import { Controller, Get, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlanLimitsService } from './plan-limits.service';

/** Plano da clínica logada: limites e uso atual (só contagens agregadas). */
@UseGuards(JwtAuthGuard)
@Controller('tenant')
export class PlanLimitsController {
  constructor(private readonly planLimits: PlanLimitsService) {}

  @Get('plan-usage')
  usage() {
    return this.planLimits.getUsage();
  }
}

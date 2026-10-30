import { Global, Module } from '@nestjs/common';

import { PlanLimitsController } from './plan-limits.controller';
import { PlanLimitsService } from './plan-limits.service';

@Global()
@Module({
  providers: [PlanLimitsService],
  controllers: [PlanLimitsController],
  exports: [PlanLimitsService],
})
export class PlanLimitsModule {}

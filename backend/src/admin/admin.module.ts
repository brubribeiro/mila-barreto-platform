import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { CatalogsReadController } from '../catalogs/catalogs-read.controller';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { CatalogsController } from './catalogs.controller';
import { CatalogsService } from './catalogs.service';
import { FeedbackAdminService } from './feedback-admin.service';
import { PlatformInsightsController } from './platform-insights.controller';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';
import { UsageService } from './usage.service';

@Module({
  imports: [AuthModule],
  providers: [AdminService, CatalogsService, PlansService, UsageService, FeedbackAdminService],
  controllers: [
    AdminController,
    CatalogsController,
    CatalogsReadController,
    PlansController,
    PlatformInsightsController,
  ],
  exports: [CatalogsService],
})
export class AdminModule {}

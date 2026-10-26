import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { CatalogsReadController } from '../catalogs/catalogs-read.controller';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { CatalogsController } from './catalogs.controller';
import { CatalogsService } from './catalogs.service';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';

@Module({
  imports: [AuthModule],
  providers: [AdminService, CatalogsService, PlansService],
  controllers: [AdminController, CatalogsController, CatalogsReadController, PlansController],
  exports: [CatalogsService],
})
export class AdminModule {}

import { Module } from '@nestjs/common';
import { EquipmentModule } from '../equipment/equipment.module';
import { SchedulerService } from './scheduler.service';

@Module({
  imports: [EquipmentModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}

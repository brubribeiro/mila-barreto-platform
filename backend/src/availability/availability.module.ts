import { Module } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { AvailabilityController } from './availability.controller';
import { AvailabilityCalendarController } from './availability-calendar.controller';

@Module({
  providers: [AvailabilityService],
  controllers: [AvailabilityController, AvailabilityCalendarController],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}

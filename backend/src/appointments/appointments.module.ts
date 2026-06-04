import { Module } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { AvailabilityModule } from '../availability/availability.module';
import { PackagesModule } from '../packages/packages.module';
import { PromotionsModule } from '../promotions/promotions.module';

@Module({
  imports: [AvailabilityModule, PackagesModule, PromotionsModule],
  providers: [AppointmentsService],
  controllers: [AppointmentsController],
})
export class AppointmentsModule {}

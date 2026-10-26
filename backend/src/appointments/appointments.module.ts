import { Module } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { AppointmentRulesService } from './appointment-rules.service';
import { AppointmentMaterialsService } from './appointment-materials.service';
import { AppointmentFinanceService } from './appointment-finance.service';
import { AppointmentEventsService } from './appointment-events.service';
import { AvailabilityModule } from '../availability/availability.module';
import { PackagesModule } from '../packages/packages.module';
import { PromotionsModule } from '../promotions/promotions.module';

@Module({
  imports: [AvailabilityModule, PackagesModule, PromotionsModule],
  providers: [
    AppointmentsService,
    AppointmentRulesService,
    AppointmentMaterialsService,
    AppointmentFinanceService,
    AppointmentEventsService,
  ],
  exports: [AppointmentsService],
  controllers: [AppointmentsController],
})
export class AppointmentsModule {}

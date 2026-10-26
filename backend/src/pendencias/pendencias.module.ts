import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AppointmentsModule } from '../appointments/appointments.module';
import { FinanceModule } from '../finance/finance.module';
import { PendenciasService } from './pendencias.service';
import { PendenciasController } from './pendencias.controller';

@Module({
  imports: [PrismaModule, AppointmentsModule, FinanceModule],
  providers: [PendenciasService],
  controllers: [PendenciasController],
})
export class PendenciasModule {}

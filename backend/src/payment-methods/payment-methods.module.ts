import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentMethodsService } from './payment-methods.service';
import { PaymentMethodsController } from './payment-methods.controller';

@Module({
  imports: [PrismaModule],
  providers: [PaymentMethodsService],
  controllers: [PaymentMethodsController],
  exports: [PaymentMethodsService],
})
export class PaymentMethodsModule {}

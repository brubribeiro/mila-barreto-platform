import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { PatientsModule } from './patients/patients.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { ProceduresModule } from './procedures/procedures.module';
import { FinanceModule } from './finance/finance.module';
import { InventoryModule } from './inventory/inventory.module';
import { NotificationsModule } from './notifications/notifications.module';
import { MessagesModule } from './messages/messages.module';
import { AvailabilityModule } from './availability/availability.module';
import { EquipmentModule } from './equipment/equipment.module';
import { DocumentsModule } from './documents/documents.module';
import { RecurringExpensesModule } from './recurring-expenses/recurring-expenses.module';
import { PackagesModule } from './packages/packages.module';
import { MetricsModule } from './metrics/metrics.module';
import { PromotionsModule } from './promotions/promotions.module';
import { PaymentMethodsModule } from './payment-methods/payment-methods.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    PrismaModule,
    AuthModule,
    UsersModule,
    RolesModule,
    PatientsModule,
    AppointmentsModule,
    ProceduresModule,
    FinanceModule,
    InventoryModule,
    NotificationsModule,
    MessagesModule,
    AvailabilityModule,
    EquipmentModule,
    DocumentsModule,
    RecurringExpensesModule,
    PackagesModule,
    MetricsModule,
    PromotionsModule,
    PaymentMethodsModule,
    SchedulerModule,
    AuditLogModule,
  ],
  controllers: [AppController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('*');
  }
}

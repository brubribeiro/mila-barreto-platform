import { Global, Module } from '@nestjs/common';

import { AuditLogService } from './audit-log.service';
import { AuditLogController } from './audit-log.controller';

/**
 * Módulo global — AuditLogService fica disponível em todos os módulos
 * sem precisar importar o AuditLogModule explicitamente em cada um.
 */
@Global()
@Module({
  providers: [AuditLogService],
  controllers: [AuditLogController],
  exports: [AuditLogService],
})
export class AuditLogModule {}

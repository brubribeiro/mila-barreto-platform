import { CanActivate, Controller, ExecutionContext, ForbiddenException, Get, Injectable, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { AuditAction } from '@prisma/client';

import { AuditLogService } from './audit-log.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SYSTEM_ADMIN_ROLE_NAME } from '../common/permissions';

/**
 * Guard que permite acesso apenas a administradores.
 */
@Injectable()
class AdminOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();
    if (!user || user.roleName !== SYSTEM_ADMIN_ROLE_NAME) {
      throw new ForbiddenException('Acesso restrito a administradores.');
    }
    return true;
  }
}

/**
 * Controller de auditoria — restrito exclusivamente a administradores.
 */
@UseGuards(JwtAuthGuard, AdminOnlyGuard)
@Controller('audit-logs')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  findAll(
    @Query('entity') entity?: string,
    @Query('entityId') entityId?: string,
    @Query('userId') userId?: string,
    @Query('action') action?: AuditAction,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.auditLogService.findAll({
      entity,
      entityId,
      userId,
      action,
      startDate,
      endDate,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get(':entity/:entityId')
  findByEntity(
    @Param('entity') entity: string,
    @Param('entityId', ParseUUIDPipe) entityId: string,
  ) {
    return this.auditLogService.findByEntity(entity, entityId);
  }
}

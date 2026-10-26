import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { FeedbackType } from '@prisma/client';

import { FeedbackService } from './feedback.service';
import { CreateFeedbackReportDto } from './dto/create-feedback-report.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly service: FeedbackService) {}

  /** Qualquer usuário autenticado pode enviar feedback. */
  @Post()
  create(@Body() dto: CreateFeedbackReportDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(dto, user);
  }

  /** Leitura restrita a quem tem feedback:view (Administrador tem todas). */
  @RequirePermissions('feedback:view')
  @Get()
  list(@Query('type') type?: FeedbackType) {
    const filter =
      type === FeedbackType.BUG || type === FeedbackType.SUGGESTION ? type : undefined;
    return this.service.list(filter);
  }
}

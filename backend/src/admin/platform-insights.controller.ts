import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { SuperAdminGuard } from '../tenancy/super-admin.guard';
import { FeedbackAdminQueryDto, UpdateFeedbackStatusDto, UsageQueryDto } from './dto/feedback-admin.dto';
import { FeedbackAdminService } from './feedback-admin.service';
import { UsageService } from './usage.service';

/** Uso por módulo e central de reports das clínicas: só o super-admin, sem dados clínicos. */
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('admin')
export class PlatformInsightsController {
  constructor(
    private readonly usage: UsageService,
    private readonly feedback: FeedbackAdminService,
  ) {}

  @Get('usage')
  getUsage(@Query() query: UsageQueryDto) {
    return this.usage.getUsage(query);
  }

  @Get('feedback')
  listFeedback(@Query() query: FeedbackAdminQueryDto) {
    return this.feedback.list(query);
  }

  @Get('feedback/:id')
  getFeedback(@Param('id', ParseUUIDPipe) id: string) {
    return this.feedback.get(id);
  }

  @Patch('feedback/:id/status')
  setFeedbackStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFeedbackStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.feedback.setStatus(id, dto.status, user);
  }
}

import { Injectable } from '@nestjs/common';
import { FeedbackType } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { CreateFeedbackReportDto } from './dto/create-feedback-report.dto';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateFeedbackReportDto, user: AuthenticatedUser) {
    return this.prisma.feedbackReport.create({
      data: {
        type: dto.type,
        title: dto.title.trim(),
        description: dto.description.trim(),
        pageUrl: dto.pageUrl?.trim() || null,
        userId: user.id,
      },
      select: {
        id: true,
        type: true,
        title: true,
        description: true,
        pageUrl: true,
        userId: true,
        createdAt: true,
      },
    });
  }

  list(type?: FeedbackType) {
    return this.prisma.feedbackReport.findMany({
      where: type ? { type } : undefined,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        title: true,
        description: true,
        pageUrl: true,
        userId: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }
}

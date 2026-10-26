import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { FeedbackType } from '@prisma/client';

export class CreateFeedbackReportDto {
  @IsEnum(FeedbackType)
  type: FeedbackType;

  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title: string;

  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  description: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  pageUrl?: string;
}

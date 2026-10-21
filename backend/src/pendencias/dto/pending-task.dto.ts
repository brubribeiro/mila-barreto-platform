import { PartialType } from '@nestjs/mapped-types';
import { PendingCategory, PendingRule } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreatePendingTaskDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null;

  @IsEnum(PendingCategory)
  category: PendingCategory;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dueDate deve estar no formato YYYY-MM-DD' })
  dueDate?: string | null;

  @IsOptional()
  @IsBoolean()
  urgent?: boolean;

  @IsOptional()
  @IsUUID()
  assigneeId?: string | null;
}

export class UpdatePendingTaskDto extends PartialType(CreatePendingTaskDto) {}

/** Ações sobre uma pendência da lista: `key` vem de PendingItem.key (manual ou gerada por regra). */
export class PendingKeyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  key: string;
}

export class AssignPendingDto extends PendingKeyDto {
  @IsOptional()
  @IsUUID()
  assigneeId?: string | null;
}

export class PendingRuleConfigDto {
  @IsEnum(PendingRule)
  rule: PendingRule;

  @IsBoolean()
  enabled: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  param?: number | null;

  @IsOptional()
  @IsUUID()
  assigneeId?: string | null;
}

export class UpdatePendingRulesDto {
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => PendingRuleConfigDto)
  rules: PendingRuleConfigDto[];
}

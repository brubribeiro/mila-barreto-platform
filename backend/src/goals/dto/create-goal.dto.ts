import { GoalFormat, GoalMetric, GoalPeriodType } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

// Limite da coluna Decimal(12, 2).
const MAX_VALUE = 9_999_999_999;

export class CreateGoalDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  name: string;

  @IsEnum(GoalMetric)
  metric: GoalMetric;

  /** Obrigatório só para metas manuais; nas automáticas é definido pelo indicador. */
  @IsOptional()
  @IsEnum(GoalFormat)
  format?: GoalFormat;

  @IsNumber()
  @Min(0.01)
  @Max(MAX_VALUE)
  target: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(MAX_VALUE)
  manualValue?: number | null;

  @IsEnum(GoalPeriodType)
  periodType: GoalPeriodType;

  /** Qualquer data dentro do período (YYYY-MM-DD); é normalizada para o início dele. */
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'periodStart deve estar no formato YYYY-MM-DD' })
  periodStart: string;

  @IsOptional()
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'color deve ser um hexadecimal (#RRGGBB)' })
  color?: string;
}

import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { SLUG_PATTERN, trimToUndefined } from './create-tenant.dto';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** Limites informativos do plano (ainda não bloqueiam nada). Ausente/null = ilimitado. */
export class PlanLimitsDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  maxUsers?: number | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxPatients?: number | null;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0.1)
  storageGb?: number | null;
}

const PLAN_SLUG_MESSAGE = 'Identificador deve ter só letras minúsculas, números e hífens (ex.: profissional).';

export class CreatePlanDto {
  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name: string;

  /** Gerado a partir do nome se vazio. */
  @Transform(trimToUndefined)
  @IsOptional()
  @Matches(SLUG_PATTERN, { message: PLAN_SLUG_MESSAGE })
  @MaxLength(60)
  slug?: string;

  /** Texto vazio limpa a descrição. */
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() || null : value))
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => PlanLimitsDto)
  limits?: PlanLimitsDto | null;
}

/** Ativar/desativar tem rotas próprias (auditadas à parte). */
export class UpdatePlanDto {
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name?: string;

  @Transform(trimToUndefined)
  @IsOptional()
  @Matches(SLUG_PATTERN, { message: PLAN_SLUG_MESSAGE })
  @MaxLength(60)
  slug?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() || null : value))
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => PlanLimitsDto)
  limits?: PlanLimitsDto | null;
}

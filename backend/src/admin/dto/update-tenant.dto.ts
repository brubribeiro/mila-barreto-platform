import { Transform } from 'class-transformer';
import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

import { SLUG_MESSAGE, SLUG_PATTERN, trimToUndefined } from './create-tenant.dto';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class UpdateTenantDto {
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @Transform(trimToUndefined)
  @IsOptional()
  @Matches(SLUG_PATTERN, { message: SLUG_MESSAGE })
  @MaxLength(60)
  slug?: string;
}

export class SuspendTenantDto {
  /** Motivo (opcional), guardado só na auditoria da plataforma. */
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

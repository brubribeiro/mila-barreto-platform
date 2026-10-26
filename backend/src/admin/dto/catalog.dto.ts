import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

import { PLATFORM_CATALOG_KINDS } from '../platform-catalog.constants';
import { trimToUndefined } from './create-tenant.dto';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateCatalogItemDto {
  @IsIn([...PLATFORM_CATALOG_KINDS], { message: 'Tipo de catálogo inválido.' })
  kind: (typeof PLATFORM_CATALOG_KINDS)[number];

  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  value: string;

  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  label: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsObject()
  meta?: Record<string, unknown> | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

/** Ativar/desativar tem rotas próprias (auditadas à parte). */
export class UpdateCatalogItemDto {
  @Transform(trimToUndefined)
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  value?: string;

  @Transform(trim)
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  label?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsObject()
  meta?: Record<string, unknown> | null;
}

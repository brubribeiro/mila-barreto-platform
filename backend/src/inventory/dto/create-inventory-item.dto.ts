import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { InventoryCategory } from '@prisma/client';

export class CreateInventoryItemDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(InventoryCategory)
  category?: InventoryCategory;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minQuantity?: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsNumber()
  costPrice?: number;

  /** Quantos dias antes da validade o sistema deve notificar. Null = sem notificação. */
  @IsOptional()
  @IsInt()
  @Min(1)
  expiryNotifyDaysBefore?: number;
}

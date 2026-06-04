import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateInventoryItemDto } from './create-inventory-item.dto';

export class BulkPurchaseLineDto {
  @ValidateIf((o) => !o.newItem)
  @IsUUID()
  itemId?: string;

  @ValidateIf((o) => !o.itemId)
  @ValidateNested()
  @Type(() => CreateInventoryItemDto)
  newItem?: CreateInventoryItemDto;

  @Type(() => Number)
  @IsNumber()
  @Min(0.001)
  quantity: number;

  /** Valor pago pelo produto (sem frete). O frete é rateado proporcionalmente. */
  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  productTotal: number;

  @IsDateString()
  expiresAt: string;
}

export class BulkPurchaseDto {
  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  freight?: number;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BulkPurchaseLineDto)
  lines: BulkPurchaseLineDto[];
}

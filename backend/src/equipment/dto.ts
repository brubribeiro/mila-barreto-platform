import { IsBoolean, IsDateString, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class CreateEquipmentDto {
  @IsString()
  name: string;

  @IsOptional() @IsString()
  brand?: string;

  @IsOptional() @IsString()
  model?: string;

  @IsOptional() @IsString()
  serialNumber?: string;

  @IsOptional() @IsDateString()
  purchaseDate?: string;

  @IsOptional() @IsNumber()
  purchaseValue?: number;

  @IsOptional() @IsNumber()
  maintenanceValue?: number;

  @IsOptional() @IsInt() @Min(1)
  maintenanceIntervalMonths?: number;

  @IsOptional() @IsInt() @Min(1)
  maintenanceNotifyDaysBefore?: number;

  @IsOptional() @IsDateString()
  lastMaintenanceAt?: string;

  @IsOptional() @IsDateString()
  scheduledMaintenanceAt?: string;

  @IsOptional() @IsString()
  notes?: string;

  @IsOptional() @IsBoolean()
  active?: boolean;
}

export class UpdateEquipmentDto extends PartialType(CreateEquipmentDto) {}

import { IsString, IsOptional, IsNumber, IsBoolean, Min, Max } from 'class-validator';

export class CreatePaymentMethodDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  feePercent?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

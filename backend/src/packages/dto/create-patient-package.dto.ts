import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePatientPackageDto {
  @IsUUID()
  patientId: string;

  @IsUUID()
  packageId: string;

  /** Valor acordado do pacote. Se omitido, usa o preço do catálogo. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalPaid?: number;

  /** Pagamento antecipado (opcional). Se informado, gera receita no financeiro na hora. */
  @IsOptional()
  @IsUUID()
  paymentMethodId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdatePatientPackageDto {
  @IsOptional()
  @IsEnum(['ACTIVE', 'COMPLETED', 'EXPIRED', 'CANCELLED'])
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

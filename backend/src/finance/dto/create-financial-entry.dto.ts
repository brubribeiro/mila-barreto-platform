import { IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';
import { ExpenseType, FinancialType } from '@prisma/client';

export class CreateFinancialEntryDto {
  @IsEnum(FinancialType)
  type: FinancialType;

  @IsString()
  description: string;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsUUID()
  paymentMethodId?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsUUID()
  patientId?: string;

  @IsOptional()
  @IsUUID()
  appointmentId?: string;

  @IsOptional()
  @IsUUID()
  equipmentId?: string;

  @IsOptional()
  @IsBoolean()
  invoiceIssued?: boolean;

  @IsOptional()
  @IsEnum(ExpenseType)
  expenseType?: ExpenseType;
}

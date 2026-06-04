import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { ExpenseType } from '@prisma/client';

export class CreateRecurringExpenseDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsString()
  category?: string;

  @IsEnum(ExpenseType)
  expenseType: ExpenseType;

  @IsInt()
  @Min(1)
  @Max(31)
  dueDay: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

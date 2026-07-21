import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsString, Matches } from 'class-validator';

import { CreateAppointmentDto } from './create-appointment.dto';

export class UpdateAppointmentDto extends PartialType(CreateAppointmentDto) {
  /** ID da forma de pagamento — informado ao concluir o agendamento */
  @IsOptional()
  @IsString()
  paymentMethodId?: string;

  /**
   * Mês de competência da receita (formato "YYYY-MM"). Usado para lançar
   * agendamentos antigos no mês financeiro correto. Se ausente, usa a data atual.
   */
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: 'referenceMonth deve estar no formato YYYY-MM' })
  referenceMonth?: string;
}

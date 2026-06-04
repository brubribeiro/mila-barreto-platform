import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsString } from 'class-validator';

import { CreateAppointmentDto } from './create-appointment.dto';

export class UpdateAppointmentDto extends PartialType(CreateAppointmentDto) {
  /** ID da forma de pagamento — informado ao concluir o agendamento */
  @IsOptional()
  @IsString()
  paymentMethodId?: string;
}

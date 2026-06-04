import { IsNumber, IsUUID, Min } from 'class-validator';

export class AppointmentMaterialDto {
  @IsUUID()
  itemId: string;

  @IsNumber()
  @Min(0.001)
  quantity: number;
}

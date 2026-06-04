import { IsBoolean, IsEmail, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateUserDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsUUID()
  roleId: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsBoolean()
  providesAppointments?: boolean;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

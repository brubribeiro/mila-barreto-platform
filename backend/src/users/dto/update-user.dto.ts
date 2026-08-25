import { IsArray, IsBoolean, IsEmail, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsUUID()
  roleId?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsBoolean()
  providesAppointments?: boolean;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  // Perfil de profissional
  @IsOptional()
  @IsString()
  specialty?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialties?: string[];

  @IsOptional()
  @IsString()
  councilRegister?: string;

  @IsOptional()
  @IsString()
  calendarColor?: string;

  @IsOptional()
  @IsString()
  bio?: string;
}

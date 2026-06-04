import { ArrayUnique, IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  permissions: string[];

  @IsOptional()
  @IsBoolean()
  restrictToOwnAppointments?: boolean;
}

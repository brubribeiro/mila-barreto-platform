import { ArrayUnique, IsArray, IsBoolean, IsOptional, IsString, Matches } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'Cor deve estar no formato #RRGGBB' })
  color?: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayUnique()
  permissions: string[];

  @IsOptional()
  @IsBoolean()
  restrictToOwnAppointments?: boolean;
}

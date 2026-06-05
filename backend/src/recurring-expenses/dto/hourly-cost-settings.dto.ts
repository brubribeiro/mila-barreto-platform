import { IsBoolean } from 'class-validator';

export class HourlyCostSettingsDto {
  @IsBoolean()
  includeVariable: boolean;
}

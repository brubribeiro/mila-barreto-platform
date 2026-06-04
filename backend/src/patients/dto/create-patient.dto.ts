import { IsDateString, IsEmail, IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export const PATIENT_SEX_VALUES = ['M', 'F'] as const;
export type PatientSex = (typeof PATIENT_SEX_VALUES)[number];

export const PATIENT_REFERRAL_SOURCE_VALUES = [
  'INSTAGRAM',
  'REFERRAL',
  'GOOGLE',
  'LOCATION',
  'OTHER',
] as const;
export type PatientReferralSource = (typeof PATIENT_REFERRAL_SOURCE_VALUES)[number];

export class CreatePatientDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  /** M = masculino, F = feminino */
  @IsOptional()
  @IsIn(PATIENT_SEX_VALUES)
  sex?: PatientSex;

  @IsOptional()
  @IsString()
  document?: string;

  @IsOptional()
  @IsString()
  cep?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  addressStreet?: string;

  @IsOptional()
  @IsString()
  addressNeighborhood?: string;

  @IsOptional()
  @IsString()
  addressCity?: string;

  @IsOptional()
  @IsString()
  addressState?: string;

  @IsOptional()
  @IsString()
  addressNumber?: string;

  @IsOptional()
  @IsString()
  addressComplement?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  /** Como conheceu a clínica */
  @IsOptional()
  @IsIn(PATIENT_REFERRAL_SOURCE_VALUES)
  referralSource?: PatientReferralSource;

  @IsOptional()
  @IsString()
  referralSourceOther?: string;

  @IsOptional()
  @IsObject()
  anamnesis?: Record<string, any>;
}

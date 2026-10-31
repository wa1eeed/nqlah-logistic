import { IsEmail, IsEnum, IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateCompanyDto {
  @IsOptional() @IsString() nameAr?: string;
  @IsOptional() @IsString() nameEn?: string;
  @IsOptional() @IsString() crNumber?: string;
  @IsOptional() @IsString() vatNumber?: string;
  @IsOptional() @IsString() logo?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() region?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() contactPhone?: string;
  @IsOptional() @IsEmail() contactEmail?: string;
  @IsOptional() @IsUrl({ require_protocol: false }) website?: string;

  // Cash-on-delivery collection preference + bank details (carrier).
  @IsOptional() @IsEnum(['CASH', 'BANK_TRANSFER'] as const) codPayoutMethod?: 'CASH' | 'BANK_TRANSFER';
  @IsOptional() @IsString() iban?: string;
  @IsOptional() @IsString() bankName?: string;
  @IsOptional() @IsString() bankAccountName?: string;
}

export class SubmitKycDto {
  @IsString() type!: string;
  @IsString() fileUrl!: string;
  @IsOptional() @IsString() notes?: string;
}

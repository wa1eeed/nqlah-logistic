import { IsBoolean, IsInt, IsOptional, IsString, Length, Matches, MinLength } from 'class-validator';

// ─── Country ──────────────────────────────────────────────────
export class CreateCountryDto {
  /** ISO 3166-1 alpha-2, stored uppercase (e.g. SA, AE). */
  @Matches(/^[A-Za-z]{2}$/, { message: 'code must be a 2-letter ISO alpha-2 code' })
  code!: string;

  @IsString() @MinLength(1) nameAr!: string;
  @IsString() @MinLength(1) nameEn!: string;

  @IsOptional() @IsString() @Length(1, 8) dialCode?: string;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsInt() sortOrder?: number;
}

export class UpdateCountryDto {
  @IsOptional() @Matches(/^[A-Za-z]{2}$/, { message: 'code must be a 2-letter ISO alpha-2 code' }) code?: string;
  @IsOptional() @IsString() @MinLength(1) nameAr?: string;
  @IsOptional() @IsString() @MinLength(1) nameEn?: string;
  @IsOptional() @IsString() @Length(0, 8) dialCode?: string | null;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsInt() sortOrder?: number;
}

// ─── Region ───────────────────────────────────────────────────
export class CreateRegionDto {
  @IsString() @MinLength(1) countryId!: string;
  @IsString() @MinLength(1) nameAr!: string;
  @IsString() @MinLength(1) nameEn!: string;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsInt() sortOrder?: number;
}

export class UpdateRegionDto {
  @IsOptional() @IsString() @MinLength(1) nameAr?: string;
  @IsOptional() @IsString() @MinLength(1) nameEn?: string;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsInt() sortOrder?: number;
}

// ─── City ─────────────────────────────────────────────────────
export class CreateCityDto {
  @IsString() @MinLength(1) regionId!: string;
  @IsString() @MinLength(1) nameAr!: string;
  @IsString() @MinLength(1) nameEn!: string;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsInt() sortOrder?: number;
}

export class UpdateCityDto {
  @IsOptional() @IsString() @MinLength(1) nameAr?: string;
  @IsOptional() @IsString() @MinLength(1) nameEn?: string;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsInt() sortOrder?: number;
}

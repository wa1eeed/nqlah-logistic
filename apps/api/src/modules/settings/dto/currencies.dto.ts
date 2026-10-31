import { Type } from 'class-transformer';
import {
  ArrayMinSize, IsArray, IsInt, IsNotEmpty, IsString, Matches, Max, MaxLength, Min,
  ValidateNested,
} from 'class-validator';

/**
 * DTOs for the admin-managed currency system. The list + default live in the
 * platform key/value `Setting` store under `currencies.list` (JSON array) and
 * `currencies.default` (scalar code) — no schema churn, mirroring app-settings.
 * Consumed publicly by the web dashboards and the mobile app to format money.
 */

export class CurrencyDto {
  /** ISO 4217-style code, 3 uppercase letters (e.g. SAR, USD, AED). */
  @IsString() @Matches(/^[A-Z]{3}$/, { message: 'رمز العملة يجب أن يكون 3 أحرف كبيرة' })
  code!: string;

  /** Display symbol (e.g. the Saudi Riyal sign U+20C1, or "$"). */
  @IsString() @IsNotEmpty({ message: 'رمز العرض مطلوب' }) @MaxLength(8)
  symbol!: string;

  @IsString() @IsNotEmpty({ message: 'الاسم بالعربية مطلوب' }) @MaxLength(60)
  nameAr!: string;

  @IsString() @IsNotEmpty({ message: 'الاسم بالإنجليزية مطلوب' }) @MaxLength(60)
  nameEn!: string;

  /** Fraction digits used when rendering amounts (0–4, default 2). */
  @IsInt() @Min(0) @Max(4)
  decimals!: number;
}

/** Admin-only full edit payload: the enabled list + the default code. */
export class UpdateCurrenciesDto {
  @IsArray() @ArrayMinSize(1, { message: 'يجب تفعيل عملة واحدة على الأقل' })
  @ValidateNested({ each: true }) @Type(() => CurrencyDto)
  currencies!: CurrencyDto[];

  /** Code of the default currency — must be one of the currencies above. */
  @IsString() @Matches(/^[A-Z]{3}$/, { message: 'العملة الافتراضية غير صالحة' })
  defaultCurrencyCode!: string;
}

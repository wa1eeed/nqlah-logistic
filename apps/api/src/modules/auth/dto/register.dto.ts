import {
  IsEmail, IsEnum, IsNumber, IsObject, IsOptional, IsString, IsBoolean, IsDateString, Matches, MinLength, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsStrongPassword } from '../../../common/validators/strong-password.validator';

// Must stay in sync with Prisma enum `TruckType` and the carrier fleet
// `CreateTruckDto` (apps/api/src/modules/fleet/dto/fleet.dto.ts).
const TRUCK_TYPES = [
  'SMALL_VAN', 'SMALL_FLATBED', 'MEDIUM_FLATBED', 'LARGE_FLATBED', 'REFRIGERATED',
  'CONTAINER_20', 'CONTAINER_40', 'CONTAINER_TRAILER', 'TANKER', 'CURTAINSIDER', 'BOX_TRUCK', 'LOWBED',
] as const;

/**
 * Quick-add truck captured during an individual carrier's signup, so the
 * sole-operator is ready to work right after registration. Only the essentials
 * — the rest of the fleet details are completed later in the app.
 */
export class InitialTruckDto {
  @IsString() plateNumber!: string;
  @IsEnum(TRUCK_TYPES) type!: (typeof TRUCK_TYPES)[number];
  @Type(() => Number) @IsNumber() capacity!: number;
}

/**
 * Phone-first onboarding (Option A — default).
 * Email is OPTIONAL and never receives an OTP. Only the phone is verified
 * via SMS OTP. Users without an email can still register.
 */
export class RegisterDto {
  // Phone — REQUIRED, used for SMS OTP verification & primary contact.
  // Accepts an international E.164 number (+<country><subscriber>) or the Saudi
  // local shorthand (05XXXXXXXX / 5XXXXXXXX), which the server normalizes.
  @Matches(/^(\+?[1-9]\d{6,14}|0?5\d{8})$/, { message: 'رقم الجوال غير صالح' })
  phone!: string;

  // Email — OPTIONAL (Option B). When provided, no OTP is sent; user can verify later.
  @IsOptional()
  @IsEmail({}, { message: 'البريد الإلكتروني غير صالح' })
  email?: string;

  @IsStrongPassword()
  password!: string;

  @IsString()
  @MinLength(2)
  firstName!: string;

  @IsString()
  @MinLength(2)
  lastName!: string;

  @IsEnum(['CLIENT', 'CARRIER'] as const, { message: 'نوع الحساب غير صالح' })
  companyType!: 'CLIENT' | 'CARRIER';

  // COMPANY (a registered business) or INDIVIDUAL (a sole operator). Default COMPANY.
  @IsOptional()
  @IsEnum(['COMPANY', 'INDIVIDUAL'] as const, { message: 'نوع الكيان غير صالح' })
  accountType?: 'COMPANY' | 'INDIVIDUAL';

  // The subscription plan chosen at signup (optional → the default plan is used).
  @IsOptional() @IsString() planId?: string;

  // Verification documents: { <docType>: <object-store key> } (CR, VAT, …).
  @IsOptional() @IsObject() documents?: Record<string, string>;

  // National ID — relevant for an individual operator.
  @IsOptional() @IsString() nationalId?: string;

  // For a driver / INDIVIDUAL operator: ISO-3166 alpha-2 nationality and the
  // identity-document type (NATIONAL_ID | IQAMA | PASSPORT).
  @IsOptional() @IsString() nationality?: string;
  @IsOptional() @IsEnum(['NATIONAL_ID', 'IQAMA', 'PASSPORT'] as const) idType?: 'NATIONAL_ID' | 'IQAMA' | 'PASSPORT';

  // For an INDIVIDUAL carrier, the owner is also a driver; these seed their
  // driver profile (optional — completed later in the driver portal if omitted).
  @IsOptional() @IsString() licenseNumber?: string;
  @IsOptional() @IsDateString() licenseExpiry?: string;
  @IsOptional() @IsString() licenseType?: string;

  @IsString()
  @MinLength(2)
  companyNameAr!: string;

  @IsOptional()
  @IsString()
  companyNameEn?: string;

  // Commercial Register — a CARRIER company (10 digits).
  @IsOptional() @Matches(/^\d{10}$/, { message: 'رقم السجل التجاري يجب أن يكون 10 أرقام' })
  crNumber?: string;

  // VAT (ZATCA) — relevant for a CARRIER company. The Saudi VAT number is 15
  // digits. When `vatRegistered` is false ("غير مسجّل في الضريبة"), the number
  // is not required and no service VAT is charged on the carrier's transactions.
  @IsOptional() @Matches(/^\d{15}$/, { message: 'الرقم الضريبي يجب أن يكون 15 رقماً' })
  vatNumber?: string;
  @IsOptional() @IsBoolean() vatRegistered?: boolean;

  // ISO-3166 alpha-2 country of the company's base (e.g. "SA"). Optional —
  // the registration cascade (country → region → city) sends it so the stored
  // region/city are unambiguous across countries.
  @IsOptional() @IsString() countryCode?: string;

  @IsString()
  city!: string;

  @IsString()
  region!: string;

  @IsString()
  contactPhone!: string;

  // Contact email is also optional now
  @IsOptional()
  @IsEmail({}, { message: 'بريد التواصل غير صالح' })
  contactEmail?: string;

  // Legal consent — REQUIRED (recorded for compliance)
  @IsBoolean()
  acceptedTerms!: boolean;

  @IsBoolean()
  acceptedPrivacy!: boolean;

  @IsBoolean()
  acceptedTransport!: boolean;

  // Quick-add truck — only for an INDIVIDUAL carrier (sole operator). Optional
  // and skippable at signup; when present, an initial fleet truck is created
  // for the new company so the carrier can start working immediately.
  @IsOptional() @ValidateNested() @Type(() => InitialTruckDto) truck?: InitialTruckDto;
}

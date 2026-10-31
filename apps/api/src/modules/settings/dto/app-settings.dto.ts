import { Type } from 'class-transformer';
import {
  IsArray, IsBoolean, IsIn, IsOptional, IsString, Matches, MaxLength, ValidateNested,
} from 'class-validator';

/**
 * DTOs for the mobile app-settings feature. The config is persisted in the
 * platform key/value `Setting` store under the `app.*` keys (no schema churn)
 * and assembled into one object by `AppSettingsService`. Every section is
 * optional so the admin UI can PATCH-style save a single card at a time.
 */

export class SplashDto {
  /** Splash background color as a hex string (e.g. #0A2A28). */
  @IsOptional() @IsString() @Matches(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, { message: 'لون غير صالح' })
  backgroundColor?: string;

  /** Show the platform logo on the splash screen. */
  @IsOptional() @IsBoolean() useLogo?: boolean;

  /** Which platform logo variant the splash renders (light / dark surface). */
  @IsOptional() @IsIn(['light', 'dark']) logoVariant?: 'light' | 'dark';

  @IsOptional() @IsString() @MaxLength(140) taglineAr?: string;
  @IsOptional() @IsString() @MaxLength(140) taglineEn?: string;
}

export class OnboardingSlideDto {
  /** Stable client-generated id, used for reorder / remove in the editor. */
  @IsString() @MaxLength(64) id!: string;

  /** Image URL (uploaded via the existing /uploads/presign flow). */
  @IsOptional() @IsString() @MaxLength(2048) imageUrl?: string;

  @IsOptional() @IsString() @MaxLength(140) titleAr?: string;
  @IsOptional() @IsString() @MaxLength(140) titleEn?: string;
  @IsOptional() @IsString() @MaxLength(500) bodyAr?: string;
  @IsOptional() @IsString() @MaxLength(500) bodyEn?: string;
}

export class OnboardingDto {
  /** Whether the onboarding carousel is shown at all. */
  @IsOptional() @IsBoolean() enabled?: boolean;

  /** true = show once per install; false = always show on launch. */
  @IsOptional() @IsBoolean() showOnce?: boolean;

  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => OnboardingSlideDto)
  slides?: OnboardingSlideDto[];
}

/**
 * The four store build numbers. Written either by an admin (manual override
 * via PUT /settings/app) or by the deploy pipeline (PUT /settings/app/versions).
 */
export class VersionsDto {
  @IsOptional() @IsString() @MaxLength(32) iosLive?: string;
  @IsOptional() @IsString() @MaxLength(32) iosTestFlight?: string;
  @IsOptional() @IsString() @MaxLength(32) androidLive?: string;
  @IsOptional() @IsString() @MaxLength(32) androidTestFlight?: string;
}

export class UpdatePolicyDto {
  /** Minimum version allowed to keep using the app. */
  @IsOptional() @IsString() @MaxLength(32) minSupportedVersion?: string;

  /** When true the app blocks until the user updates. */
  @IsOptional() @IsBoolean() forceUpdate?: boolean;

  @IsOptional() @IsString() @MaxLength(500) messageAr?: string;
  @IsOptional() @IsString() @MaxLength(500) messageEn?: string;
}

/** Admin-only full edit payload (any subset of sections). */
export class UpdateAppSettingsDto {
  @IsOptional() @ValidateNested() @Type(() => SplashDto) splash?: SplashDto;
  @IsOptional() @ValidateNested() @Type(() => OnboardingDto) onboarding?: OnboardingDto;
  @IsOptional() @ValidateNested() @Type(() => VersionsDto) versions?: VersionsDto;
  @IsOptional() @ValidateNested() @Type(() => UpdatePolicyDto) update?: UpdatePolicyDto;
}

/**
 * Deploy-pipeline payload: the build numbers plus optionally the
 * minimum-supported version. Authenticated with a deploy token header.
 */
export class UpdateVersionsDto extends VersionsDto {
  @IsOptional() @IsString() @MaxLength(32) minSupportedVersion?: string;
}

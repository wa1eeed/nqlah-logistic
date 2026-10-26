import { Type } from 'class-transformer';
import {
  IsArray, IsBoolean, IsEnum, IsNumber, IsObject, IsOptional, IsString, Max, Min, ValidateNested,
} from 'class-validator';

const VISIBILITY_SCOPES = ['ALL', 'GROUP', 'CARRIER'] as const;
const ASSIGNMENT_MODES = ['MARKET', 'DIRECT'] as const;
const PRICING_MODES = ['MARKET', 'FIXED'] as const;
const COLLECTION_METHODS = ['ESCROW', 'PREPAID_WALLET', 'PREPAID_GATEWAY', 'COD'] as const;
const COMMISSION_APPLIES = ['CLIENT', 'CARRIER', 'BOTH'] as const;
const PLAN_AUDIENCES = ['CLIENT', 'CARRIER', 'BOTH'] as const;

export class ClientPolicyDto {
  @IsBoolean() allowMarket!: boolean;
  @IsBoolean() allowDirect!: boolean;
  @IsOptional() @IsString() forcedCarrierId?: string | null;
  @IsBoolean() allowMarketPricing!: boolean;
  @IsBoolean() allowFixedPricing!: boolean;
  @IsBoolean() allowPrepaid!: boolean;
  @IsBoolean() allowCOD!: boolean;
  // Per-group module defaults (set by the admin).
  @IsOptional() @IsEnum(ASSIGNMENT_MODES) defaultAssignment?: (typeof ASSIGNMENT_MODES)[number] | null;
  @IsOptional() @IsEnum(PRICING_MODES) defaultPricing?: (typeof PRICING_MODES)[number] | null;
  @IsOptional() @IsEnum(COLLECTION_METHODS) defaultCollectionMethod?: (typeof COLLECTION_METHODS)[number] | null;
  @IsOptional() @IsBoolean() enforceCollectionMethod?: boolean;
  @IsOptional() @IsEnum(VISIBILITY_SCOPES) visibilityScope?: (typeof VISIBILITY_SCOPES)[number];
  @IsOptional() @IsString() visibleCarrierGroupId?: string | null;
  // Capability layer (feature flags + numeric limits), a free-form map.
  @IsOptional() @IsObject() features?: Record<string, boolean | number> | null;
  // Commission config (consumed by the finance/tax module).
  @IsOptional() @IsNumber() @Min(0) @Max(1) commissionRate?: number | null;
  @IsOptional() @IsEnum(COMMISSION_APPLIES) commissionAppliesTo?: (typeof COMMISSION_APPLIES)[number] | null;
  @IsOptional() @IsBoolean() priceVatInclusive?: boolean;
}

const BILLING_CYCLES = ['MONTHLY', 'YEARLY'] as const;

/** Subscription-pricing fields shared by create/update plan. */
class PlanPricingDto {
  @IsOptional() @IsBoolean() isFree?: boolean;
  @IsOptional() @IsNumber() @Min(0) basePrice?: number;
  @IsOptional() @IsEnum(BILLING_CYCLES) billingCycle?: (typeof BILLING_CYCLES)[number];
  @IsOptional() @IsNumber() @Min(0) @Max(100) yearlyDiscountPct?: number;
  @IsOptional() @IsNumber() @Min(0) includedTruckLimit?: number | null;
  @IsOptional() @IsNumber() @Min(0) trialDays?: number;
  @IsOptional() @IsNumber() sortOrder?: number;
  /// The PlanModule ids this plan includes (drives features + price).
  @IsOptional() @IsArray() @IsString({ each: true }) moduleIds?: string[];
}

export class CreatePlanDto extends PlanPricingDto {
  @IsString() name!: string;
  @IsOptional() @IsString() nameEn?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() tier?: string;
  @IsOptional() @IsEnum(PLAN_AUDIENCES) audience?: (typeof PLAN_AUDIENCES)[number];
  @IsString() policyGroupId!: string;
  @IsOptional() @IsNumber() @Min(0) @Max(1) commissionRateOverride?: number;
  @IsOptional() @IsBoolean() isDefault?: boolean;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class UpdatePlanDto extends PlanPricingDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() nameEn?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() tier?: string;
  @IsOptional() @IsEnum(PLAN_AUDIENCES) audience?: (typeof PLAN_AUDIENCES)[number];
  @IsOptional() @IsString() policyGroupId?: string;
  @IsOptional() @IsNumber() @Min(0) @Max(1) commissionRateOverride?: number | null;
  @IsOptional() @IsBoolean() isDefault?: boolean;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class CreatePlanModuleDto {
  @IsString() key!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() nameEn?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(PLAN_AUDIENCES) audience?: (typeof PLAN_AUDIENCES)[number];
  @IsOptional() @IsNumber() @Min(0) price?: number;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsNumber() sortOrder?: number;
}

export class UpdatePlanModuleDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() nameEn?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(PLAN_AUDIENCES) audience?: (typeof PLAN_AUDIENCES)[number];
  @IsOptional() @IsNumber() @Min(0) price?: number;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsNumber() sortOrder?: number;
}

export class AssignPlanDto {
  @IsString() companyId!: string;
  @IsOptional() @IsString() planId?: string | null;
}

export class CreateCarrierGroupDto {
  @IsString() name!: string;
  @IsOptional() @IsString() description?: string;
}

export class UpdateCarrierGroupDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) carrierIds?: string[];
}

export class CreateGroupDto {
  @IsString() name!: string;
  @IsOptional() @IsString() description?: string;
}

export class UpdateGroupDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @ValidateNested() @Type(() => ClientPolicyDto) policy?: ClientPolicyDto;
  @IsOptional() @IsArray() @IsString({ each: true }) clientIds?: string[];
}

export class AssignClientDto {
  @IsString() clientId!: string;
  @IsOptional() @IsString() groupId?: string | null;
}

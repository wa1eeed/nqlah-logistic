import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';

const VISIBILITY_SCOPES = ['ALL', 'GROUP', 'CARRIER'] as const;
const ASSIGNMENT_MODES = ['MARKET', 'DIRECT'] as const;
const PRICING_MODES = ['MARKET', 'FIXED'] as const;
const COLLECTION_METHODS = ['ESCROW', 'PREPAID_WALLET', 'PREPAID_GATEWAY', 'COD'] as const;

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

import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';

const VISIBILITY_SCOPES = ['ALL', 'GROUP', 'CARRIER'] as const;

export class ClientPolicyDto {
  @IsBoolean() allowMarket!: boolean;
  @IsBoolean() allowDirect!: boolean;
  @IsOptional() @IsString() forcedCarrierId?: string | null;
  @IsBoolean() allowMarketPricing!: boolean;
  @IsBoolean() allowFixedPricing!: boolean;
  @IsBoolean() allowPrepaid!: boolean;
  @IsBoolean() allowCOD!: boolean;
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

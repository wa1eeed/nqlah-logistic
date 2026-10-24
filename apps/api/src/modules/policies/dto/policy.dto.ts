import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsOptional, IsString, ValidateNested } from 'class-validator';

export class ClientPolicyDto {
  @IsBoolean() allowMarket!: boolean;
  @IsBoolean() allowDirect!: boolean;
  @IsOptional() @IsString() forcedCarrierId?: string | null;
  @IsBoolean() allowMarketPricing!: boolean;
  @IsBoolean() allowFixedPricing!: boolean;
  @IsBoolean() allowPrepaid!: boolean;
  @IsBoolean() allowCOD!: boolean;
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

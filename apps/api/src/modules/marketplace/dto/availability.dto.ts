import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

/// A carrier publishing one of its trucks to the available-trucks marketplace.
export class PublishAvailabilityDto {
  @IsString() originCity!: string;
  @IsString() originRegion!: string;
  /// Set for a backhaul/return offer (truck heading to this destination); omit
  /// for general availability from the origin city.
  @IsOptional() @IsString() destCity?: string;
  @IsOptional() @IsString() destRegion?: string;
  @IsOptional() @IsDateString() availableFrom?: string;
  @IsOptional() @IsDateString() availableTo?: string;
  @IsOptional() @IsNumber() @Min(0) pricePerTrip?: number;
  @IsOptional() @IsString() notes?: string;
}

export class MarketplaceQueryDto {
  @IsOptional() @IsString() city?: string;
}

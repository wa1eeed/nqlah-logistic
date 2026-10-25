import { IsArray, IsBoolean, IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, MinLength } from 'class-validator';

// Must stay in sync with Prisma enum `TruckType` in apps/api/prisma/schema.prisma.
// The carrier UI's truck-types catalog (DEFAULT_TRUCK_TYPES) is the source of
// what the user actually sees — keep this enum a superset of those IDs.
const TRUCKS = [
  'SMALL_VAN','SMALL_FLATBED','MEDIUM_FLATBED','LARGE_FLATBED','REFRIGERATED',
  'CONTAINER_20','CONTAINER_40','CONTAINER_TRAILER','TANKER','CURTAINSIDER','BOX_TRUCK','LOWBED',
] as const;

// Must stay in sync with Prisma enum `FleetOwnership`.
const OWNERSHIP = ['OWNED', 'FREELANCER'] as const;

export class CreateTruckDto {
  @IsString() plateNumber!: string;
  @IsEnum(TRUCKS) type!: (typeof TRUCKS)[number];
  @IsOptional() @IsEnum(OWNERSHIP) ownership?: (typeof OWNERSHIP)[number];
  @IsNumber() capacity!: number;
  @IsOptional() @IsNumber() length?: number;
  @IsOptional() @IsNumber() width?: number;
  @IsOptional() @IsNumber() height?: number;
  @IsOptional() @IsString() make?: string;
  @IsOptional() @IsString() model?: string;
  @IsOptional() @IsInt() year?: number;
  @IsOptional() @IsBoolean() hasRefrigeration?: boolean;
  @IsOptional() @IsBoolean() hasGPS?: boolean;
  @IsOptional() @IsArray() photos?: string[];
  @IsOptional() @IsArray() documents?: string[];
}

export class UpdateTruckDto extends CreateTruckDto {}

export class CreateDriverDto {
  @IsString() userId!: string;
  @IsString() licenseNumber!: string;
  @IsDateString() licenseExpiry!: string;
  @IsString() licenseType!: string;
  @IsOptional() @IsString() photo?: string;
}

/** Invite a new driver in one shot — creates User + DriverProfile atomically. */
export class InviteDriverDto {
  @IsString() fullName!: string;
  @IsString() phone!: string;
  @IsOptional() @IsString() nationalId?: string;
  @IsString() licenseNumber!: string;
  @IsDateString() licenseExpiry!: string;
  @IsString() licenseType!: string;
  @IsOptional() @IsEnum(OWNERSHIP) ownership?: (typeof OWNERSHIP)[number];
  @IsOptional() @IsString() photo?: string;
  /// Driver-portal login password. Optional — omitted → server generates a
  /// temporary one and returns it once so the carrier can share it.
  @IsOptional() @IsString() @MinLength(8) password?: string;
}

export class LocationDto {
  @IsNumber() lat!: number;
  @IsNumber() lng!: number;
  @IsOptional() @IsNumber() speed?: number;
}

const TRUCK_STATUSES = ['AVAILABLE', 'ON_TRIP', 'MAINTENANCE', 'OFF_DUTY'] as const;
const DRIVER_STATUSES = ['AVAILABLE', 'ON_TRIP', 'OFF_DUTY'] as const;

export class AssignDriverDto {
  @IsString() driverId!: string;
}

export class TruckStatusDto {
  @IsEnum(TRUCK_STATUSES) status!: (typeof TRUCK_STATUSES)[number];
}

export class DriverStatusDto {
  @IsEnum(DRIVER_STATUSES) status!: (typeof DRIVER_STATUSES)[number];
}

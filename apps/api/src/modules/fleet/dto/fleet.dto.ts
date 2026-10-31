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

/** Identity-document types for drivers / individual operators. */
export const ID_TYPES = ['NATIONAL_ID', 'IQAMA', 'PASSPORT'] as const;

export class CreateDriverDto {
  @IsString() userId!: string;
  @IsString() licenseNumber!: string;
  @IsDateString() licenseExpiry!: string;
  @IsString() licenseType!: string;
  @IsOptional() @IsString() photo?: string;
  @IsOptional() @IsString() nationality?: string;
  @IsOptional() @IsEnum(ID_TYPES) idType?: (typeof ID_TYPES)[number];
}

/** Invite a new driver in one shot — creates User + DriverProfile atomically. */
export class InviteDriverDto {
  @IsString() fullName!: string;
  @IsString() phone!: string;
  @IsOptional() @IsString() nationalId?: string;
  @IsOptional() @IsString() nationality?: string;
  @IsOptional() @IsEnum(ID_TYPES) idType?: (typeof ID_TYPES)[number];
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

// Must stay in sync with Prisma enum `MaintenanceType`.
const MAINTENANCE_TYPES = [
  'OIL_CHANGE', 'BRAKES', 'TIRES', 'INSPECTION', 'INSURANCE', 'REPAIR', 'OTHER',
] as const;

/** Log a maintenance event («تسجيل صيانة»). */
export class LogMaintenanceDto {
  @IsEnum(MAINTENANCE_TYPES) type!: (typeof MAINTENANCE_TYPES)[number];
  @IsString() @MinLength(2) title!: string;
  @IsOptional() @IsNumber() cost?: number;
  @IsOptional() @IsInt() odometerKm?: number;
  @IsOptional() @IsString() workshop?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsDateString() performedAt?: string;
  /// For INSPECTION/INSURANCE — the renewed expiry this event sets.
  @IsOptional() @IsDateString() nextDueDate?: string;
}

/** Patch a truck's maintenance schedule (odometer, intervals, expiries). */
export class UpdateMaintenanceScheduleDto {
  @IsOptional() @IsInt() odometerKm?: number;
  @IsOptional() @IsInt() oilIntervalKm?: number;
  @IsOptional() @IsInt() lastServiceKm?: number;
  @IsOptional() @IsDateString() inspectionExpiry?: string;
  @IsOptional() @IsDateString() insuranceExpiry?: string;
  @IsOptional() @IsDateString() tiresChangedAt?: string;
}

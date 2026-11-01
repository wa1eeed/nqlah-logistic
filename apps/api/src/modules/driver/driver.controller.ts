import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional } from 'class-validator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Audit } from '../../common/audit/audit.decorator';
import { DriverService } from './driver.service';

class LocationDto {
  @IsNumber() lat!: number;
  @IsNumber() lng!: number;
  @IsOptional() @IsNumber() speed?: number;
}

const DRIVER_DUTY = ['AVAILABLE', 'OFF_DUTY'] as const;
class DutyDto {
  @IsEnum(DRIVER_DUTY) status!: (typeof DRIVER_DUTY)[number];
}

@ApiTags('driver')
@ApiBearerAuth()
@Controller('driver')
export class DriverController {
  constructor(private driver: DriverService) {}

  /** The acting driver's own profile. */
  @Get('me')
  me(@CurrentUser() actor: AuthUser) {
    return this.driver.me(actor);
  }

  /** Active jobs assigned to the acting driver, with route stops. */
  @Get('jobs')
  jobs(@CurrentUser() actor: AuthUser) {
    return this.driver.jobs(actor);
  }

  /** The driver toggles their own duty status (AVAILABLE / OFF_DUTY). */
  @Patch('duty')
  @Audit({ action: 'driver.duty', resourceType: 'DriverProfile' })
  setDuty(@Body() dto: DutyDto, @CurrentUser() actor: AuthUser) {
    return this.driver.setDuty(actor, dto.status);
  }

  /** Report the driver's current location. */
  @Post('location')
  @Audit({ action: 'driver.location', resourceType: 'DriverProfile' })
  location(@Body() dto: LocationDto, @CurrentUser() actor: AuthUser) {
    return this.driver.updateLocation(actor, dto);
  }
}

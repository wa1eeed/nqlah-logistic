import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsNumber, IsOptional } from 'class-validator';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Audit } from '../../common/audit/audit.decorator';
import { DriverService } from './driver.service';

class LocationDto {
  @IsNumber() lat!: number;
  @IsNumber() lng!: number;
  @IsOptional() @IsNumber() speed?: number;
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

  /** Report the driver's current location. */
  @Post('location')
  @Audit({ action: 'driver.location', resourceType: 'DriverProfile' })
  location(@Body() dto: LocationDto, @CurrentUser() actor: AuthUser) {
    return this.driver.updateLocation(actor, dto);
  }
}

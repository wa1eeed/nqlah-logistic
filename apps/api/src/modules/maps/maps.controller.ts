import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { MapsService } from './maps.service';

/// Public maps configuration for the clients (app + web). Returns the active
/// provider + raster tile URL from the Integration Hub so the map provider can
/// be switched from the admin console without shipping a client update.
@ApiTags('maps')
@Controller('config/maps')
export class MapsController {
  constructor(private maps: MapsService) {}

  @Public()
  @Get()
  get() {
    return this.maps.clientConfig();
  }
}

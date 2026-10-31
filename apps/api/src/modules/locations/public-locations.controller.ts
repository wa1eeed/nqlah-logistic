import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { LocationsService } from './locations.service';

/**
 * Public geography feed — the apps (mobile, web dashboards, registration) read
 * this to build cascading country → region → city pickers. Returns only active
 * rows. Lives under `/settings/locations` alongside the other public catalogs.
 */
@ApiTags('settings')
@Controller('settings')
export class PublicLocationsController {
  constructor(private locations: LocationsService) {}

  @Public()
  @Get('locations')
  async locationsTree() {
    const countries = await this.locations.publicTree();
    return { countries };
  }
}

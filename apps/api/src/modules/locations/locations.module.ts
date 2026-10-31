import { Module } from '@nestjs/common';
import { LocationsController } from './locations.controller';
import { PublicLocationsController } from './public-locations.controller';
import { LocationsService } from './locations.service';

@Module({
  controllers: [LocationsController, PublicLocationsController],
  providers: [LocationsService],
  exports: [LocationsService],
})
export class LocationsModule {}

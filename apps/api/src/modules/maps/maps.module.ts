import { Module } from '@nestjs/common';
import { MapsController } from './maps.controller';
import { MapsService } from './maps.service';

/// Maps configuration module. Relies on the @Global IntegrationsService to
/// resolve the active `maps` provider; exposes the public client config.
@Module({
  controllers: [MapsController],
  providers: [MapsService],
})
export class MapsModule {}

import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Audit } from '../../common/audit/audit.decorator';
import { MarketplaceService } from './marketplace.service';
import { MarketplaceQueryDto, PublishAvailabilityDto } from './dto/availability.dto';

@ApiTags('marketplace')
@ApiBearerAuth()
@Controller()
export class MarketplaceController {
  constructor(private marketplace: MarketplaceService) {}

  /// Customer-facing available-trucks marketplace (handoff 6a). Busy trucks are
  /// excluded automatically. Public so unregistered visitors can browse — it
  /// exposes only truck specs + company name/logo/city, never carrier contact.
  @Public()
  @Get('marketplace/trucks')
  list(@Query() q: MarketplaceQueryDto, @CurrentUser() actor?: AuthUser) {
    return this.marketplace.listAvailable(q.city, actor);
  }

  /// Carrier publishes one of its trucks to the marketplace (handoff 7a/7b).
  @Post('fleet/trucks/:id/availability')
  @Audit({ action: 'truck.availability.publish', resourceType: 'Truck', idFrom: 'param', idKey: 'id' })
  publish(@Param('id') id: string, @Body() dto: PublishAvailabilityDto, @CurrentUser() actor: AuthUser) {
    return this.marketplace.publish(id, dto, actor);
  }

  /// Carrier removes a truck from the marketplace.
  @Delete('fleet/trucks/:id/availability')
  @Audit({ action: 'truck.availability.unpublish', resourceType: 'Truck', idFrom: 'param', idKey: 'id' })
  unpublish(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.marketplace.unpublish(id, actor);
  }

  /// The carrier's own published trucks.
  @Get('fleet/availability')
  mine(@CurrentUser() actor: AuthUser) {
    return this.marketplace.mine(actor);
  }
}

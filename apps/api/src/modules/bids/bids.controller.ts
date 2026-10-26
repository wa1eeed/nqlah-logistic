import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Audit } from '../../common/audit/audit.decorator';
import { BidsService } from './bids.service';
import { CreateBidDto, UpdateBidDto } from './dto/bid.dto';

@ApiTags('bids')
@ApiBearerAuth()
@Controller('orders/:orderId/bids')
export class BidsController {
  constructor(private bids: BidsService) {}

  @Get()
  list(@Param('orderId') orderId: string, @Query('legIndex') legIndex?: string) {
    return this.bids.list(orderId, legIndex != null ? Number(legIndex) : undefined);
  }

  @Post()
  create(@Param('orderId') orderId: string, @Body() dto: CreateBidDto, @CurrentUser() actor: AuthUser) {
    return this.bids.create(orderId, dto, actor);
  }

  @Put(':id')
  update(
    @Param('orderId') orderId: string,
    @Param('id') id: string,
    @Body() dto: UpdateBidDto,
    @CurrentUser() actor: AuthUser,
  ) {
    return this.bids.update(orderId, id, dto, actor);
  }

  @Post(':id/accept')
  @Audit({ action: 'bid.accept', resourceType: 'Order', idFrom: 'param', idKey: 'orderId' })
  accept(@Param('orderId') orderId: string, @Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.bids.accept(orderId, id, actor);
  }

  @Post(':id/reject')
  @Audit({ action: 'bid.reject', resourceType: 'Order', idFrom: 'param', idKey: 'orderId' })
  reject(@Param('orderId') orderId: string, @Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.bids.reject(orderId, id, actor);
  }

  @Post(':id/withdraw')
  withdraw(@Param('orderId') orderId: string, @Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.bids.withdraw(orderId, id, actor);
  }
}

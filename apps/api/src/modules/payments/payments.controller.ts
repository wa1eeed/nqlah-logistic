import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { Audit } from '../../common/audit/audit.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('payments')
export class PaymentsController {
  constructor(private payments: PaymentsService) {}

  @Get()
  list(@Query() q: PaginationDto, @CurrentUser() actor: AuthUser) {
    return this.payments.list(q, actor);
  }

  @Get(':id')
  byId(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.payments.findById(id, actor);
  }

  @Post(':id/release')
  @Audit({ action: 'payment.release', resourceType: 'Payment', idFrom: 'param', idKey: 'id' })
  release(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.payments.release(id, actor);
  }

  /** Mark a COD payment's cash as collected on delivery (carrier or admin). */
  @Post(':id/collect')
  @Audit({ action: 'payment.collect', resourceType: 'Payment', idFrom: 'param', idKey: 'id' })
  collect(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.payments.collect(id, actor);
  }
}

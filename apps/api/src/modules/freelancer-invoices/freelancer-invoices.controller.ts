import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { FreelancerInvoicesService } from './freelancer-invoices.service';
import { CreateFreelancerInvoiceDto } from './dto/freelancer-invoice.dto';

@ApiTags('freelancer-invoices')
@ApiBearerAuth()
@Controller('freelancer-invoices')
export class FreelancerInvoicesController {
  constructor(private service: FreelancerInvoicesService) {}

  @Get()
  list(@CurrentUser() actor: AuthUser) {
    return this.service.list(actor);
  }

  @Post()
  create(@Body() dto: CreateFreelancerInvoiceDto, @CurrentUser() actor: AuthUser) {
    return this.service.create(dto, actor);
  }

  @Patch(':id/pay')
  markPaid(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.markPaid(id, actor);
  }

  @Patch(':id/reopen')
  reopen(@Param('id') id: string, @CurrentUser() actor: AuthUser) {
    return this.service.reopen(id, actor);
  }
}

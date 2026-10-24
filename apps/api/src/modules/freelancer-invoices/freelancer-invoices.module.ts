import { Module } from '@nestjs/common';
import { FreelancerInvoicesController } from './freelancer-invoices.controller';
import { FreelancerInvoicesService } from './freelancer-invoices.service';

@Module({
  controllers: [FreelancerInvoicesController],
  providers: [FreelancerInvoicesService],
})
export class FreelancerInvoicesModule {}

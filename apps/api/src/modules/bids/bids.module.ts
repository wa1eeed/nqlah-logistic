import { Module } from '@nestjs/common';
import { BidsController } from './bids.controller';
import { BidsService } from './bids.service';
import { PaymentsModule } from '../payments/payments.module';
import { PoliciesModule } from '../policies/policies.module';

@Module({
  imports: [PaymentsModule, PoliciesModule],
  controllers: [BidsController],
  providers: [BidsService],
})
export class BidsModule {}

import { Module } from '@nestjs/common';
import { BidsController } from './bids.controller';
import { BidsService } from './bids.service';
import { PaymentsModule } from '../payments/payments.module';
import { PoliciesModule } from '../policies/policies.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PaymentsModule, PoliciesModule, NotificationsModule],
  controllers: [BidsController],
  providers: [BidsService],
})
export class BidsModule {}

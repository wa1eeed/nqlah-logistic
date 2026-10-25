import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { RealtimeModule } from '../realtime/realtime.module';
import { PoliciesModule } from '../policies/policies.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [RealtimeModule, PoliciesModule, PaymentsModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}

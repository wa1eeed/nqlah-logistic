import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { RealtimeModule } from '../realtime/realtime.module';
import { PoliciesModule } from '../policies/policies.module';
import { PaymentsModule } from '../payments/payments.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [RealtimeModule, PoliciesModule, PaymentsModule, InvoicesModule, NotificationsModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}

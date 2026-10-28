import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { CollectionService } from './collection/collection.service';
import { PaymentsIntegrationModule } from '../../integrations/payments/payments-integration.module';

@Module({
  // The payment provider is bound behind PAYMENT_CONNECTOR by the integrations
  // gateway (mock in dev; Moyasar/Tap/HyperPay drop in via PAYMENT_PROVIDER).
  imports: [PaymentsIntegrationModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, CollectionService],
  exports: [CollectionService],
})
export class PaymentsModule {}

import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { CollectionService } from './collection/collection.service';
import { PaymentGateway, StubGateway } from './collection/gateway';

@Module({
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    CollectionService,
    // Swap StubGateway for a real provider (Moyasar/Tap/HyperPay) here.
    { provide: PaymentGateway, useClass: StubGateway },
  ],
  exports: [CollectionService],
})
export class PaymentsModule {}

import { Global, Logger, Module } from '@nestjs/common';
import { MockPaymentConnector } from './mock-payment.connector';
import { PAYMENT_CONNECTOR } from './payment.connector';
import { IntegrationsService } from '../../modules/integrations/integrations.service';

/// Binds the active payment connector behind `PAYMENT_CONNECTOR`, resolved by
/// the Integration Hub (DB → env → default). A real adapter (Moyasar / Tap /
/// HyperPay) drops in here; until then non-mock providers fall back to mock.
@Global()
@Module({
  providers: [
    MockPaymentConnector,
    {
      provide: PAYMENT_CONNECTOR,
      useFactory: async (
        integrations: IntegrationsService,
        mock: MockPaymentConnector,
      ) => {
        const { provider } = await integrations.resolveActive('payments');
        if (provider !== 'mock') {
          new Logger('Payments').warn(`Payment provider "${provider}" not wired yet — using mock.`);
        }
        return mock;
      },
      inject: [IntegrationsService, MockPaymentConnector],
    },
  ],
  exports: [PAYMENT_CONNECTOR],
})
export class PaymentsIntegrationModule {}

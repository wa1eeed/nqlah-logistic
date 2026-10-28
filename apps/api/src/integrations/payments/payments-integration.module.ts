import { Global, Logger, Module } from '@nestjs/common';
import { MockPaymentConnector } from './mock-payment.connector';
import { PAYMENT_CONNECTOR } from './payment.connector';

/// Binds the active payment connector behind `PAYMENT_CONNECTOR`. Swap via
/// `PAYMENT_PROVIDER` (default `mock`). A real adapter (Moyasar / Tap /
/// HyperPay) drops in here once credentials are provided — the collection flow
/// injects the token only and never changes.
@Global()
@Module({
  providers: [
    MockPaymentConnector,
    {
      provide: PAYMENT_CONNECTOR,
      useFactory: (mock: MockPaymentConnector) => {
        const provider = (process.env.PAYMENT_PROVIDER ?? 'mock').toLowerCase();
        if (provider !== 'mock') {
          new Logger('Payments').warn(
            `PAYMENT_PROVIDER="${provider}" not wired yet — using mock. Add the adapter + credentials.`,
          );
        }
        return mock;
      },
      inject: [MockPaymentConnector],
    },
  ],
  exports: [PAYMENT_CONNECTOR],
})
export class PaymentsIntegrationModule {}

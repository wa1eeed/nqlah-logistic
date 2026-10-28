import { Global, Logger, Module } from '@nestjs/common';
import { ConsoleSmsConnector } from './console-sms.connector';
import { SMS_CONNECTOR } from './sms.connector';

/// Binds the active SMS connector behind `SMS_CONNECTOR`. Swap via
/// `SMS_PROVIDER` (default `console`). A vendor adapter (Unifonic / mSegat)
/// drops in here once credentials are provided — feature code injects the token
/// only and never changes.
@Global()
@Module({
  providers: [
    ConsoleSmsConnector,
    {
      provide: SMS_CONNECTOR,
      useFactory: (console: ConsoleSmsConnector) => {
        const provider = process.env.SMS_PROVIDER ?? 'console';
        if (provider !== 'console') {
          new Logger('SMS').warn(
            `SMS_PROVIDER="${provider}" not wired yet — using console. Add the adapter + credentials.`,
          );
        }
        return console;
      },
      inject: [ConsoleSmsConnector],
    },
  ],
  exports: [SMS_CONNECTOR],
})
export class SmsModule {}

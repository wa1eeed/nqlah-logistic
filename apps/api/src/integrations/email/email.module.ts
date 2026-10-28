import { Global, Logger, Module } from '@nestjs/common';
import { ConsoleEmailConnector } from './console-email.connector';
import { ResendEmailConnector } from './resend-email.connector';
import { EMAIL_CONNECTOR } from './email.connector';

/// Binds the active email connector behind `EMAIL_CONNECTOR`. Swap via
/// `EMAIL_PROVIDER` (default `console`; `resend` for production). Feature code
/// injects the token only and never changes when the provider does.
@Global()
@Module({
  providers: [
    ConsoleEmailConnector,
    ResendEmailConnector,
    {
      provide: EMAIL_CONNECTOR,
      useFactory: (
        consoleConn: ConsoleEmailConnector,
        resend: ResendEmailConnector,
      ) => {
        const provider = (process.env.EMAIL_PROVIDER ?? 'console').toLowerCase();
        if (provider === 'resend') {
          if (!process.env.RESEND_API_KEY) {
            new Logger('Email').warn(
              'EMAIL_PROVIDER="resend" but RESEND_API_KEY missing — using console.',
            );
            return consoleConn;
          }
          return resend;
        }
        return consoleConn;
      },
      inject: [ConsoleEmailConnector, ResendEmailConnector],
    },
  ],
  exports: [EMAIL_CONNECTOR],
})
export class EmailModule {}

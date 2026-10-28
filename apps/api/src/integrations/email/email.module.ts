import { Global, Logger, Module } from '@nestjs/common';
import { ConsoleEmailConnector } from './console-email.connector';
import { ResendEmailConnector } from './resend-email.connector';
import { EMAIL_CONNECTOR } from './email.connector';
import { IntegrationsService } from '../../modules/integrations/integrations.service';

/// Binds the active email connector behind `EMAIL_CONNECTOR`, resolved by the
/// Integration Hub (DB → env → default). Admin can switch provider / set the
/// Resend key from the console; feature code injects the token only.
@Global()
@Module({
  providers: [
    ConsoleEmailConnector,
    {
      provide: EMAIL_CONNECTOR,
      useFactory: async (
        integrations: IntegrationsService,
        consoleConn: ConsoleEmailConnector,
      ) => {
        const { provider, config } = await integrations.resolveActive('email');
        if (provider === 'resend') {
          if (!config.RESEND_API_KEY) {
            new Logger('Email').warn('EMAIL provider "resend" selected but no API key — using console.');
            return consoleConn;
          }
          return new ResendEmailConnector(config.RESEND_API_KEY, config.EMAIL_FROM);
        }
        return consoleConn;
      },
      inject: [IntegrationsService, ConsoleEmailConnector],
    },
  ],
  exports: [EMAIL_CONNECTOR],
})
export class EmailModule {}

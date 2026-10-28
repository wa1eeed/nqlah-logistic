import { Global, Logger, Module } from '@nestjs/common';
import { ConsoleSmsConnector } from './console-sms.connector';
import { SMS_CONNECTOR } from './sms.connector';
import { IntegrationsService } from '../../modules/integrations/integrations.service';

/// Binds the active SMS connector behind `SMS_CONNECTOR`, resolved by the
/// Integration Hub (DB → env → default). A vendor adapter (Unifonic / mSegat)
/// drops in here; until then non-console providers fall back to console.
@Global()
@Module({
  providers: [
    ConsoleSmsConnector,
    {
      provide: SMS_CONNECTOR,
      useFactory: async (
        integrations: IntegrationsService,
        consoleConn: ConsoleSmsConnector,
      ) => {
        const { provider } = await integrations.resolveActive('sms');
        if (provider !== 'console') {
          new Logger('SMS').warn(`SMS provider "${provider}" not wired yet — using console.`);
        }
        return consoleConn;
      },
      inject: [IntegrationsService, ConsoleSmsConnector],
    },
  ],
  exports: [SMS_CONNECTOR],
})
export class SmsModule {}

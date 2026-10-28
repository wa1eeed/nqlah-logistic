import { Global, Logger, Module } from '@nestjs/common';
import { ConsoleNotificationConnector } from './console-notification.connector';
import { NOTIFICATION_CONNECTOR } from './notification.connector';
import { IntegrationsService } from '../../modules/integrations/integrations.service';

/// Binds the active push connector behind `NOTIFICATION_CONNECTOR`, resolved by
/// the Integration Hub (DB → env → default). An FCM/APNs adapter drops in here;
/// until then non-console providers fall back to console.
@Global()
@Module({
  providers: [
    ConsoleNotificationConnector,
    {
      provide: NOTIFICATION_CONNECTOR,
      useFactory: async (
        integrations: IntegrationsService,
        consoleConn: ConsoleNotificationConnector,
      ) => {
        const { provider } = await integrations.resolveActive('push');
        if (provider !== 'console') {
          new Logger('Push').warn(`Push provider "${provider}" not wired yet — using console.`);
        }
        return consoleConn;
      },
      inject: [IntegrationsService, ConsoleNotificationConnector],
    },
  ],
  exports: [NOTIFICATION_CONNECTOR],
})
export class NotificationsIntegrationModule {}

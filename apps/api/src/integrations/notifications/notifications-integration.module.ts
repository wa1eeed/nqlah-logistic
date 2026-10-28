import { Global, Logger, Module } from '@nestjs/common';
import { ConsoleNotificationConnector } from './console-notification.connector';
import { FcmNotificationConnector } from './fcm-notification.connector';
import { NOTIFICATION_CONNECTOR } from './notification.connector';
import { IntegrationsService } from '../../modules/integrations/integrations.service';

/// Binds the active push connector behind `NOTIFICATION_CONNECTOR`, resolved by
/// the Integration Hub (DB → env → default). `fcm` → FCM/APNs HTTP v1 when a
/// project id + service account are configured; otherwise (and for `console`)
/// the dev connector logs instead of delivering.
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
        const log = new Logger('Push');
        const { provider, config } = await integrations.resolveActive('push');
        if (provider === 'fcm') {
          const projectId = config.FCM_PROJECT_ID?.trim();
          const raw = config.FCM_SERVICE_ACCOUNT?.trim();
          if (projectId && raw) {
            try {
              const sa = JSON.parse(raw);
              if (sa.client_email && sa.private_key) {
                log.log('Push provider: FCM / APNs (HTTP v1).');
                return new FcmNotificationConnector(projectId, sa);
              }
              log.warn('FCM service account missing client_email/private_key — using console.');
            } catch {
              log.warn('FCM service account is not valid JSON — using console.');
            }
          } else {
            log.warn('FCM selected but project id / service account not set — using console.');
          }
        } else if (provider !== 'console') {
          log.warn(`Push provider "${provider}" not wired yet — using console.`);
        }
        return consoleConn;
      },
      inject: [IntegrationsService, ConsoleNotificationConnector],
    },
  ],
  exports: [NOTIFICATION_CONNECTOR],
})
export class NotificationsIntegrationModule {}

import { Global, Logger, Module } from '@nestjs/common';
import { ConsoleNotificationConnector } from './console-notification.connector';
import { NOTIFICATION_CONNECTOR } from './notification.connector';

/// Binds the active push connector behind `NOTIFICATION_CONNECTOR`. Swap via
/// `PUSH_PROVIDER` (default `console`). An `fcm` adapter (Firebase Admin for
/// Android + APNs for iOS) drops in here once FCM server credentials / an APNs
/// key are provided — feature code injects the token only and never changes.
@Global()
@Module({
  providers: [
    ConsoleNotificationConnector,
    {
      provide: NOTIFICATION_CONNECTOR,
      useFactory: (console: ConsoleNotificationConnector) => {
        const provider = process.env.PUSH_PROVIDER ?? 'console';
        if (provider !== 'console') {
          new Logger('Push').warn(
            `PUSH_PROVIDER="${provider}" not wired yet — using console. Add the adapter + credentials.`,
          );
        }
        return console;
      },
      inject: [ConsoleNotificationConnector],
    },
  ],
  exports: [NOTIFICATION_CONNECTOR],
})
export class NotificationsIntegrationModule {}

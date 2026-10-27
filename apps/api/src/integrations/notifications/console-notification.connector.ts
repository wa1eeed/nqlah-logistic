import { Injectable, Logger } from '@nestjs/common';
import type {
  NotificationConnector,
  PushPayload,
  PushTarget,
} from './notification.connector';

/// Dev connector: logs the push instead of delivering it. Lets the whole
/// pipeline (token registration → send) be exercised without FCM/APNs creds.
@Injectable()
export class ConsoleNotificationConnector implements NotificationConnector {
  private readonly logger = new Logger('Push');

  async send(targets: PushTarget[], payload: PushPayload) {
    for (const t of targets) {
      this.logger.log(
        `🔔 [${t.platform}] ${t.token.slice(0, 12)}… → ${payload.title}: ${payload.body}`,
      );
    }
    return { invalidTokens: [] };
  }
}

import { Injectable, Logger } from '@nestjs/common';
import type { SmsConnector, SmsMessage } from './sms.connector';

/// Dev connector: logs the SMS instead of delivering it, so the whole OTP
/// pipeline can be exercised without a paid SMS gateway. The OTP code is
/// visible in the API console.
@Injectable()
export class ConsoleSmsConnector implements SmsConnector {
  private readonly logger = new Logger('SMS');

  async send(message: SmsMessage) {
    this.logger.log(`📱 SMS → ${message.to}: ${message.body}`);
    return { sent: true };
  }
}

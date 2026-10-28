import { Injectable, Logger } from '@nestjs/common';
import type { EmailConnector, EmailMessage } from './email.connector';

/// Dev connector: logs the email instead of delivering it, so flows that send
/// mail can be exercised without a provider key.
@Injectable()
export class ConsoleEmailConnector implements EmailConnector {
  private readonly logger = new Logger('Email');

  async send(message: EmailMessage) {
    const to = Array.isArray(message.to) ? message.to.join(', ') : message.to;
    this.logger.log(`✉️  Email → ${to} · ${message.subject}`);
    return { sent: true };
  }
}

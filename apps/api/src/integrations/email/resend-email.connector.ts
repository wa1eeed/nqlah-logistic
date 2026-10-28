import { Injectable, Logger } from '@nestjs/common';
import type { EmailConnector, EmailMessage } from './email.connector';

/// Resend adapter (https://resend.com). Calls the REST API directly via the
/// built-in `fetch` (Node 18+), so it adds no dependency. Selected when
/// `EMAIL_PROVIDER=resend`; needs `RESEND_API_KEY` and `EMAIL_FROM`.
@Injectable()
export class ResendEmailConnector implements EmailConnector {
  private readonly logger = new Logger('Email');
  private readonly apiKey = process.env.RESEND_API_KEY ?? '';
  private readonly defaultFrom =
    process.env.EMAIL_FROM ?? 'NQLAH <no-reply@nqlah.sa>';

  async send(message: EmailMessage) {
    if (!this.apiKey) {
      this.logger.error('RESEND_API_KEY missing — email not sent.');
      return { sent: false };
    }
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: message.from ?? this.defaultFrom,
          to: Array.isArray(message.to) ? message.to : [message.to],
          subject: message.subject,
          html: message.html,
          text: message.text,
          reply_to: message.replyTo,
        }),
      });
      if (!res.ok) {
        this.logger.error(
          `Resend failed ${res.status}: ${await res.text().catch(() => '')}`,
        );
        return { sent: false };
      }
      const data = (await res.json().catch(() => ({}))) as { id?: string };
      return { sent: true, id: data.id };
    } catch (err) {
      this.logger.error(`Resend error: ${(err as Error).message}`);
      return { sent: false };
    }
  }
}

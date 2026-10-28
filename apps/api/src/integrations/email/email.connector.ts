/// A single transactional email to deliver.
export interface EmailMessage {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string; // overrides the connector default
  replyTo?: string;
}

/// Port for sending transactional email (verification links, receipts,
/// notifications). Feature code depends only on this; concrete connectors
/// (console in dev, Resend in prod) are swapped behind the `EMAIL_CONNECTOR`
/// token via `EmailModule` — part of the integrations gateway, so no email
/// vendor leaks into feature code.
export interface EmailConnector {
  /// Delivers [message]. Returns the provider message id when available.
  send(message: EmailMessage): Promise<{ sent: boolean; id?: string }>;
}

export const EMAIL_CONNECTOR = Symbol('EMAIL_CONNECTOR');

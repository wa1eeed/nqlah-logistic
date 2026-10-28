/// A single SMS to deliver.
export interface SmsMessage {
  to: string; // E.164 / local Saudi number
  body: string;
}

/// Port for sending SMS (OTP codes, alerts). Feature code (e.g. `OtpService`)
/// depends only on this; concrete connectors (console in dev, a Saudi gateway
/// such as Unifonic / mSegat in prod) are swapped behind the `SMS_CONNECTOR`
/// token via `SmsModule` — part of the integrations gateway, so no SMS vendor
/// leaks into feature code.
export interface SmsConnector {
  /// Delivers [message]. Returns the provider message id when available.
  send(message: SmsMessage): Promise<{ sent: boolean; id?: string }>;
}

export const SMS_CONNECTOR = Symbol('SMS_CONNECTOR');

import { Logger } from '@nestjs/common';

export interface AuthenticaOptions {
  /** Delivery channel: sms | whatsapp | email. Defaults to sms. */
  channel?: string;
  /** Authentica template id (configured per app in their portal). Default 1. */
  templateId?: number | string;
  /** Optional fallback email for delivery. */
  fallbackEmail?: string;
}

const BASE_URL = 'https://api.authentica.sa/api/v2';

/// Connector for Authentica (authentica.sa) — a managed OTP provider that
/// **generates, delivers and verifies** the code server-side. We call
/// `/send-otp` (it stores + sends the code) then `/verify-otp` (it validates).
/// There is no sandbox host; staging simulates at our layer (see OtpService).
///
/// Dependency-free (global `fetch`). Auth is the raw API key in the
/// `X-Authorization` header (no "Bearer" prefix).
export class AuthenticaOtpConnector {
  private readonly logger = new Logger('OTP:Authentica');

  constructor(
    private readonly apiKey: string,
    private readonly opts: AuthenticaOptions = {},
  ) {}

  private headers() {
    return {
      'X-Authorization': this.apiKey,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
  }

  /// Ask Authentica to generate + deliver a code to [phone] (E.164, e.g.
  /// +9665XXXXXXXX). Throws on a non-success response.
  async send(phone: string): Promise<void> {
    const body: Record<string, unknown> = {
      method: this.opts.channel || 'sms',
      phone,
      template_id: Number(this.opts.templateId ?? 1) || 1,
    };
    if (this.opts.fallbackEmail) body.fallback_email = this.opts.fallbackEmail;

    const res = await fetch(`${BASE_URL}/send-otp`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    const json = await this.parse(res);
    // send-otp success shape: { success: true, data: null, message: "..." }
    if (!res.ok || json?.success === false) {
      throw new Error(this.errMessage(json, res.status) || 'Authentica send-otp failed');
    }
  }

  /// Ask Authentica to validate [code] for [phone]. Returns true when verified.
  /// A wrong/expired code resolves to false (not an error).
  async verify(phone: string, code: string): Promise<boolean> {
    const res = await fetch(`${BASE_URL}/verify-otp`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ phone, otp: code }),
    });
    const json = await this.parse(res);
    // verify-otp success shape uses `status` (not `success`): { status: true }
    if (res.status === 401) {
      throw new Error(this.errMessage(json, res.status) || 'Authentica unauthorized');
    }
    return res.ok && json?.status === true;
  }

  /// Live credential check: GET /balance validates the API key.
  async balance(): Promise<number> {
    const res = await fetch(`${BASE_URL}/balance`, {
      method: 'GET',
      headers: this.headers(),
    });
    const json = await this.parse(res);
    if (!res.ok || json?.success === false) {
      throw new Error(this.errMessage(json, res.status) || 'Authentica balance check failed');
    }
    return Number(json?.data?.balance ?? 0);
  }

  private async parse(res: Response): Promise<any> {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }

  /// Authentica errors come back as { errors: [{ message }] }.
  private errMessage(json: any, status: number): string {
    const first = Array.isArray(json?.errors) ? json.errors[0]?.message : undefined;
    return first || json?.message || `HTTP ${status}`;
  }
}

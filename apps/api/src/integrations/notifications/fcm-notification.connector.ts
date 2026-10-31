import { Logger } from '@nestjs/common';
import { createSign } from 'node:crypto';
import type {
  NotificationConnector,
  PushPayload,
  PushTarget,
} from './notification.connector';

interface ServiceAccount {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const DEFAULT_TOKEN_URI = 'https://oauth2.googleapis.com/token';

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

/// Production push connector: delivers via Firebase Cloud Messaging HTTP v1
/// (which relays to APNs for iOS). Dependency-free — the service-account JWT is
/// signed with Node's `crypto` and exchanged for a short-lived OAuth token, so
/// no Firebase SDK leaks into the app and the project stays portable.
///
/// Wired behind `NOTIFICATION_CONNECTOR` by `NotificationsIntegrationModule`
/// when the Integration Hub's `push` domain is set to the `fcm` provider with a
/// valid `FCM_PROJECT_ID` + `FCM_SERVICE_ACCOUNT`.
export class FcmNotificationConnector implements NotificationConnector {
  private readonly logger = new Logger('Push:FCM');
  private token: { value: string; expiresAt: number } | null = null;

  constructor(
    private readonly projectId: string,
    private readonly serviceAccount: ServiceAccount,
  ) {}

  /** Build one service-account JWT and exchange it for an access token.
   *  Cached until ~1 min before expiry. */
  private async accessToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    if (this.token && this.token.expiresAt > now + 60) return this.token.value;

    const tokenUri = this.serviceAccount.token_uri || DEFAULT_TOKEN_URI;
    const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claims = base64url(
      JSON.stringify({
        iss: this.serviceAccount.client_email,
        scope: FCM_SCOPE,
        aud: tokenUri,
        iat: now,
        exp: now + 3600,
      }),
    );
    const signingInput = `${header}.${claims}`;
    const signature = base64url(
      createSign('RSA-SHA256').update(signingInput).sign(this.serviceAccount.private_key),
    );
    const assertion = `${signingInput}.${signature}`;

    const res = await fetch(tokenUri, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
    });
    if (!res.ok) {
      throw new Error(`FCM token exchange failed (${res.status}): ${await res.text()}`);
    }
    const json = (await res.json()) as { access_token: string; expires_in: number };
    this.token = { value: json.access_token, expiresAt: now + (json.expires_in ?? 3600) };
    return this.token.value;
  }

  /** Prove the service account is valid by minting an access token (sends no
   *  notification). Throws if the credentials are rejected. */
  async verify(): Promise<void> {
    await this.accessToken();
  }

  async send(targets: PushTarget[], payload: PushPayload) {
    if (targets.length === 0) return { invalidTokens: [] };
    let accessToken: string;
    try {
      accessToken = await this.accessToken();
    } catch (err) {
      this.logger.error(`Could not obtain FCM access token: ${(err as Error).message}`);
      return { invalidTokens: [] }; // transient — don't prune tokens on our own failure
    }

    const endpoint = `https://fcm.googleapis.com/v1/projects/${this.projectId}/messages:send`;
    const invalidTokens: string[] = [];

    await Promise.all(
      targets.map(async (t) => {
        const message = {
          token: t.token,
          notification: { title: payload.title, body: payload.body },
          data: payload.data ?? {},
          android: { priority: 'HIGH' as const, notification: { sound: 'default' } },
          apns: {
            headers: { 'apns-priority': '10' },
            payload: { aps: { sound: 'default' } },
          },
        };
        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message }),
          });
          if (res.ok) return;
          const errText = await res.text();
          // A token that is gone/invalid should be pruned; other errors are
          // transient (quota, 5xx) and the token is kept.
          if (
            res.status === 404 ||
            (res.status === 400 && /UNREGISTERED|INVALID_ARGUMENT|registration-token/i.test(errText))
          ) {
            invalidTokens.push(t.token);
          } else {
            this.logger.warn(`FCM send ${res.status} for ${t.token.slice(0, 12)}…: ${errText.slice(0, 160)}`);
          }
        } catch (err) {
          this.logger.warn(`FCM send error for ${t.token.slice(0, 12)}…: ${(err as Error).message}`);
        }
      }),
    );

    return { invalidTokens };
  }
}

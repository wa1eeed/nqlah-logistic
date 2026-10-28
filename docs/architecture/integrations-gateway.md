# Integrations gateway (connectors)

All **external integrations** sit behind an internal **connector** interface (a
port/adapter gateway), so the app depends on our own abstraction — never on a
vendor SDK directly. Swapping a provider (e.g. MinIO → Cloudflare R2, or one SMS
/ email / payment vendor for another) is a config + one-adapter change, with
**zero** churn in feature code.

```
feature code ──▶ <Connector interface> ──▶ <Adapter: vendor A | vendor B | …>
                     (our port)                selected by env at startup
```

Location: `apps/api/src/integrations/<domain>/`.

## Storage (implemented)

- **Port:** `integrations/storage/storage.connector.ts` → `StorageConnector`
  (`put`, `getStream`, `presignedPut`, `presignedGet`, `publicBaseUrl`) bound to
  the `STORAGE_CONNECTOR` DI token.
- **Adapter:** `minio-storage.connector.ts` (MinIO / S3-compatible).
- **Module:** `storage.module.ts` (`@Global`) selects the adapter via
  `STORAGE_PROVIDER` (`minio` now; `r2` is a drop-in — R2 is S3-compatible, so
  it's the same adapter pointed at the R2 endpoint, or a dedicated
  `R2StorageConnector`).

### Cost-efficient file handling (no bytes through our server)

Shared files (chat media, documents) are **never** proxied through our backend.

1. Client asks our API for a short-lived **pre-signed PUT** URL
   (`POST /uploads/presign` → `{ uploadUrl, key }`).
2. Client uploads the bytes **directly to the object store** via `uploadUrl`.
3. Client stores the returned `key` on the resource (e.g. a chat message).
4. On read, the API returns a short-lived **pre-signed GET** URL; the client
   loads the media **directly from the store**.

This keeps egress/compute off our backend — ideal for **Cloudflare R2** (free
egress). Uploads accept images, short video/audio clips, PDFs and common docs,
25 MB cap.

> Web note: direct browser → store PUT/GET needs the store's **CORS** config
> (R2 bucket CORS, or MinIO dev CORS). Native iOS/Android have no CORS, so it
> always works on device.

## Planned connectors (same pattern)

| Domain | Port | Adapters |
|---|---|---|
| Storage | `StorageConnector` ✅ | MinIO ✅ · Cloudflare R2 (drop-in) |
| Push notifications | `NotificationConnector` ✅ | console ✅ (dev) · FCM/APNs ✅ (HTTP v1) |
| Email | `EmailConnector` ✅ | console ✅ (dev) · Resend ✅ (resend.com) |
| SMS / OTP | `SmsConnector` ✅ | console ✅ (dev) · a Saudi gateway (drop-in) |
| Payments | `PaymentConnector` ✅ | mock ✅ (dev) · Moyasar / Tap / HyperPay (drop-in) |

## Push notifications (implemented)

- **Port:** `integrations/notifications/notification.connector.ts` →
  `NotificationConnector.send(targets, {title, body, data})` behind
  `NOTIFICATION_CONNECTOR`.
- **Adapters:**
  - `ConsoleNotificationConnector` (dev — logs the push so the whole pipeline is
    testable without FCM/APNs creds).
  - `FcmNotificationConnector` (prod — **FCM HTTP v1**, which also relays to APNs
    for iOS). Dependency-free: the service-account JWT is signed with Node
    `crypto` (RS256) and exchanged for a short-lived OAuth token; messages POST
    to `…/v1/projects/{projectId}/messages:send`. No Firebase SDK, so the project
    stays portable. Invalid/unregistered tokens (404 / `UNREGISTERED`) are
    reported back and pruned.
- **Selection:** the Integration Hub `push` domain — provider `fcm` with
  `FCM_PROJECT_ID` + `FCM_SERVICE_ACCOUNT` (JSON, stored **encrypted**). A
  malformed/absent service account safely falls back to console. The hub's
  **Test** button mints a token (no notification sent) to prove the credentials.
- **Devices:** `POST /notifications/devices {token, platform}` registers a push
  token (`PushToken` model); `DELETE /notifications/devices/:token` removes it.
- **Delivery:** `NotificationsService.create` fans out to the user's device
  tokens (pruning invalid ones). New chat messages create a notification for the
  counterpart's users → in-app + push.

- **Mobile:** `PushService` (`apps/mobile/lib/core/notifications/push_service.dart`)
  initialises Firebase, registers the FCM token via `/notifications/devices`,
  and routes foreground/tapped messages; wired to auth state in `app.dart`.
  Degrades to a safe no-op on web and before the native config exists.

> **Remaining input (credentials only):** one **Firebase project** yields all of
> it — the **service-account JSON** (paste into the hub → backend sends) and the
> mobile config files (`google-services.json` / `GoogleService-Info.plist`) +
> APNs key. Both code paths are complete; dropping the files in activates push
> with no code change. See `docs/mobile/PUSH-FCM.md`.

## SMS (implemented)

- **Port:** `integrations/sms/sms.connector.ts` → `SmsConnector.send({to, body})`
  behind `SMS_CONNECTOR`.
- **Adapter:** `ConsoleSmsConnector` (dev — logs the SMS so the OTP code is
  visible without a paid gateway). Select with `SMS_PROVIDER` (`console` default;
  `unifonic` / `msegat` warn + fall back to console until the vendor adapter is
  added). `SMS_PROVIDER` cannot be `console` in production (enforced in env
  validation).
- **Consumer:** the OTP `local` provider delegates code delivery here — no
  vendor logic lives in the OTP code.

## OTP verification (implemented — Authentica)

Hub domain `otp` (`OTP_PROVIDER`). `OtpService` resolves the active provider
from the hub and branches; the 3/phone/hour send throttle is always applied.

- **`local`** (dev default): a 6-digit code generated in `OtpService`, stored in
  Redis (10 min) and delivered via the SMS connector; verified against Redis.
- **`authentica`** (`integrations/otp/authentica-otp.connector.ts`) — **Authentica**
  (authentica.sa) is a *managed* OTP provider: it generates, delivers and
  verifies the code (`POST /send-otp` then `POST /verify-otp`, base
  `https://api.authentica.sa/api/v2`, auth header `X-Authorization`, phone
  E.164). Dependency-free (`fetch`). Two modes:
  - **`live`** — real API calls. **Production always runs live** (the mode field
    is ignored in prod); `GET /balance` backs the hub Test button.
  - **`test`** — Authentica has **no sandbox**, so staging simulates at our
    layer: a **fixed, admin-editable code** (`AUTHENTICA_TEST_OTP`, default
    `123456`) is logged and accepted — no API call, no SMS, no credits spent.
- **Prod safety:** `OTP_PROVIDER` cannot be `local` in production (env
  validation); and `test` mode is never honoured in production.

> Config (hub → رموز التحقق): `AUTHENTICA_API_KEY` (secret, live only),
> `AUTHENTICA_MODE` (test|live), `AUTHENTICA_TEST_OTP`, `AUTHENTICA_CHANNEL`
> (sms|whatsapp|email), `AUTHENTICA_TEMPLATE_ID`, `AUTHENTICA_FALLBACK_EMAIL`.
> This staging build runs `authentica` in `test` mode. For production, set the
> real API key and `AUTHENTICA_MODE=live` (Authentica has no separate test key —
> ask their support if a non-prod key is needed).

## Email (implemented)

- **Port:** `integrations/email/email.connector.ts` → `EmailConnector.send({to,
  subject, html, text, …})` behind `EMAIL_CONNECTOR`.
- **Adapters:** `ConsoleEmailConnector` (dev — logs the email) and
  `ResendEmailConnector` (prod — calls the Resend REST API via built-in `fetch`,
  no new dependency). Select with `EMAIL_PROVIDER` (`console` default; `resend`
  needs `RESEND_API_KEY` + `EMAIL_FROM`, enforced in env validation).
- **Consumer:** `AuthService` sends a welcome email on registration when an
  email is provided (fire-and-forget; never blocks/fails signup). Verification
  magic-links and receipts can reuse the same connector.

## Payments (implemented)

- **Port:** `integrations/payments/payment.connector.ts` → `PaymentConnector`
  (`charge(req)` + `refund(reference, amount)`) behind `PAYMENT_CONNECTOR`.
- **Adapter:** `MockPaymentConnector` (dev — no-network, returns a deterministic
  reference so the PREPAID_GATEWAY / escrow flow runs end to end without live
  keys) + `PaymentsIntegrationModule` (`@Global`), selected by `PAYMENT_PROVIDER`
  (`mock` default; `moyasar` / `tap` warn + fall back to mock until the vendor
  adapter is added; `PAYMENT_PROVIDER` cannot be `mock` in production).
- **Consumer:** `CollectionService` injects `PAYMENT_CONNECTOR` and calls it for
  the PREPAID_GATEWAY charge and for refunds on cancellation; the escrow / COD /
  wallet settlement ledger is unchanged. The prior local `PaymentGateway`/
  `StubGateway` is removed in favour of the shared gateway.

> A real adapter (Moyasar / Tap / HyperPay) needs the provider keys and, for
> card charges, a client-side payment token — that is the only user-provided
> step; the collection flow is complete.

## Real-time (Socket.io)

Chat and tracking are real-time over the existing Socket.io gateway (JWT on the
handshake; `order:<id>` rooms). The mobile client (`socket_io_client`) subscribes
to the order and receives `chat:message` / `tracking:location_update` live — no
Firebase, our own infra. Scale across instances with the Socket.io **Redis
adapter** (Redis is already in the stack).

Each new integration adds `integrations/<domain>/<domain>.connector.ts` (port) +
one adapter + a `@Global` module selected by an env `*_PROVIDER` var, and feature
code injects the token only.

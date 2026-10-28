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
| Push notifications | `NotificationConnector` ✅ | console ✅ (dev) · FCM/APNs (drop-in) |
| Email | `EmailConnector` ✅ | console ✅ (dev) · Resend ✅ (resend.com) |
| SMS / OTP | `SmsConnector` ✅ | console ✅ (dev) · a Saudi gateway (drop-in) |
| Payments | `PaymentConnector` ✅ | mock ✅ (dev) · Moyasar / Tap / HyperPay (drop-in) |

## Push notifications (implemented)

- **Port:** `integrations/notifications/notification.connector.ts` →
  `NotificationConnector.send(targets, {title, body, data})` behind
  `NOTIFICATION_CONNECTOR`.
- **Adapter:** `ConsoleNotificationConnector` (dev — logs the push so the whole
  pipeline is testable without FCM/APNs creds). Select with `PUSH_PROVIDER`
  (`console` default; `fcm` drops in with Firebase Admin for Android + an APNs
  key for iOS).
- **Devices:** `POST /notifications/devices {token, platform}` registers a push
  token (`PushToken` model); `DELETE /notifications/devices/:token` removes it.
- **Delivery:** `NotificationsService.create` fans out to the user's device
  tokens (pruning invalid ones). New chat messages create a notification for the
  counterpart's users → in-app + push.

> The FCM/APNs adapter needs the user's Firebase project (Android) / APNs key
> (iOS) and, on mobile, `firebase_messaging` to obtain the device token — that's
> the only user-provided step; the backend pipeline is complete.

## SMS / OTP (implemented)

- **Port:** `integrations/sms/sms.connector.ts` → `SmsConnector.send({to, body})`
  behind `SMS_CONNECTOR`.
- **Adapter:** `ConsoleSmsConnector` (dev — logs the SMS so the OTP code is
  visible without a paid gateway). Select with `SMS_PROVIDER` (`console` default;
  `unifonic` / `msegat` warn + fall back to console until the vendor adapter is
  added). `SMS_PROVIDER` cannot be `console` in production (enforced in env
  validation).
- **Consumer:** `OtpService.send` now injects `SMS_CONNECTOR` and delegates
  delivery — no vendor logic lives in the OTP code.

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

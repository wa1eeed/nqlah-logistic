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

| Domain | Port | Adapters (planned) |
|---|---|---|
| Storage | `StorageConnector` ✅ | MinIO ✅ · Cloudflare R2 |
| Email | `EmailConnector` | Resend (resend.com) · … |
| SMS / OTP | `OtpConnector` / `SmsConnector` | console (dev) · a provider |
| Payments | `PaymentConnector` | a gateway (escrow/COD settlement) |

Each new integration adds `integrations/<domain>/<domain>.connector.ts` (port) +
one adapter + a `@Global` module selected by an env `*_PROVIDER` var, and feature
code injects the token only.

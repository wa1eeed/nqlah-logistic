# Feature Flags — Naqla Logistics

Server-driven feature flags let a feature be turned on or off **platform-wide
from the admin console, with no app-store update and no redeploy**. Every client
(the web dashboards and the Flutter app) already fetches the public app config at
startup, so flipping a flag reaches all of them on their next config fetch.

The flags ride on the existing **app-settings** config (the same mechanism that
serves splash / onboarding / update policy), stored in the platform key/value
`Setting` store — no schema change to add or remove a flag.

> Scope note: flags cover the **interpreted/config layer** (what the UI shows and
> which flows are enabled). Native capabilities (new plugins, permissions, SDK
> bumps) still require a store release. For true Dart code-push, Shorebird is the
> separate option; this document is only about config-driven flags.

---

## 1. The flag registry

Each flag is declared **once** in
[`apps/api/src/modules/settings/feature-flags.ts`](../apps/api/src/modules/settings/feature-flags.ts),
as a `FeatureFlagDef`:

```ts
{ key, labelAr, labelEn, descAr, descEn, default }
```

The registry is the single source of truth: it drives the admin toggle labels
and the fallback defaults on every client. Add a flag by appending an entry;
remove one by deleting its entry (stored overrides for unknown keys are ignored).

Current flags:

| key | default | effect |
| --- | --- | --- |
| `inAppChat` | `true` | In-app chat between client / carrier / driver. |
| `liveTracking` | `true` | Live driver location on the map during a trip. |
| `promoBanner` | `false` | A promotional banner on the home screen. |
| `guestBrowsing` | `true` | Browse loads & carriers before signing in. |

Two helpers resolve values:

- `resolveFlags(overrides)` — layers the admin overrides on top of each flag's
  default, producing the **effective** value for every known key.
- `sanitizeFlagOverrides(input)` — keeps only known keys with boolean values
  (drops unknown keys and non-booleans) before persisting.

---

## 2. Storage & assembly

Flags are one section of the assembled app config in
[`app-settings.service.ts`](../apps/api/src/modules/settings/app-settings.service.ts):

- Stored as a single JSON `Setting` row under the key **`app.flags`** (category
  `app`), holding only the explicit overrides, e.g. `{"promoBanner": true}`.
- `getConfig()` reads `app.flags` and returns `flags: resolveFlags(overrides)` —
  always a complete map of every registry key.
- `updateConfig(dto)` merges incoming `dto.flags` (sanitized) onto the stored
  overrides, so a partial save never clears siblings.
- `getFeatureFlags()` returns `{ defs, values }` for the admin panel.

---

## 3. API

All under the global `/api` prefix; success responses are wrapped in
`{ success, data }`.
([`settings.controller.ts`](../apps/api/src/modules/settings/settings.controller.ts))

| Method & path | Auth | Purpose |
| --- | --- | --- |
| `GET /settings/app` | Public | Full app config incl. `flags` (effective values). Clients read `flags[key]`. |
| `GET /settings/feature-flags` | Admin | The registry `defs` + current `values`, for the admin toggle panel. |
| `PUT /settings/app` | Admin | Edit any config section; `{ flags: { key: boolean } }` merges overrides. |

`flags` on `UpdateAppSettingsDto` is validated with `@IsObject()`; the service
sanitizes it against the registry, so arbitrary keys can't be written.

---

## 4. Admin console

**Settings → App Settings → Feature flags**
([`app-settings-panel.tsx`](../apps/web/admin/src/components/settings/app-settings-panel.tsx),
`FeatureFlagsCard`).

Each flag renders as a labelled row — bilingual label/description from the API
plus the flag `key` — with a toggle. Flipping a switch PUTs
`/settings/app { flags: { key } }` and re-fetches; the change takes effect for
every client on their next `GET /settings/app`.

---

## 5. Clients

### Mobile (Flutter)

[`apps/mobile/lib/core/config/feature_flags.dart`](../apps/mobile/lib/core/config/feature_flags.dart)

- `featureFlagsProvider` (a `FutureProvider`) fetches `GET /settings/app` and
  exposes a `FeatureFlags` object; built-in defaults mirror the registry so a
  value is always available (while loading or on error).
- `featureFlagProvider(key)` (`Provider.family<bool, String>`) watches one flag:
  `if (ref.watch(featureFlagProvider('inAppChat'))) { … }`.

### Web (Next.js)

[`apps/web/client/src/lib/use-feature-flag.ts`](../apps/web/client/src/lib/use-feature-flag.ts)

- `useFeatureFlags()` SWR-reads `/settings/app`, shared and cached, with the same
  built-in defaults.
- `useFeatureFlag(key, fallback?)` returns one flag's value.

The hook currently lives in the client app; copy it to the carrier/admin apps
when they need flags.

---

## 6. Worked examples

**Additive feature — `promoBanner`.** A dismissible `PromoBanner`
([mobile](../apps/mobile/lib/design_system/promo_banner.dart),
[web](../apps/web/client/src/components/promo-banner.tsx)) renders on the home /
dashboard only when the flag is on. It gates nothing existing.

**Gating feature — `inAppChat`.** When off, every chat entry point is hidden: the
offer-card chat bubble, the provider order / trip-monitor / owner-driver chat
buttons, and the driver-card chat action; the conversations inbox shows a
"chat unavailable" state. (`party_card` / `offer_card` hide their chat action
when `onChat` is null, so a gated caller cleanly drops the control.) The web has
no in-app chat, so this flag is mobile-only.

---

## 7. Adding a flag

1. Append a `FeatureFlagDef` to `FEATURE_FLAGS` in `feature-flags.ts` (key,
   bilingual label/description, default). No migration — the admin panel picks it
   up automatically.
2. Read it where it matters: mobile `ref.watch(featureFlagProvider('yourKey'))`,
   web `useFeatureFlag('yourKey')`.
3. Keep the clients' built-in default maps in sync with the registry default
   (`feature_flags.dart` and `use-feature-flag.ts`), so offline/first-paint
   behaviour matches.

A flag is boolean only. To make content editable (e.g. promo text/link) rather
than just on/off, add a dedicated config section to the app config instead of a
flag.

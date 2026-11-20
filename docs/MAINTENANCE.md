# Maintenance Mode — Naqla Logistics

A single admin switch that **closes the platform and both apps during
maintenance or migrations**, so no new data reaches the database mid-upgrade.
When it is on, the API rejects all non-admin traffic with a 503, and the web
dashboards and the Flutter app show a full-screen maintenance page. **Admins keep
full access** so they can manage the platform and turn maintenance back off.

It is built on the same app-settings config as the feature flags
([`docs/FEATURE_FLAGS.md`](FEATURE_FLAGS.md)) — stored in the key/value `Setting`
store, no schema change.

---

## 1. Config

The app-settings config gains a `maintenance` section
([`app-settings.service.ts`](../apps/api/src/modules/settings/app-settings.service.ts)):

```ts
maintenance: { enabled: boolean; messageAr: string; messageEn: string }
```

Stored as one JSON `Setting` row under **`app.maintenance`**. Public
`GET /settings/app` returns it (clients read it to render the screen); admin
`PUT /settings/app { maintenance }` toggles it (`MaintenanceDto`).

---

## 2. The guard

[`MaintenanceService`](../apps/api/src/common/maintenance/maintenance.service.ts)
reads the flag with a **10s in-memory cache** (so the per-request guard never hits
the DB on every call) and **fails open** on a read error — a DB blip can never
lock everyone out. An admin toggle invalidates the cache (via the settings
controller) so the change takes effect at once.

[`MaintenanceGuard`](../apps/api/src/common/guards/maintenance.guard.ts) is a
global `APP_GUARD`, registered **after `JwtAuthGuard`** (so `req.user.role` is
set). While maintenance is on it answers **503 `MAINTENANCE`** (Ar + En message)
to every request **except**:

- **admins** (`ADMIN` / `SUPER_ADMIN`) — full bypass, so they can manage and
  switch it off;
- an **allow-list** so clients can still detect maintenance and an admin can sign
  in: `GET /settings/{app,platform,currencies}`, `GET /health`, and
  `/admin/auth/*`.

503 body:

```json
{ "success": false, "error": {
  "code": "MAINTENANCE", "message": "…(ar)", "messageEn": "…(en)" } }
```

---

## 3. Admin console

**Settings → App Settings → Maintenance mode**
([`app-settings-panel.tsx`](../apps/web/admin/src/components/settings/app-settings-panel.tsx),
`MaintenanceCard`). An enable toggle, a bilingual (Ar/En) message editor, and a
warning that non-admin requests are rejected while on. **Enabling is confirmed
first** (a destructive dialog) since it closes the platform; saving PUTs
`/settings/app { maintenance }` and takes effect immediately.

---

## 4. Clients

### Web (client + carrier)

- [`lib/use-maintenance.ts`](../apps/web/client/src/lib/use-maintenance.ts) —
  reads the maintenance state from the public `GET /settings/app`, SWR-cached and
  re-checked every 30s + on focus, so the app leaves maintenance on its own once
  the admin turns it off. Falls back to "off" on error.
- [`components/maintenance-screen.tsx`](../apps/web/client/src/components/maintenance-screen.tsx) —
  a localized full-screen page (wrench medallion, title, the admin's message or a
  default, and a retry).
- The `(app)/layout.tsx` renders the screen when `maintenance.enabled`, before the
  shell. (Same files in the carrier app.)

### Mobile (Flutter)

- [`core/config/maintenance.dart`](../apps/mobile/lib/core/config/maintenance.dart) —
  a `StreamProvider` that **polls `GET /settings/app` every 30s** (so the app both
  enters maintenance and leaves it on its own) + a sync `maintenanceProvider`.
- [`features/maintenance/maintenance_screen.dart`](../apps/mobile/lib/features/maintenance/maintenance_screen.dart) —
  the localized screen; "Try again" re-checks immediately.
- `app.dart` — the `MaterialApp.router` `builder` overlays the screen when
  `maintenance.enabled`, over whatever route is active.

The **admin web app** has no maintenance screen (admins must keep access), and the
guard bypasses admins anyway.

---

## 5. Toggling it

- **Production / normal:** the admin panel (§3).
- **In dev**, if the admin login is rate-limited, set the row directly:

  ```sql
  INSERT INTO "Setting" (id, key, value, category, "updatedAt")
  VALUES (md5(random()::text), 'app.maintenance',
          '{"enabled": true, "messageAr": "…", "messageEn": "…"}', 'app', now())
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, "updatedAt" = now();
  -- DELETE FROM "Setting" WHERE key = 'app.maintenance';  -- turn off
  ```

Pairs with production deployment: switch maintenance on, run the migration/deploy,
switch it off.

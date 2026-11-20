# Over-the-air updates & version gating

Naqla is a young app, so we avoid forcing a store update for every release. Two
mechanisms work together:

1. **Shorebird code-push** — ship Dart/UI fixes over the air, no store review.
2. **Soft-update policy** — a server-driven version gate for the (rarer) cases
   that *do* need a store update (native code, new permissions, breaking API).

---

## 1. Soft-update policy (implemented)

The admin controls a minimum supported version from **Settings → App settings →
Update policy** (`UpdatePolicyCard`). It is stored under the `app.update` key and
served publicly on `GET /settings/app`:

```jsonc
"update": {
  "minSupportedVersion": "1.2.0", // empty = no gate
  "forceUpdate": true,            // true = block; false = dismissible prompt
  "messageAr": "…", "messageEn": "…"
}
```

The mobile client ([`core/config/app_update.dart`](../apps/mobile/lib/core/config/app_update.dart))
reads this once at startup, compares the running build (`package_info_plus`)
against `minSupportedVersion`, and resolves an `UpdateRequirement`:

| Result   | Condition                                   | UX |
| -------- | ------------------------------------------- | -- |
| `none`   | up to date, or no minimum set, or **web**   | nothing |
| `soft`   | below minimum, `forceUpdate=false`          | dismissible sheet (`showSoftUpdateSheet`), app still usable |
| `forced` | below minimum, `forceUpdate=true`           | full-screen blocking `UpdateScreen`, app-wide overlay in `app.dart` |

Notes:
- It is a **startup check**, not a poller — enforcing a new minimum on the next
  launch is the right UX; yanking an active session mid-task is not.
- **Forced** takes precedence over maintenance mode (an untrusted old client
  must update before anything else runs).
- **Web never gates** (it always serves the latest build).
- Fails open: any read error → `none`, so a bad fetch never locks the app.
- The store buttons open the listing. The Play package is real
  (`sa.nx.nqlah.nqlah_mobile`); **replace the App Store id placeholder**
  (`id0000000000`) in [`update_screen.dart`](../apps/mobile/lib/features/update/update_screen.dart)
  once the app is live on App Store Connect.

Verified end-to-end on 2026-11-20 (DB policy → API → forced screen and soft
sheet) via a dev-only web hook that was removed after testing.

---

## 2. Shorebird (code-push) — setup steps

[Shorebird](https://shorebird.dev) patches the Dart code of a released build
over the air. It covers **Dart/Flutter changes only** — not native code, new
plugins, new permissions, or asset-level engine changes. Those still need a
store release (gated by the soft-update policy above).

**One-time setup** (needs a Shorebird account; run from `apps/mobile`):

```bash
dart pub global activate shorebird_cli
shorebird login
shorebird init          # creates the app, writes shorebird.yaml + app_id, adds it to pubspec assets
```

**Per release** (replaces `flutter build` for store uploads):

```bash
shorebird release android   # and: shorebird release ios
```

**Shipping an OTA patch** to an already-released version:

```bash
shorebird patch android     # and: shorebird patch ios
```

### When to use which

| Change | Mechanism |
| ------ | --------- |
| Dart logic / UI fix / copy change | **Shorebird patch** (instant, no store) |
| New native plugin / permission / Firebase change | **Store release** + bump `minSupportedVersion` if the old build would break |
| Breaking API change the old client can't handle | **Store release** + `forceUpdate=true` |

### CI note
The TestFlight workflow (GitHub Actions + fastlane) builds with `flutter build`.
After `shorebird init`, switch the release build step to `shorebird release ios`
so every store build is patchable. Until then, Shorebird is **prepped but not
active** — `shorebird init` is the remaining manual step.

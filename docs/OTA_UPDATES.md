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

## 2. Shorebird (code-push) — **initialized**

[Shorebird](https://shorebird.dev) patches the Dart code of a released build
over the air. It covers **Dart/Flutter changes only** — not native code, new
plugins, new permissions, or asset-level engine changes. Those still need a
store release (gated by the soft-update policy above).

**Status:** `shorebird init` is **done**.
- `apps/mobile/shorebird.yaml` → `app_id: cd0ba5d3-22cf-404e-bfbf-e1f1e5d4e8ea`
  (not secret; committed per Shorebird's own guidance).
- `auto_update: true` (the default) → a released build pulls patches in the
  **background on launch, with no user action**. To gate patches behind code
  instead, add `auto_update: false` and use `package:shorebird_code_push`.
- `shorebird.yaml` is bundled as a Flutter asset; the Android `INTERNET`
  permission was added (the updater needs it).
- **Normal `flutter build` / web builds ignore all of this.** Only builds made
  with `shorebird release` embed the updater and become patchable.

### The release ↔ patch model (important)
A **patch must match a release built with `shorebird release`**, byte-for-byte —
the exact artifact you upload to the store must be the one Shorebird built (it
records its hash). So you can't `flutter build` for the store and patch it
later; the store build itself has to come from `shorebird release`.

```bash
# From apps/mobile. Use the Shorebird CLI (installed at ~/.shorebird/bin):
shorebird release android   # or ios — build the store artifact (patchable)
shorebird patch   android   # or ios — push a Dart/UI update to that release
shorebird preview           # test a release/patch locally before shipping
```

### When to use which

| Change | Mechanism |
| ------ | --------- |
| Dart logic / UI fix / copy change | **`shorebird patch`** (instant, no store, no user action) |
| New native plugin / permission / Firebase change | **Store release** + bump `minSupportedVersion` if old builds break |
| Breaking API change the old client can't handle | **Store release** + `forceUpdate=true` |

### CI integration (ready to apply — validate on a watched run)
The release workflows still build with `flutter build`, so **their artifacts are
not yet patchable**. The first `shorebird release` should be run and validated
(locally or on a watched CI run) before swapping the working pipelines, because
CI signing is unverifiable from here and there is a known runner-image signing
bug (below).

**CI auth** — generate a token and add it as a repo secret `SHOREBIRD_TOKEN`:
```bash
shorebird login:ci      # prints a token; add it as the SHOREBIRD_TOKEN Actions secret
```
Each job then installs the CLI with `shorebirdtech/setup-shorebird@v1` and reads
`SHOREBIRD_TOKEN` from the env.

**Android** (`android-release.yml`) — simplest; no signing interplay. Replace the
`flutter build appbundle …` step with:
```yaml
      - uses: shorebirdtech/setup-shorebird@v1
      - name: Build patchable AAB
        working-directory: apps/mobile
        env: { SHOREBIRD_TOKEN: ${{ secrets.SHOREBIRD_TOKEN }} }
        run: shorebird release android --artifact aab -- --build-name=${{ steps.ver.outputs.name }} --build-number=${{ github.run_number }}
```
(The AAB lands under `build/app/outputs/bundle/release/`; the upload + dashboard
steps are unchanged.)

**iOS** (`ios-testflight.yml` + `ios/fastlane/Fastfile`) — the uploaded IPA must
be the Shorebird-built one, so `shorebird release ios` replaces fastlane's
`build_app` (not an extra step before it). Shorebird's own fastlane pattern
([docs](https://docs.shorebird.dev/code-push/ci/fastlane/),
[demo Fastfile](https://github.com/shorebirdtech/fastlane_demo/blob/main/ios/fastlane/Fastfile)):
1. `fastlane add_plugin shorebird` (adds the
   [fastlane-plugin-shorebird](https://github.com/shorebirdtech/fastlane-plugin-shorebird)).
2. A new lane keeps the existing `setup_ci` → `app_store_connect_api_key` →
   `match(type: "appstore")` signing, then calls `shorebird_release(platform: "ios")`
   **instead of** `build_app`, and uploads the resulting IPA with
   `upload_to_testflight`.
3. In the workflow, install the CLI (`setup-shorebird`), drop the
   `flutter build ios --no-codesign` step, and run the new lane.

**Known caveat:** a macOS runner image regression
([actions/runner-images#13884](https://github.com/actions/runner-images/issues/13884))
broke match's `.p12` import / signing-identity lookup for this exact setup. If
the first run fails signing, pin `runs-on` to a known-good image. Reverting to
the working pipeline is one commit away (it's in git history).

**App Store id:** replace the `id0000000000` placeholder in
[`update_screen.dart`](../apps/mobile/lib/features/update/update_screen.dart)
with the real App Store numeric id once the app is live.

# Push notifications (FCM / APNs)

Status: **code-complete on both sides.** The only remaining inputs are the
Firebase/Apple credentials, which can only be generated under the project
owner's Google/Apple accounts.

## Backend (done & verified)

`NotificationConnector` → `FcmNotificationConnector` (FCM **HTTP v1**, relays to
APNs for iOS; dependency-free, signs the service-account JWT with Node `crypto`).
`PushToken` model + `POST/DELETE /notifications/devices` + fan-out with
invalid-token pruning. Provider + credentials in the Integration Hub
(`/integrations` → الإشعارات الفورية → provider `fcm`, secrets encrypted). The
Test button mints an OAuth token to validate the service account.

## Mobile (done)

- **Deps:** `firebase_core` + `firebase_messaging` in `pubspec.yaml`.
- **`core/notifications/push_service.dart`** — `PushService`: initialises
  Firebase, requests permission, gets the FCM **registration token** and
  registers it via `POST /notifications/devices`, re-registers on refresh,
  routes foreground (in-app banner + badge refresh) and tapped messages
  (role-based deep-link via GoRouter), with a top-level background handler.
  **Degrades to a safe no-op** on web and before the native config files exist.
- **Wiring:** `app.dart` binds the push lifecycle to auth state (register on
  login / unregister on logout) and installs the navigation + foreground
  callbacks; `main.dart` ensures the binding is initialised.
- **Android:** `POST_NOTIFICATIONS` permission; the `google-services` Gradle
  plugin is declared and applied **only when `google-services.json` is present**
  (`android/app/build.gradle.kts`), so the build never breaks before
  provisioning.
- **iOS:** `remote-notification` background mode + `FirebaseAppDelegateProxyEnabled`
  in `Info.plist`.

Verified: `flutter analyze` clean; `flutter build web` succeeds (guards keep
Firebase inert on web). Native builds need a real Firebase project (below).

## What the owner must provide (one Firebase project → all of it)

| Artifact | From | Goes to |
|---|---|---|
| Service account JSON | Firebase console → Project settings → Service accounts → Generate new private key | Integration Hub → `FCM_SERVICE_ACCOUNT` (+ `FCM_PROJECT_ID`) |
| `google-services.json` | Firebase → Android app (package `sa.nx.nqlah.nqlah_mobile`) | `apps/mobile/android/app/google-services.json` |
| `GoogleService-Info.plist` | Firebase → iOS app (same bundle id) | `apps/mobile/ios/Runner/GoogleService-Info.plist` (add to the Runner target in Xcode) |
| APNs auth key `.p8` | Apple Developer → Keys → create APNs key | upload to Firebase → Cloud Messaging; also enable the **Push Notifications** capability on the Runner target |

Once dropped in: Android picks up the Gradle plugin automatically; iOS reads the
plist; `PushService.start()` obtains a token on next login and registers it —
no code change. Paste the service account JSON into the hub (SUPER_ADMIN) and
press Test to confirm, then send a notification (e.g. place/accept an order) to
a signed-in device.

## Testing notes

- The hub **Test** validates the service account without a device.
- End-to-end delivery needs a **real device** (iOS Simulator has no APNs;
  Android emulator with Google Play works). Web is intentionally push-inert.

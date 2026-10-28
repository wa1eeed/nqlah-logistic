# Push notifications (FCM / APNs) — mobile wiring

The **backend** push pipeline is complete and verified: `NotificationConnector`
→ `FcmNotificationConnector` (FCM HTTP v1, relays to APNs for iOS), the
`PushToken` model, `POST/DELETE /notifications/devices`, and fan-out with
invalid-token pruning. Provider + credentials live in the Integration Hub
(`/integrations` → الإشعارات الفورية → provider `fcm`).

The **mobile** side is the only remaining step and it needs a real **Firebase
project** (no code blocker otherwise). One project produces *both* artifacts:

| Artifact | Where it goes | Used by |
|---|---|---|
| Service account JSON (Project settings → Service accounts → Generate key) | Integration Hub → `FCM_SERVICE_ACCOUNT` (+ `FCM_PROJECT_ID`) | backend send |
| `google-services.json` (Android app) | `apps/mobile/android/app/` | Android client |
| `GoogleService-Info.plist` (iOS app) | `apps/mobile/ios/Runner/` | iOS client |
| APNs auth key `.p8` (Apple Developer) uploaded to Firebase → Cloud Messaging | Firebase console only | iOS delivery |

## Wiring to apply once the artifacts exist

1. **pubspec:** add `firebase_core` + `firebase_messaging`.
2. **Android:** apply the `com.google.gms.google-services` Gradle plugin; place
   `google-services.json`. (The plugin *fails the build* if the file is absent —
   that is why this is not scaffolded ahead of time.)
3. **iOS:** add `GoogleService-Info.plist` to the Runner target; enable the Push
   Notifications + Background Modes (remote notifications) capabilities.
4. **Init + register:** `Firebase.initializeApp()` at startup; after login,
   request permission, get the token
   (`FirebaseMessaging.instance.getToken()`), and
   `POST /notifications/devices { token, platform }` via `FinanceRepository`'s
   sibling repo (add a tiny `DevicesRepository`). Re-register on
   `onTokenRefresh`; `DELETE` on logout.
5. **Handlers:** foreground (`onMessage` → in-app banner + refresh the
   notifications badge), background/opened (`onMessageOpenedApp` → deep-link via
   GoRouter using the payload `data`), and a top-level
   `onBackgroundMessage` isolate handler.

Payload shape the backend sends: `notification{title,body}` +
`data{...}` (all string values) — route on `data.type` / `data.orderId`.

## Testing without devices

The Integration Hub **Test** button mints an OAuth token from the service
account (no notification sent) and reports ok/down — enough to confirm the
credentials before any device exists. End-to-end delivery needs a real device
token registered via `/notifications/devices`.

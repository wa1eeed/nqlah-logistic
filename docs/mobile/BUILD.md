# NQLAH Mobile — Build Guide & Progress

The Flutter implementation of the unified NQLAH app, built from the Claude Design
handoff in [`design/`](design/). This doc is kept **up to date as the app is
built** — structure, decisions, and per-phase status.

## Stack
- **Flutter** 3.47.8 / Dart 3.13.7 · **Riverpod** (state) · **GoRouter** (routing)
- **google_fonts** (Tajawal + Inter) · **flutter_svg** (Phosphor icons as SVG)
- **dio** (REST client) · **flutter_secure_storage** (token storage)
- Arabic-first, **RTL / `ar-SA`** by default · light + dark from design tokens.

## Backend integration (`core/api/`, `core/auth/`)
The app talks to the NestJS API (`/api` prefix). Base URL defaults to staging
(`https://nqlah.nx.sa/api`) and is overridable per run:
```
flutter run --dart-define=NQ_API_BASE=http://127.0.0.1:4000/api
```
- **`core/api/api_config.dart`** — base URL + timeouts (`--dart-define=NQ_API_BASE`).
- **`core/api/token_store.dart`** — access/refresh tokens in secure storage.
- **`core/api/api_client.dart`** — the single Dio instance: Bearer interceptor +
  transparent `401` → `/auth/refresh` → replay. Notifies the auth layer on
  refresh failure via `SessionExpirySink`.
- **`core/api/api_exception.dart`** — flattens NestJS errors (`{code,message,details}`
  or `{statusCode,message}`) into one Arabic-ready message.
- **`core/auth/auth_models.dart`** — `AuthUser` (+ role→`NqIdentity` map:
  `CLIENT_*`→customer, `CARRIER_*`→provider, `DRIVER`→employed driver), `AuthSession`.
- **`core/auth/auth_repository.dart`** — `POST /auth/login`, `POST /auth/register`,
  `POST /auth/send-otp`, `POST /auth/verify-phone`, `GET /users/me`, `POST /auth/logout`.
- **`core/auth/auth_controller.dart`** — `NotifierProvider<AuthController,AuthState>`:
  bootstraps from a stored token on launch, `login()`, `logout()`.
- **`core/auth/registration_controller.dart`** — `RegistrationData` draft +
  `NotifierProvider` accumulated across the wizard; `submit()` → `POST /auth/register`.
- **`core/router.dart`** — now `routerProvider`; redirect gate: no session → auth
  pages, session → shell. Shell identity comes from the signed-in user's role.
- **Login** (`features/auth/login_screen.dart`) is wired to the live API (loading +
  Arabic error states). Customer **account → sign-out** calls `logout()`.
- **Registration wizard** wired to the API. Flow (providers 5 steps, customers 4):
  **بيانات الدخول** (new `register_credentials_screen` — name/phone/email/password/
  company + consent; the fields the design omits but the API requires) → **نوع الحساب**
  (1l, real CR/VAT/type/entity/region+city) → **الباقة** (1m, providers only) →
  **المستندات** (5e; "إرسال للمراجعة" → `POST /auth/register`, which also sends the
  OTP) → **OTP** (`register_otp_screen` → `/auth/verify-phone`, resend via
  `/auth/send-otp`) → **قيد المراجعة** (5f; "تصفّح الأحمال" signs in with the new
  credentials → shell).
- **OTP** is now **6 digits** (the API issues 6-digit codes; the design showed 4) with
  a live resend countdown and paste support. `OtpScreen` is reusable (async
  `onVerify`/`onResend`).
- **Note:** on **web** the staging API blocks the browser origin via CORS, so live
  login/register can only be exercised on a device/emulator (or against a dev API with
  CORS open). The request/response plumbing is otherwise verified end-to-end.
- **Follow-ups:** login-by-OTP (`/otp`) is UI-only — no token-issuing OTP-login endpoint
  exists yet; document **upload** on 5e is a separate backend track (the step currently
  submits account data only); plan selection (1m) doesn't yet map to a real `planId`
  (registers on the default plan).

## Project layout (`apps/mobile/`)
```
lib/
  main.dart                 ProviderScope → NqApp
  app.dart                  MaterialApp.router (RTL, ar-SA, light/dark)
  core/
    router.dart             GoRouter routes
    session/identity.dart   NqIdentity + per-role bottom-tab sets
    theme/tokens.dart       NqColors (ThemeExtension) + spacing/radii/motion
    theme/typography.dart   NqType (Tajawal/Inter scale)
    theme/app_theme.dart    light/dark ThemeData
    widgets/nq_icon.dart    NqIcon + NqIcons (Phosphor SVG names)
    widgets/ltr.dart        LTR-isolated numbers/codes
  design_system/            NqButton, NqTextField, NqStatusChip, NqSegmented,
                            NqChip, NqToggle, NqTabBar, NqHeroPanel, NqLogoMark,
                            form_fields, pressable
  features/
    auth/                   login, otp, register wizard
    shell/app_shell.dart    policy-driven shell + bottom nav
    gallery/                design-system gallery (dev reference)
assets/
  icons/{regular,fill}/     102 Phosphor SVGs (fill="currentColor")
  logo/                     placeholder logo SVGs
```

## Key decisions
- **Icons = Phosphor SVGs, not `phosphor_flutter`.** That package extends
  `IconData`, which is `final` in Flutter 3.47, so it won't compile. We bundle the
  Phosphor SVGs and render with `flutter_svg` (`NqIcon`). Add a new icon by
  dropping its SVG in `assets/icons/{regular,fill}/` and a name in `NqIcons`.
- **Never hard-code hex** in screens — read `context.nq.<role>`; the only fixed
  colors are `NqFixed` (on-hero / call screens).
- **Numbers/codes/prices/plates** always `Ltr(...)` + Inter.
- Verified in the browser via `flutter run -d web-server --web-port=8090`; iOS
  simulator pending full Xcode on the dev machine.
- **Follow-up:** `google_fonts` fetches Tajawal/Inter at runtime (first load can
  show tofu until fetched). Bundle the font files in `assets/` + pubspec for
  reliable offline rendering before release.

## Phase status
| Phase | Scope | Status |
|---|---|---|
| 0 | Design system (tokens, theme, components, icons, gallery) | ✅ merged (#101) |
| 1 | Shell + auth: login (2c), OTP (5d), register (1l/1m/5e/5f), per-role nav (2a) | ✅ merged (#102, #103) |
| 2 | Customer: home (1a), create-order wizard (1b/4a–4e), shipments (4g), offers (4f), order detail (1c), tracking (1d), trucks (6a/6b), finance (4h), notifications (5b), account (5c) | ✅ complete — all customer screens built & verified; full shell nav works |
| 3 | Provider: home (2d), loads (1f/1g), order view (3a), assignment (1h), assignments (3c), trip monitor (3d), fleet (3e/3f), maintenance (3g), finance (3h), owner-driver (1i/2e), availability (7a/7b/7c) | 🚧 home (2d) + loads (1f) + order view (3a) + assignment (1h) + assignments (3c) + fleet-drivers (3e) + maintenance (3g) + finance (3h) + owner-driver (1i/2e) + trip monitor (3d) done; fleet-trucks + add-driver (3f), availability publishing (7a/7b/7c) next |
| 4 | Employed driver: my trips (5a), trip execution (1j), ePOD (1k) | ✅ complete — driver flow built & verified (trips → acknowledge → execution → arrive → ePOD) |
| 5 | Communication: chat (1n), voice/video call (1o), incoming call (5g) | ✅ core UI done & verified; provider internal-note chat variant (3b) remaining. **UI only — needs a new realtime backend (WebRTC/signaling/TURN).** |

## Design updates applied
- **Addendum 01** ([`design/HANDOFF-ADDENDUM-01.md`](design/HANDOFF-ADDENDUM-01.md)) —
  reverse marketplace (truck availability / backhaul) + customer nav change.
  - ✅ Applied: customer tab bar is now **الرئيسية · الشاحنات · شحناتي · العروض · حسابي**
    (Finance moved to a wallet button in the home header; Trucks tab added).
  - ⏳ Pending (Phases 2–3): screens 6a/6b (available trucks) & 7a/7b/7c (load
    detail, bid sheet, publish availability); home wallet button; finance (4h)
    pushed; loads «طلب مباشر» chip; fleet «التوفّر» segment; new status chip
    «بانتظار رد المزوّد»; `TruckAvailability` data model + server rules (§2, §8).

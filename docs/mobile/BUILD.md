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
- **Response envelope (critical):** the API wraps every success as
  `{success:true, data:<payload>}` and every error as `{success:false, error:{code,message}}`.
  The Dio client unwraps the success envelope in its response interceptor (so repositories
  see the bare payload), `_tryRefresh` unwraps it too, and `ApiException` reads
  `error.{code,message}`. Found by running the app against a **local** API (staging was
  CORS-blocked on web, so no real response body was ever parsed before).
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
- **Orders** (`core/orders/`): `order_models.dart` (`OrderSummary` + `OrderStatus`→
  `NqStatus` map, cargo/truck Arabic labels, `ShipmentBucket`), `orders_repository.dart`
  (`GET /orders`, `GET /orders/:id`, `GET /orders/:id/tracking`, `POST /orders`,
  `POST /orders/:id/publish`) + providers (`myShipmentsProvider`,
  `orderDetailProvider`/`orderDetailModelProvider`). **Customer shipments (4g)** is wired
  to `GET /orders?mine=true`: segments (active/drafts/completed from `OrderStatus`) with
  live counts, search, pull-to-refresh, and loading/empty/error+retry states.
- **Order detail (1c)** + **tracking (1d)** are wired to `GET /orders/:id`
  (`OrderDetail`/`CarrierParty`/`TrackingEventModel` via `orderDetailModelProvider`).
  Routes are now `/order-detail/:id` and `/tracking/:id`. Detail shows the status chip,
  the carrier party card (contact revealed when assigned, or a "بانتظار العروض / N عروض"
  state before assignment), a real origin→destination timeline (states from status +
  actual pickup/delivery timestamps), a cargo card, and a price breakdown (real
  `carrierAmount`/`serviceVatAmount`/`clientTotalDue`, else the estimated budget).
  Tracking keeps the **map as a styled placeholder** (no maps SDK yet) but drives the
  freshness pill, ETA, status line, progress and carrier row from the order + its
  tracking events. Home's demo waybill card is non-navigating until Home (1a) is wired.
- **Note:** on **web** the staging API blocks the browser origin via CORS, so live
  login/register/orders can only be exercised on a device/emulator (or against a dev API
  with CORS open). The request/response plumbing is otherwise verified end-to-end
  (the order list GET fires to the correct endpoint; states render).
- **Create-order wizard (1b/4a–4e)** is wired for the **single-order** path via an
  `OrderDraft` (`order_draft_controller.dart`) accumulated across the 6 steps →
  `POST /orders` + `POST /orders/:id/publish`, then routes to the new order's detail.
  Added the inputs the design omits: cargo type/description/weight + truck type (step 1),
  origin/destination **city pickers + address** (step 2), real upcoming-day selection +
  pickup window (step 3), fixed/tender + visibility + payment + budget (step 4), consignee
  name/phone + notes → delivery stop (step 5), real review summary + validation (step 6).
  Per the chosen approach, **consolidated/multi-leg**, document upload, map-based route
  editing, and a `DIRECT` carrier picker stay visual/next-slice. City→region via a lookup
  (`regionForCity`).
- **Offers (4f)** is wired to the bids module. `BidModel` + `orderBidsProvider` (`GET
  /orders/:id/bids`) + `offersFocusOrderProvider` (the most recent PUBLISHED/BIDDING order
  with bids — the tab has no order id). Shows that order's pending offers as `NqOfferCard`s
  (cheapest = "أفضل قيمة"), sort by price/pickup, and **accept** (`POST …/bids/:id/accept`,
  with a confirm + loading) → invalidates + routes to the order detail. `NqOfferCard` now
  takes optional `rating`/`trips` (the API carries neither on the carrier) + a `loading`
  flag; empty/loading/error+retry states included.
- **Home (1a)** is wired to the signed-in user + `GET /orders?mine=true`: the greeting +
  avatar from the user, KPI strip (active / awaiting-offers / needs-action counts), the
  featured active-shipment `NqWaybillCard` (most in-progress active order → its detail), and
  the offers alert (shown only when offers exist → switches to the offers tab). Graceful
  fallbacks: empty active card, hidden alert, "حسابي" name fallback. The shell wires
  tab-switch callbacks (`onViewShipments`/`onOffers`) + `onOpenOrder`. **This completes the
  customer surface's backend wiring.**
### Provider path
- **Provider loads / marketplace (1f)** is wired to `GET /orders` (carrier marketplace:
  `mine=false` → OPEN PUBLISHED/BIDDING + DIRECT-to-me + my assigned), via
  `marketplaceLoadsProvider`. Shows biddable loads as `NqLoadCard`s with search, refresh,
  loading/empty/error states. **Bidding:** fixed-price loads (`priceMode==FIXED`) → "قبول"
  (confirm → `POST …/bids` with the locked price); tender loads → a bid-amount bottom sheet
  (+ optional note) → `POST …/bids`. "Already bid" is reflected per card (my bid amount) via
  the list's lean `bids` subset matched against the user's `companyId`. `OrderSummary` gained
  `priceMode`/`collectionMethod`/`clientName`/`createdAt`/`bids` (+`BidRef`, `myBid()`,
  `isFixedPrice`). Providers `marketplaceLoadsProvider` + `providerWorkProvider` (mine=true).

- **Provider assignments (3c)** is wired to `providerWorkProvider` (carrier `mine=true`):
  the carrier's active orders (ASSIGNED/CONFIRMED/IN_TRANSIT/DELIVERED), filter chips with
  live counts (all / awaiting-assignment / assigned / in-transit), status-driven cards
  (ASSIGNED → "إسناد سائق" → driver-assignment; else "فتح الطلب" → order detail), with
  search-free list, pull-to-refresh, loading/empty/error. The shell passes
  `onAssign(id)`/`onOpen(id)`.
- **Provider home (2d)** is wired to the signed-in user + `providerWorkProvider` +
  `marketplaceLoadsProvider`: hero name/avatar, 3 KPIs (awaiting-assignment / in-transit /
  new-loads counts), the "بانتظار إسناد سائق" card (ASSIGNED orders → "إسناد" / open), and
  two tiles (new loads → loads tab, finance → finance tab). Fleet counts, receivables
  numbers, the late-order alert and client-messages row were dropped (they need the fleet /
  payments / tracking / comms modules) rather than faked. The shell passes
  `onLoads`/`onFinance` (tab switch) + `onAssign(id)`/`onOpenOrder(id)`.
- **Driver assignment (1h)** is wired. New `core/fleet/fleet_repository.dart` (`DriverModel`
  + `availableDriversProvider` → `GET /fleet/drivers/available`) and
  `OrdersRepository.assignDriver(orderId, driverId)` → `POST /orders/:id/assign-driver`.
  `DriverAssignmentScreen` takes an `orderId` (route `/driver-assignment/:id`): a context bar
  from the order detail, searchable available-driver list (single-select, rating/trips), and
  "تأكيد إسناد <name>" → assign → invalidate work + pop. Loading/empty/error. The home &
  assignments "إسناد" buttons now pass the order id.
- **Provider order view (3a)** is wired to `GET /orders/:id` (route `/provider-order/:id`):
  the customer party card (revealed post-acceptance), the assigned-driver card (internal;
  from `orderDrivers`, or an "إسناد سائق" CTA when none), the route timeline, a cargo card, and
  footer actions (track → `/tracking/:id`, chat → `/chat`). `OrderDetail` gained `client`,
  `driverName`, `driverPhone`. Provider home/assignments "open" now routes here.
- **Provider fleet (3e/3f)** is wired to `GET /fleet/trucks` + `GET /fleet/drivers`
  (`TruckModel` + `fleetTrucksProvider`/`fleetDriversProvider`): trucks/drivers segments with
  live counts, status pills (driver AVAILABLE/ON_TRIP/OFF_DUTY; truck AVAILABLE/ON_TRIP/
  MAINTENANCE/OUT_OF_SERVICE), search, pull-to-refresh, loading/empty/error. Add-driver stays
  a visual CTA (the invite form 3f is a follow-up).
- **Provider finance (3h)** is wired to `GET /invoices` (`core/finance/finance_repository.dart`
  → `InvoiceModel` + `invoicesProvider`): hero total receivables + due-count + paid-this-month,
  due/paid segments, invoice cards with status pills (PAID/OVERDUE/ISSUED/DRAFT/CANCELLED),
  pull-to-refresh, loading/empty/error. Reusable for customer finance (4h).
- **Customer finance (4h)** is wired to `GET /invoices` (reuses `invoicesProvider`): hero
  «المستحق عليك» total + due/paid segments + payable cards (provider, amount, due date,
  invoice no.), direct-pay info note, pull-to-refresh, loading/empty/error.
- **Employed-driver trips (5a)** is wired to `GET /driver/jobs` + `GET /driver/me`
  (`core/driver/driver_repository.dart`): header (name/status), جديدة/قادمة/مكتملة segments
  with counts (ASSIGNED / CONFIRMED+IN_TRANSIT / DELIVERED+COMPLETED), new-assignment card
  («استلام التكليف») + trip cards → trip execution, pull-to-refresh, loading/empty/error.
  Execution-only (no price/customer identity surfaced).
- **No backend (deferred):** maintenance (3g — no module), in-app chat/calls (comms — needs
  realtime), a real maps SDK for tracking.
- **Trip execution (1j) + ePOD (1k)** are wired to `POST /orders/:id/tracking` (routes
  `/trip-execution/:id`, `/epod/:id`): execution shows the real order/next-stop and advances
  it — «تأكيد التحميل» posts `PICKED_UP` (→ IN_TRANSIT), then «تأكيد الوصول» → ePOD; ePOD
  «تأكيد التسليم» posts `DELIVERED` (→ DELIVERED) + note, invalidates driver jobs, pops. Photo
  upload, signature capture and the recipient OTP are the design's capture steps (need the
  uploads module + a POD-verify endpoint) and stay visual.
- **Add employed driver (3f)** is wired (`provider_add_driver_screen.dart`, route
  `/add-driver`, from the fleet add button) → `POST /fleet/drivers/invite` (full name, phone,
  national id, license number + expiry date-picker, read-only permissions card); invalidates
  the driver roster on success.
- **Order actions (customer)** are wired on the order detail's ⋮ menu: **cancel** (`POST
  /orders/:id/cancel` with a reason, for any non-terminal status) and **complete** (`POST
  /orders/:id/complete`, when DELIVERED → «تأكيد الاستلام»); both invalidate the detail + shipments.
- **Orders follow-ups (next slices):** owner-driver (1i/2e) incl. self-assignment; provider
  deliver/confirm actions; report-payment (payments module); trip monitor (3d); consolidated
  multi-leg; **truck-availability marketplace (6a/6b/7a-c) — needs a new backend module.**
- **New feature needing a backend module — truck availability marketplace (6a/6b/7a-c):** there
  is no `TruckAvailability` model or public trucks endpoint. Recommended model: a truck is
  auto-excluded from the customer marketplace when busy (active order / `ON_TRIP` / `MAINTENANCE`),
  and otherwise shown only when the provider has **published** an availability record (truck +
  city + window + active flag) — so an idle truck is private until published, and the provider can
  unpublish without changing the truck's status. Build as: Prisma `TruckAvailability` + a public
  `GET /marketplace/trucks` (status-filtered) + provider publish/unpublish endpoints, then wire
  customer Trucks (6a/6b) + provider availability (7a/7b/7c).
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
| 3 | Provider: home (2d), loads (1f/1g), order view (3a), assignment (1h), assignments (3c), trip monitor (3d), fleet (3e/3f), maintenance (3g), finance (3h), owner-driver (1i/2e), availability (7a/7b/7c) | 🚧 home (2d) + loads (1f) + order view (3a) + assignment (1h) + assignments (3c) + fleet (3e/3f) + maintenance (3g) + finance (3h) + owner-driver (1i/2e) + trip monitor (3d) + availability publishing (7a) done; load-detail bid sheet (7b/7c) next |
| 4 | Employed driver: my trips (5a), trip execution (1j), ePOD (1k) | ✅ complete — driver flow built & verified (trips → acknowledge → execution → arrive → ePOD) |
| 5 | Communication: chat (1n), voice/video call (1o), incoming call (5g) | ✅ core UI done & verified; provider internal-note chat variant (3b) remaining. **UI only — needs a new realtime backend (WebRTC/signaling/TURN).** |

## Design updates applied
- **Addendum 01** ([`design/HANDOFF-ADDENDUM-01.md`](design/HANDOFF-ADDENDUM-01.md)) —
  reverse marketplace (truck availability / backhaul) + customer nav change.
  - ✅ Applied: customer tab bar is now **الرئيسية · الشاحنات · شحناتي · العروض · حسابي**
    (Finance moved to a wallet button in the home header; Trucks tab added).
  - ✅ Truck-availability marketplace (6a/6b + 7a) — **live end-to-end**:
    - Backend `marketplace` module (#135): `TruckAvailability` model + migration;
      `GET /marketplace/trucks` (customer), `POST`/`DELETE /fleet/trucks/:id/availability`
      (publish/unpublish), `GET /fleet/availability` (provider's own).
    - Visibility rules (§8): a busy truck (assigned/confirmed/in-transit, or
      status ≠ AVAILABLE) is **always hidden** even if published; idle+published
      shows; idle+unpublished hides; unpublish never changes the truck's status.
    - Mobile: `core/marketplace` repo + providers; customer **Trucks** tab (6a)
      and **truck detail** (6b) wired to live data (#137); «اطلب من هذا المزوّد»
      pre-fills a **DIRECT** order pinned to the provider (`targetCarrierId`);
      provider publishes from the **Fleet** screen via a bottom sheet (7a, #138).
  - ✅ Direct-request loop (#140–#141): provider sees DIRECT-to-me loads with a
    «طلب مباشر لك» banner + «رفض الطلب» (`POST /orders/:id/decline-direct`);
    customer sees «بانتظار رد المزوّد» while the pinned provider hasn't responded.
    **Backend fix (#140):** `GET /orders?mine=false` had silently returned the
    carrier's own work (the `enableImplicitConversion` ValidationPipe coerced the
    string "false" to truthy `true`), so the provider marketplace never worked;
    the controller now reads `mine` as a raw string.
  - ⏳ Pending: load-detail + bid sheet (7b/7c); home wallet button.

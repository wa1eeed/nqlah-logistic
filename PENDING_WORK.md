# Pending Work — حالة الربط الحالية

## 🔴 Owner-requested backlog (2026-10-26) — admin policy UX + heterogeneous orders + modules

Tracked verbatim so nothing is dropped. Work top-to-bottom; one PR per coherent item.

1. **Dedicated Policy & Groups page** — isolate policy/group management out of the
   general Settings tab into its own clear, professional admin page (its own sidebar
   entry). Elegant, configurable, visually + logically well-organized.
2. **Fix 500 on carrier-group create** — API verified fine (201); root cause was the
   `/companies?type=…&limit=200(+status)` → 400 (limit>100 / unsupported `status`),
   now fetched as `/companies?type=…&limit=100`. (fix PR) Re-verify on staging after
   redeploy; the dedicated page (item 1) rebuilds this surface cleanly.
3. ✅ **Collection module configured by the ADMIN, not the client** — the admin sets a
   group's `defaultCollectionMethod` and can `enforceCollectionMethod` so the client's
   choice is ignored and the admin's method is forced on every order; otherwise the
   client picks within the allowed methods. (`resolveMethod` + tests, v0.9.66.)
4. **Provider groups + visibility scope — make it discoverable** — a clear place in the
   admin to control it (part of item 1), not buried.
5. ✅ **Elegant groups UX** — each client group renders as four colour-coded, icon-led
   module cards (الإسناد / التسعير / التحصيل / نطاق الظهور) with an at-a-glance chip
   summary (lock on an enforced collection method), toggles and a per-module default
   selector. (v0.9.66.)
6. **Group reflected on the provider** — a provider's detail page shows the group it
   belongs to; the providers list shows a **group-name tag** per provider.
7. ✅ **360° admin detail pages (provider AND client)** — the detail page gathers
   overview KPIs, all orders + statuses, fleet (trucks/drivers), financials, the
   account statement, the **Activity & Audit Log timeline**, profile/KYC, and team —
   everything in one place. Activity tab + `GET /admin/companies/:id/audit` added in
   v0.9.65 (PR for `feat/company-360-activity`). Verified live.
8. ✅ **C1 — heterogeneous consolidated orders** (phase 1) — each leg now has its own
   **truck type + destination + price** (new `OrderLeg` model + `legs[]` on create;
   `GET /orders/:id/legs` returns the spec + a `heterogeneous` flag; order total = sum
   of leg prices). Client wizard gained a per-leg editor; client/admin/carrier views
   show each leg's spec + a per-leg invoice; distribute enforces the leg's truck type.
   (v0.9.68.) **Phase 2 (open):** per-leg *different carriers* / per-leg bidding — the
   architectural fork that depends on the leg-level-assignment product decision.
9. ✅ **C2 — complete the modules** — **per-group module defaults** done: the admin sets
   a group's default assignment (MARKET|DIRECT), pricing (MARKET|FIXED) and collection
   method (+ enforcement), beyond the existing allow/deny toggles. Assignment + collection
   defaults are wired into order creation; pricing default is stored/surfaced. (v0.9.66.)

Standard for all: professional, best-practice, scalable; English deep-docs polish at the end.
**ID principle (owner note):** never surface raw cuids (`cmvo…`) in the UI — show a short,
professionally generated public code. Done for companies (`Company.code` → `NQ-XXXXXX`);
apply the same to any other entity whose reference is shown (drivers, etc.).
Also found (lower priority): admin **login page i18n** is broken (`auth.login.*` missing).

---

> آخر تحديث: 2026-10-26 (قائمة طلبات المالك: تنظيم سياسات الأدمن + الطلبات غير المتجانسة + الموديولز)
>
> الهدف من هذا الملف: نقطة استئناف واضحة. يلخّص ما تبقّى من الربط/الإصلاحات قبل
> أن نعتبر النظام جاهزاً لـ release v1.0.
>
> **ملاحظة تصميم (v0.9.16):** إعادة التصميم لنظام "Mint" الفاتح مكتملة عبر الصفحة
> التسويقية (الرئيسية + الداخلية) وكل اللوحات الثلاث. هذه نقاط ربط/بيانات، لا تصميم.

---

## 🧭 Modular platform program (started 2026-10-25)

Naqla is a logistics-market **operating system**: the admin configures the
workflow (sourcing, pricing, collection, visibility) per client or per group,
and the same primitives serve platform clients, carriers/providers, their
drivers, and later provider-owned clients and white-label. The policy backbone
already exists (`PolicyGroup` + `PoliciesService.effectiveForCompany`) **but is
not yet enforced** — the program completes, enforces, and extends it rather than
rebuilding the current order/assignment/escrow flow.

**Architecture:** a policy engine resolves the effective config per company (via
its group, admin-overridable) and selects a strategy from four module families,
with today's behavior as the first registered strategies (no behavior change):

| Family | Today → added |
| --- | --- |
| Sourcing/Assignment | MARKET (bids) · DIRECT (forced carrier) → provider-visibility scope, provider groups |
| Pricing | market bids · fixed upfront |
| Collection | escrow hold/release → + COD · prepaid-wallet · prepaid-gateway · partial |
| Visibility/Tenancy | platform client → + provider-owned client (sub-tenant) |

**Roadmap (PR per phase, in order; merged on the owner's command):**
1. ✅ Multi-stop route foundation — `OrderStop`/`StopType` (PR #47, pending merge).
2. ✅ **Money as exact Decimal** — foundation (this PR); see `docs/adr/0001-money-as-decimal.md`.
3. ✅ Policy engine **enforcement** — `effectiveForCompany` wired into order create + publish (sourcing + pricing gates, forced carrier); permissive defaults = today's behavior. First Jest unit tests. (This PR.)
4. ✅ **Collection modules** — ESCROW · prepaid-wallet · prepaid-gateway (abstracted, stubbed provider) · COD, selected by policy, over the existing escrow; unified settlement on completion/release; prepaid auto-refund on cancel. (This PR.) **PARTIAL (deposit + COD remainder) deferred to a follow-up** — its split settlement needs its own PR.
5. ✅ Provider groups (`CarrierGroup`) + client→provider **visibility scope** (ALL/GROUP/CARRIER), enforced in market listing, bidding, and direct-target selection; permissive default. (This PR.)
6. 🟡 Dashboards (in progress):
   - 6a ✅ **Admin control** — provider-visibility scope in the client-policies panel + a carrier-groups panel (`/settings` policies tab). (This PR.)
   - 6b ✅ Client — **collection-method selector** (Escrow/Wallet/Gateway/COD, policy-gated) + multi-stop **route builder** (optional intermediate stops → `stops[]`). (PR #53.)
   - 6c ✅ Carrier (+admin) — route **stop execution** panel (per-stop status, advance arrived→completed) + COD collect. (PR #54.)
   - Note: the admin settings policy panels are Arabic-hardcoded (missed in the i18n pass) — needs an i18n follow-up.
7. ✅ Provider-owned clients (sub-tenancy) — `Company.ownerCarrierId`; carrier "My Clients" page (create/list); owned clients forced private to their owner (off-market, owner-only). (PR #55.)
8. ⏳ Individual-driver portal + unified driver app (consumes stop execution).
9. 🟡 White-label — branding **foundation** done: `Company.whiteLabelEnabled` + brand fields; admin enable toggle; carrier Settings → Branding tab. (PR #56.) Remaining: apply the brand to the provider-owned-client experience + the (future) driver app.
8. ✅ Driver portal — **API backbone done** (`/driver/me`, `/driver/jobs` with stops, `/driver/location`; stop execution via the shared stops endpoint) (PR #57), and the **web portal UI done**: new `apps/web/driver` (`@naqla/driver-web`, dev port 3006) with sign-in, jobs list, and job detail (ordered stops + advance arrived→completed + report location). Mobile-first, bilingual ar/en, Mint theme. Remaining: enabling fully **independent (no-carrier) drivers** — a follow-up that needs a model change (`DriverProfile` currently requires a `companyId`; an independent driver has no carrier, so it must become nullable with the dependent query paths and guards adjusted).
10. ⏳ Unified **driver app** (mobile) — the FINAL step (the Expo app scaffold lives at `apps/driver` / `@naqla/driver`; consumes the same `/driver` API as the web portal).

Tests and an extracted order state-machine are woven into the phases that touch
transitions (from phase 3), not deferred to a single pass. Payment gateway: a
clean interface + wallet/COD concrete now; a real provider (Moyasar/Tap/HyperPay)
integrated once chosen.

---

## 🏁 Project status (v0.9.29)

- **All demo/UX features are built AND wired to the real NestJS + Prisma API**,
  each live-verified against a local backend (`docs/LOCAL_BACKEND.md`). The old
  localStorage/mock-only caveat for these features is resolved; every feature
  keeps a mock fallback so the frontends still run without the backend.
- **Backend wiring — complete (6 stages, v0.9.23–v0.9.28):** fleet ownership →
  fleet assignment → freelancer invoices → consolidated legs + rollup → client
  policies → realtime WebSocket tracking. Plus the client/admin consolidated
  read-only breakdown (v0.9.29).
- **UI/UX polish pass done (v0.9.x):** copy cleanup (no tanwīn) on the new
  surfaces, profitability load/overflow fixes, admin panel loading/empty states,
  a forced-carrier name-resolution fix; desktop layouts verified (sidebars,
  multi-column grids, no overflow).
- **Not yet done (deliberate / future):** the external integrations below (SMS /
  email / payment gateway), the remaining static pages below, and a production
  deploy of the backend (local dev only so far).

---

## Recent demo / UX work (v0.9.17–v0.9.29, 2026-10-24) — status

> Written in English per `docs/DOCUMENTATION.md`. These features were built on
> `mock-data` + client stores and are now **wired to the real API** (see the
> backend-wiring tracker below), with a mock fallback kept for offline/design
> runs. Full details live in `CHANGELOG.md` and the `docs/` references
> (`docs/README.md` indexes them).

**Done (merged to `main`):**
- **Saudi plate + Fleet management** (v0.9.17) — `SaudiLicensePlate`;
  truck↔driver linking, status sync, audit log, ID codes, trips timeline,
  tabbed detail pages, confirmations. → `docs/FLEET.md`
- **Order types: single & consolidated** (v0.9.18) — truck-count, per-leg
  carrier distribution, consolidated invoice; read-only breakdown for all
  parties. → `docs/ORDERS.md`
- **Order pricing** (v0.9.20) — fixed-price mode + payment method (prepaid/COD)
  in the order form. → `docs/ORDERS.md`
- **Live tracking** (v0.9.19) — real OSRM road routes, mock realtime
  (WebSocket-style) channel, events timeline. → `docs/TRACKING.md`
- **Admin per-client/group policy** (v0.9.21) — customization groups gating
  distribution/pricing/payment; client form respects the policy.
  → `docs/POLICIES.md`
- **Provider dispatcher / freelancers** (v0.9.22) — owned vs freelancer fleet
  (`ownership` + `OwnershipBadge`), per-trip freelancer invoices issued on
  assignment (single + consolidated legs), and a carrier **profitability** page
  (revenue vs freelancer cost, mark paid/reopen). → `docs/FREELANCERS.md`
- **UI/UX polish pass** — copy cleanup (no tanwīn) on the new surfaces;
  profitability load-flash + table-overflow fixes; admin policy panel
  loading/empty states; forced-carrier name resolution fix; desktop layouts
  verified across the new surfaces.

**Backend wiring — switching the demo features from localStorage/mock to the
real NestJS + Prisma API (live-verified against a local backend, see
`docs/LOCAL_BACKEND.md`):**

- [x] **Stage 1 — Fleet + ownership** (v0.9.23): `ownership` persisted on
  Truck/DriverProfile; carrier fleet lists + detail pages are API-backed.
- [x] **Stage 2 — Fleet assignment** (v0.9.24): truck↔driver link + truck/driver
  status persisted (assign/unassign/status endpoints with sync); carrier detail
  pages wired to the API.
- [x] **Stage 3 — Freelancer invoices** (v0.9.25): `FreelancerInvoice` model +
  `freelancer-invoices` endpoints; profitability page + assign-to-freelancer
  (single + consolidated legs) wired to the API.
- [x] **Stage 4 — Consolidated legs + status rollup** (v0.9.26): `Order.orderType`
  / `truckCount`; `OrderTruck` legs (sequence/status/driver); leg endpoints +
  forward-only rollup; carrier distribution board wired to the API. The
  client/admin consolidated **read-only** breakdown is also wired to
  `/orders/:id/legs` (enriched with plate + driver name) — v0.9.29.
- [x] **Stage 5 — Client policies** (v0.9.27): `PolicyGroup` model + `policies`
  endpoints (admin CRUD + `GET /policies/mine` resolver); admin panel + client
  order form wired to the API (admin changes now reach the client server-side).
- [x] **Stage 6 — Real WebSocket tracking** (v0.9.28): `RealtimeGateway` now
  emits status + location events and streams server-side GPS pings over
  Socket.IO; the client tracking page uses a real `socket.io-client` (mock
  fallback) on live API orders. **Backend wiring complete.**

---

## ✅ مربوط بالـ API (لا تبدأ من الصفر — لكن أعد الفتح إذا وجدت بق)

> ⚠️ "مربوط" لا تعني "خالٍ من البق". هذه الأشياء استُدعي فيها endpoint حقيقي
> مع toast/spinner/mutate. لكن قد تظهر مشاكل في:
> - اختلاف أسماء حقول بين mock و API (مثل ما حصل مع Truck و Payment)
> - Rules-of-Hooks بعد إضافة SWR
> - حالات حافة (empty/null/long lists) لم تُختَبر بعد
>
> إذا اكتشفت أي خلل في الميزات أدناه، أعد فتحها فوراً — لا تتردّد.

ربط end-to-end لـ:
- Auth (login/register/refresh/logout + admin login)
- Auto Token Refresh ✅ v0.9.9 — client + carrier يجدّدان الـ token على 401 قبل redirect
- Companies (GET/PUT، members CRUD، KYC submit + approve/reject)
- Orders (CRUD كامل + lifecycle publish/cancel/confirm/deliver/complete + tracking)
- Bids (POST/PUT/accept/reject + retry بعد REJECTED + proposedDeliveryDate)
- Fleet trucks (list + create + detail + photo upload بعد v0.9.3)
- Fleet drivers (list + detail + invite بعد v0.9.3)
- Payments (list + release + admin force-release)
- Invoices (list + send)
- Notifications (list + mark-read + mark-all-read)
- Disputes (POST جديد للعميل/الناقل + admin update)
- Support Tickets (POST/GET + admin update)
- Admin dashboard/companies/orders/disputes/transactions/settings
- Locale isolation (cookies منفصلة لكل بورتال)
- Toast infrastructure (sonner + lib/notify.ts على كل بورتال)
- normalizeOrder + normalizeBid + normalizeTruck + normalizePayment adapters
- Carrier opportunities filtering (يستثني المُسندة لنفس الناقل)
- Carrier order detail متطابق بصرياً مع العميل (ShipmentStatusCard inline timeline)
- Dynamic Logo ✅ v0.9.9 — admin يحفظ في DB، client/carrier يجلبان من `GET /settings/platform`
- Direct Assignment بسعر ثابت ✅ v0.9.9 — `agreedPriceUpfront` يتجاوز التفاوض ويُسند مباشرة
- Saved Addresses ✅ migration طُبّقت في v0.9.3 (20260521043732_add_saved_addresses_and_national_id)
- قائمة الناقلين في New Order ✅ v0.9.10 — `GET /companies?type=CARRIER&status=ACTIVE` بدل COMPANIES mock
- Carrier order controls ✅ v0.9.11 — أزرار ASSIGNED/CONFIRMED/IN_TRANSIT مع dialog صحيح لكل مرحلة
- Driver Assignment ✅ v0.9.11 — `POST /orders/:id/assign-driver` + `GET /fleet/drivers/available` + auto ON_TRIP/AVAILABLE

---

## 🟡 ناقص أو يحتاج عمل

لا توجد بنود جوهرية مفتوحة. كل ميزات الديمو مبنية ومربوطة بالـ API (انظر
«Project status» أعلاه). المتبقّي عمداً للمستقبل:

- **Production deploy** للـ backend: حتى الآن dev محلي فقط (`docs/LOCAL_BACKEND.md`).
  النشر على staging/prod يستخدم `prisma migrate deploy` فقط (انظر `docs/DEPLOYMENT.md`).
- **External integrations** (SMS / Email / Payment gateway) — القسم أدناه.
- **صفحات بواجهة ثابتة** متبقّية (finance / documents / reports carrier، audit/promotions admin) — الجدول أدناه.
- **تحسينات محتملة**: استبدال محاكاة نبضات GPS على الخادم بـ GPS حقيقي من جهاز
  السائق (نقطة الدفع `POST /orders/:id/tracking` تبثّ أصلاً)، واستضافة OSRM ذاتياً
  لحدود الطلبات في الإنتاج.

---

## 🔴 صفحات بواجهة ثابتة (لا API — مؤجَّلة بقرار)

هذه الصفحات موجودة في الـ sidebar لكن تعرض بيانات static فقط:

| الصفحة | البورتال | الحالة |
|---|---|---|
| `/reports` | admin | ✅ مربوط بـ 6 analytics endpoints (v0.9.14) — Bloomberg Terminal dark theme + PDF export |
| `/legal` | admin | نصوص قانونية ثابتة — لا يحتاج API |
| `/promotions` | admin | Static UI — ميزة مستقبلية |
| `/audit` | admin | Stub — يحتاج `GET /admin/audit-logs` |
| `/reports` | carrier | Static charts — لا endpoint بعد |
| `/finance` | carrier | Static UI — يحتاج ربط Wallet API |
| `/documents` | carrier | Static UI — يحتاج ربط KYC/uploads |
| `/tracking` | client | ✅ مربوط (v0.9.28) — مسار OSRM حقيقي + نبضات GPS عبر WebSocket حقيقي (RealtimeGateway)، على طلبات API حيّة |
| `/finance` | client | Static charts — يحتاج ربط Wallet API |

---

## 🔴 External Integrations (مؤجَّلة post-deploy عمداً)

- **SMS Provider**: حالياً `SMS_PROVIDER=console` يطبع الـ OTP في terminal. لا تشغّل عليها الـ flows حتى نوصل provider حقيقي (Unifonic / Twilio).
- **Email Provider**: Resend غير مفعّل. التذاكر/الفواتير/إعادة كلمة المرور لا ترسل أي إيميل.
- **Payment Gateway**: `PAYMENT_PROVIDER=mock`. الـ escrow يعمل DB-only؛ لا يوجد تحويل بنكي حقيقي.

---

## 🟢 Stability constraints (لا تخالفها)

- **PWA**: مُعطَّل. كل مرّة فُعِّل وقع المستخدمون في offline trap. مؤجَّل لما بعد v1.0 بـ Workbox/serwist.
- **shared-utils CJS dist**: Node 25 لا يقدر يحمّل `.ts` من main. `package.json.main = dist/index.js`. بعد كل تعديل لـ shared-utils run `pnpm exec tsc` من داخل `packages/shared-utils`.
- **date-fns @2.30.0**: v3+ ESM يكسر CJS bundling. لا ترفّع.
- **Rules of Hooks**: كل الـ hooks قبل أي `if/return`. خاصةً مع SWR الذي يقفز بين undefined ↔ resolved.
- **Per-portal cookies**: localhost cookies تتقاسم عبر الـ ports. كل مفتاح state-حسب-البورتال لازم suffix (`-admin/-client/-carrier`).
- **API adapters**: لا تشتغل مباشرة على `data` من SWR. مرّرها على `normalizeOrder/normalizeBid/normalizeTruck/normalizePayment` أولاً.

---

## 🧪 Smoke test الحالي

19 خطوة موثّقة في `GETTING_STARTED.md` — تغطّي:
1. Client login → wizard → publish order
2. Carrier login → opportunities → submit bid مع proposedDeliveryDate
3. Client: تفاصيل dialog → accept
4. Carrier: confirm pickup → confirm delivery
5. Admin: status + escrow auto-refresh كل 15 ثانية
6. Client: تأكيد الاستلام → escrow released
7. Disputes / Support tickets / KYC / Payments release / Fleet truck add / Location update / Notifications

---

## 📦 Backend modules state

| Module | Controller | Service | Tests | Notes |
|---|---|---|---|---|
| auth | ✅ | ✅ | ✗ | Admin login منفصل عند `/admin/auth/login` |
| companies | ✅ | ✅ | ✗ | KYC + members CRUD |
| orders | ✅ | ✅ | ✗ | List include `bids` selected fields (v0.9.0) + agreedPriceUpfront (v0.9.9) + assignDriver (v0.9.11) |
| bids | ✅ | ✅ | ✗ | `proposedDeliveryDate` (v0.9.0) |
| fleet | ✅ | ✅ | ✗ | TruckType enum extended (v0.9.2) |
| payments | ✅ | ✅ | ✗ | List includes `order.client/carrier.nameAr` (v0.9.1) |
| invoices | ✅ | ✅ | ✗ | |
| notifications | ✅ | ✅ | ✗ | |
| tracking | ✅ | ✅ | ✗ | events lifecycle |
| uploads | ✅ | ✅ | ✗ | presigned URLs (UI wiring pending) |
| admin | ✅ | ✅ | ✗ | dashboard/companies/orders/disputes/settings + 6 analytics endpoints (v0.9.14) |
| **disputes** | ✅ | ✅ | ✗ | جديد في v0.9.0 — POST/GET للأطراف |
| **support** | ✅ | ✅ | ✗ | جديد في v0.9.0 — Tickets CRUD |
| addresses | ✅ | ✅ | ✗ | تحتاج `prisma migrate dev` لتفعيل SavedAddress في DB |
| settings/catalogs | ✅ | — | ✗ | `GET /settings/catalogs` عام (بدون auth) |
| settings/platform | ✅ | — | ✗ | `GET /settings/platform` عام — logo + name (v0.9.9) |

---

## 📝 ملاحظات للجلسة القادمة

- ابدأ بقراءة هذا الملف + `CHANGELOG.md` (v0.9.x entries).
- المستخدم يفضّل: tasks منظّمة، type-check بعد كل تعديل جوهري، toasts بدل alerts، mutate بعد كل mutation.
- لا تكسر الـ stability constraints أعلاه.
- في حال شك حول backend endpoint: `grep -E "@(Get|Post|Put|Delete|Patch)\(" apps/api/src/modules/*/`.

### تشغيل الـ backend محلياً (مهم — الديمو صار يعتمد عليه)

الدليل الكامل في `docs/LOCAL_BACKEND.md`. نقاط حرجة اكتُشفت أثناء الربط:

- الـ API على `http://localhost:4000` ببادئة `/api`، والغلاف `{ success, data }`؛
  تسجيل الدخول `POST /api/auth/login` بـ `{ phoneOrEmail, password }`، والأدمن
  `POST /api/admin/auth/login` بـ `{ email, password }` (حسابات: carrier@naqla.sa
  / Carrier@1234، admin@naqla.sa / Admin@1234، client@naqla.sa / Client@1234).
- **نسخ الـ Prisma client إلى dist**: `nest build` يُخرج `dist/src/main.js` ولا
  ينسخ العميل المولَّد، فبعد كل build:
  `cp -R src/generated/prisma dist/src/generated/prisma` ثم `node dist/src/main.js`.
- **Migrations بلا TTY**: `prisma migrate dev` يفشل في بيئة غير تفاعلية؛ اكتب ملف
  الـ migration يدوياً تحت `prisma/migrations/<ts>_<name>/migration.sql` ثم
  `prisma migrate deploy` (طابِق تنسيق Prisma لتفادي drift).
- **Rate-limit**: `POST /api/*/auth/login` عليه throttle صارم؛ أعد استخدام التوكن
  بدل تكرار الدخول.
- بعد كل تعديل schema: migrate + `prisma generate` + نسخ الـ client إلى dist +
  إعادة تشغيل الـ API. وبعد تعديل shared-utils: `pnpm exec tsc` بداخلها.

### آخر ما أُنجز (v0.9.23 → v0.9.29) — ربط الـ backend + الصقل:

- **v0.9.23–v0.9.28**: ربط الميزات بالـ API على 6 مراحل (الملكية → الإسناد →
  فواتير الفري‑لانسر → الأرجل المجمّعة + الترحيل → سياسات العملاء → تتبّع WebSocket
  حقيقي) — انظر المتتبّع أعلاه.
- **v0.9.29**: عرض الطلب المجمّع للقراءة فقط (عميل/أدمن) مربوط بـ `/orders/:id/legs`
  (مُثرى بلوحة الشاحنة واسم السائق).
- **UI/UX polish**: تنظيف النسخ (بلا تنوين)، إصلاحات الربحية، حالات تحميل/فراغ في
  لوحة الأدمن، إصلاح اسم المزوّد المُلزَم، ومراجعة سطح المكتب.

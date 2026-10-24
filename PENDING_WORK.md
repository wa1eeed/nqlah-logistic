# Pending Work — حالة الربط الحالية

> آخر تحديث: 2026-10-24 (بعد v0.9.22 — Provider dispatcher / freelancers)
>
> الهدف من هذا الملف: نقطة استئناف واضحة. يلخّص ما تبقّى من الربط/الإصلاحات قبل
> أن نعتبر النظام جاهزاً لـ release v1.0.
>
> **ملاحظة تصميم (v0.9.16):** إعادة التصميم لنظام "Mint" الفاتح مكتملة عبر الصفحة
> التسويقية (الرئيسية + الداخلية) وكل اللوحات الثلاث. هذه نقاط ربط/بيانات، لا تصميم.

---

## Recent demo / UX work (v0.9.17–v0.9.22, 2026-10-24) — status

> Written in English per `docs/DOCUMENTATION.md`. These are UI/demo features
> built on `mock-data` + client stores; wiring them to the real API is future
> work. Full details live in `CHANGELOG.md` and the `docs/` references
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

**Backend wiring — switching the demo features from localStorage/mock to the
real NestJS + Prisma API (live-verified against a local backend, see
`docs/LOCAL_BACKEND.md`):**

- [x] **Stage 1 — Fleet + ownership** (v0.9.23): `ownership` persisted on
  Truck/DriverProfile; carrier fleet lists + detail pages are API-backed.
- [x] **Stage 2 — Fleet assignment** (v0.9.24): truck↔driver link + truck/driver
  status persisted (assign/unassign/status endpoints with sync); carrier detail
  pages wired to the API.
- [ ] **Stage 3 — Freelancer invoices**: `FreelancerInvoice` model + endpoints;
  freelancer-store + profitability page → API; issue invoice on assignment.
- [ ] **Stage 4 — Consolidated legs + status rollup**: per-leg status on
  OrderTruck, distribution endpoints, roll leg statuses up to the parent order.
- [ ] **Stage 5 — Client policies**: Policy/PolicyGroup models + guarded
  endpoints; resolve per request; admin + client form → API.
- [ ] **Stage 6 — Real WebSocket tracking**: emit from the (existing but unused)
  RealtimeGateway on location/status writes; client `socket.io-client` replaces
  the mock `tracking-socket.ts`.

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

لا يوجد بنود مفتوحة بعد v0.9.9 — جميع الوظائف الجوهرية مربوطة.

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
| `/tracking` | client | Static map — يحتاج GPS live feed |
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

### آخر ما أُنجز (v0.9.13 → v0.9.15):

- **v0.9.13**: Premium UI/UX — framer-motion على client/carrier portals + driver app (dashboard hero، animated sidebar، EmptyState، PageTransition، split login)
- **v0.9.14**: Executive KPI Dashboard — 6 analytics endpoints في admin + Bloomberg Terminal dark theme + PDF export (jspdf)
- **v0.9.15**: Landing page إعادة كتابة كاملة (animated hero, stats counters, testimonials slider, mobile hamburger) + تغيير اسم تبويب التقارير إلى "الملخص الاستراتيجي"

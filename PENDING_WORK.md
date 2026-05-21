# Pending Work — حالة الربط الحالية

> آخر تحديث: 2026-05-21 (بعد v0.9.3)
>
> الهدف من هذا الملف: نقطة استئناف واضحة. يلخّص ما تبقّى من الربط/الإصلاحات قبل
> أن نعتبر النظام جاهزاً لـ release v1.0.

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

---

## 🟡 قيد العمل / يحتاج backend جديد

### 1. Saved Addresses (Client) — backend جاهز، يحتاج prisma migrate
- **حالياً**: Module وُجد (`apps/api/src/modules/addresses/`) + Prisma model `SavedAddress` أُضيف في v0.9.3. لكن **لم تُشغَّل migration** بعد.
- **المطلوب**:
  - `npx prisma migrate dev --name add_saved_addresses` من `apps/api/`
  - الـ wizard يقرأ من `/companies/:companyId/addresses` كقائمة منسدلة "اختر من العناوين المحفوظة".

### 2. Dynamic Catalogs ✅ — مكتمل في v0.9.3
- Cities و TruckTypes: wizard يقرأ من `GET /settings/catalogs` مع static fallback.
- Admin panels: كل mutation يحفظ JSON في Settings table تلقائياً.
- CARGO_TYPES تبقى static لأن IDs الـ CargoTypeDef لا تطابق Prisma CargoType enum.

### 3. Manual Wallet Transactions ✅ — مكتمل في v0.9.3
- `POST /admin/wallets/:companyId/transactions` موجود ومربوط.

### 4. DIRECT Negotiation DECLINE ✅ — مكتمل في v0.9.3
- `POST /orders/:id/decline-direct` يعيد الطلب للسوق المفتوح ويمسح `targetCarrierId`.

### 5. Truck Photo Upload ✅ — مكتمل في v0.9.3
- صور الشاحنة تُرفع عبر presigned URL قبل إنشاء الشاحنة.

### 6. Bid Withdraw UI ✅ — مكتمل في v0.9.3
- زر "سحب العرض" موجود في carrier/opportunities/[id].

### 7. Driver Detail Page ✅ — مكتمل في v0.9.3
- `carrier/fleet/drivers/[id]/page.tsx` موجودة ومربوطة.

### 8. Contact Info Display After Bid Acceptance ✅ — مكتمل في v0.9.3
- CarrierInfoCard تستخدم `order.carrier` من API مع tel:/mailto: links.

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
| orders | ✅ | ✅ | ✗ | List include `bids` selected fields (v0.9.0) |
| bids | ✅ | ✅ | ✗ | `proposedDeliveryDate` (v0.9.0) |
| fleet | ✅ | ✅ | ✗ | TruckType enum extended (v0.9.2) |
| payments | ✅ | ✅ | ✗ | List includes `order.client/carrier.nameAr` (v0.9.1) |
| invoices | ✅ | ✅ | ✗ | |
| notifications | ✅ | ✅ | ✗ | |
| tracking | ✅ | ✅ | ✗ | events lifecycle |
| uploads | ✅ | ✅ | ✗ | presigned URLs (UI wiring pending) |
| admin | ✅ | ✅ | ✗ | dashboard/companies/orders/disputes/settings |
| **disputes** | ✅ | ✅ | ✗ | جديد في v0.9.0 — POST/GET للأطراف |
| **support** | ✅ | ✅ | ✗ | جديد في v0.9.0 — Tickets CRUD |
| addresses | ✅ | ✅ | ✗ | تحتاج `prisma migrate dev` لتفعيل SavedAddress في DB |
| settings/catalogs | ✅ | — | ✗ | `GET /settings/catalogs` عام (بدون auth) |

---

## 📝 ملاحظات للجلسة القادمة

- ابدأ بقراءة هذا الملف + `CHANGELOG.md` (v0.9.x entries).
- المستخدم يفضّل: tasks منظّمة، type-check بعد كل تعديل جوهري، toasts بدل alerts، mutate بعد كل mutation.
- لا تكسر الـ stability constraints أعلاه.
- في حال شك حول backend endpoint: `grep -E "@(Get|Post|Put|Delete|Patch)\(" apps/api/src/modules/*/`.

# Finance & Tax — Commission, VAT & Tax Invoices

How money is computed, split, and invoiced on every order. The math lives in one
pure function so the API, admin, settlement and invoices all agree; the tax rules
follow the Saudi/ZATCA model (15% VAT, VAT-registered sellers).

```
price ──► computeOrderFinancials() ──► { service base/VAT, commission + its VAT,
                                          carrier net, client total due }
                                   │
                    stored on Order/OrderLeg at create / assign / bid-accept
                                   │
                    settlement reads it ──► wallet credit / COD deduction
                                   │
                    completion reads it ──► VAT-compliant tax invoices
```

Defaults: `VAT_RATE = 0.15`, `DEFAULT_COMMISSION_RATE = 0.08`
(`apps/api/src/common/pricing/pricing.ts`).

---

## 1. The pricing function

`computeOrderFinancials(input)` (`apps/api/src/common/pricing/pricing.ts`) is a
pure, rounded-to-2-decimals computation:

```ts
interface PricingInput {
  price: number;                       // the agreed transport price
  commissionRate?: number;             // default 0.08
  commissionAppliesTo?: 'CLIENT' | 'CARRIER' | 'BOTH';   // default CARRIER
  priceVatInclusive?: boolean;         // is `price` VAT-inclusive? default false
  carrierVatRegistered?: boolean;      // default true
}

interface OrderFinancials {
  serviceBase; serviceVat; serviceTotal;        // carrier service (→ client)
  commission; commissionVat; commissionTotal;   // platform commission (→ bearer)
  carrierAmount;                                 // net credited to the carrier
  clientTotalDue;                                // total the client pays
  commissionRate; commissionAppliesTo;           // echoed config
}
```

### Rules

1. **Service base + VAT** (the carrier's transport fee):
   - Carrier **VAT-registered** + `priceVatInclusive` → `base = price / 1.15`,
     `vat = price − base`.
   - Carrier **VAT-registered** + exclusive → `base = price`, `vat = base × 0.15`.
   - Carrier **not VAT-registered** → `base = price`, `vat = 0`.
2. **Commission** is charged on the service **base**: `commission = base × rate`.
   Its VAT is **always** added (`commission × 0.15`) — the platform is a
   VAT-registered seller regardless of the carrier's status. This is a **separate
   VAT** from the service VAT.
3. **Who bears the commission** (`commissionAppliesTo`):
   - `CARRIER` (default) — deducted from the carrier: `carrierAmount = serviceTotal
     − commissionTotal`; `clientTotalDue = serviceTotal`.
   - `CLIENT` — added on top for the client: `carrierAmount = serviceTotal`;
     `clientTotalDue = serviceTotal + commissionTotal`.
   - `BOTH` — split 50/50: each side bears half of `commissionTotal`.

### Worked example

`price = 10,000`, rate `8%`, commission on **CARRIER**, carrier VAT-registered,
VAT-exclusive:

| | Amount |
| --- | ---: |
| Service base | 10,000.00 |
| Service VAT (15%) | 1,500.00 |
| **Service total** | **11,500.00** |
| Commission (8% of base) | 800.00 |
| Commission VAT (15%) | 120.00 |
| **Commission total** | **920.00** |
| **Carrier net** (11,500 − 920) | **10,580.00** |
| **Client total due** | **11,500.00** |

Covered by `pricing.spec.ts` (unit) and `finance.e2e.mjs` (live).

---

## 2. Where the rate & flags come from

`OrdersService.resolveFinancials(price, clientId, carrierId)` resolves the inputs
before calling the pure function:

- **commission rate** — precedence **plan/profile → carrier company → default
  (0.08)**. The client's effective Policy Profile (via the engine, see
  [`POLICIES.md`](POLICIES.md)) may set `commissionRate`; otherwise the carrier's
  own `Company.commissionRate`; otherwise the default.
- **`commissionAppliesTo`** and **`priceVatInclusive`** — from the client's
  effective Policy Profile (`PolicyGroup.commissionAppliesTo` /
  `priceVatInclusive`), defaulting to `CARRIER` / `false`.
- **`carrierVatRegistered`** — from `Company.vatRegistered`.

The financials are computed and **persisted** on order create (DIRECT upfront
price), admin `assign`, per-leg carrier assignment, and bid acceptance. Stored
columns: `Order.agreedPrice / commissionAmount / carrierAmount / serviceVatAmount
/ commissionVatAmount / clientTotalDue` and the per-leg mirror on `OrderLeg`.

---

## 3. VAT registration

A **carrier company** captures its VAT identity at registration
(`POST /auth/register`, `type = COMPANY`):

- `crNumber` — 10-digit commercial register.
- `vatNumber` — 15-digit VAT number (ZATCA format).
- `vatRegistered` — a **"not VAT registered" (غير مسجّل في الضريبة)** toggle. When
  off, the carrier charges **no service VAT** (commission VAT still applies), and a
  VAT number is not required.

Admins change this later via `PATCH /admin/companies/:id/tax`
(`{ vatRegistered?, vatNumber? }`, audited `admin.company.taxUpdate`); marking a
company unregistered clears its stored VAT number. Surfaced on the company 360°
profile as a **Tax & VAT** card.

---

## 4. Settlement

`CollectionService` (`apps/api/src/modules/payments/collection/`):

- The amount collected from the client is `clientTotalDue` (falls back to
  `agreedPrice` for legacy orders).
- On COD settlement the platform's cut deducted from the carrier is
  `commissionAmount + commissionVatAmount`.

---

## 5. Tax invoices

See [`INVOICES.md`](INVOICES.md). On order completion the platform issues
VAT-compliant invoices from the stored financials: a **carrier service invoice**
(→ client) and a **platform commission invoice** (→ the bearer).

---

## 6. Changelog anchors

- v0.9.75 — Workflow & Policy Engine: commission config on the profile (phase 1).
- v0.9.76 — dynamic commission (`CLIENT`/`CARRIER`/`BOTH`) + VAT math + carrier VAT
  registration (phase 2a).
- v0.9.77 — VAT-compliant tax invoices on completion (phase 2b).

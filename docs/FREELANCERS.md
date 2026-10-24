# Provider Dispatcher — Freelancers, Per-Trip Invoices & Profitability

A provider (carrier) acts as a **dispatcher**: it fulfills orders with its own
fleet or by sub-contracting **freelancers** who are paid a fee per delivery.
This subsystem tracks that distinction, issues a per-trip invoice to each
freelancer, and reports the provider's profit per order.

---

## 1. Ownership model

`packages/shared-utils/src/mock-data.ts`.

```ts
type FleetOwnership = 'OWNED' | 'FREELANCER';

// added to both interfaces
interface Truck  { /* … */ ownership: FleetOwnership; }
interface Driver { /* … */ ownership: FleetOwnership; }
```

- **OWNED** (تابع): part of the provider's own fleet.
- **FREELANCER** (فري‑لانسر): contracted, paid a fee per trip.

The seed marks `TRK-004 / TRK-005` and `DRV-003 / DRV-005` as freelancers; the
rest are owned.

## 2. Per-trip invoices

```ts
type FreelancerInvoiceStatus = 'DUE' | 'PAID';

interface FreelancerInvoice {
  id; carrierId; orderId; orderNumber;
  truckId; driverId?;
  amount;            // trip fee owed to the freelancer (SAR)
  status; issuedAt; paidAt?;
}

FREELANCER_INVOICES_SEED              // historical freelancer trips
freelancerInvoicesForCarrier(id, extra?)
revenueForOrder(orderId)             // carrier revenue for an order (trip amount or agreed amount)
```

An invoice is created when the provider assigns an order to a freelancer and
sets the trip fee (see §4). `revenueForOrder` resolves what the carrier earns
from the client for that order, so profit = revenue − fee.

## 3. Carrier store

`apps/web/carrier/src/stores/freelancer-store.ts` (Zustand + persist,
`naqla:freelancer-invoices`):

- `created` — invoices issued this session; `addInvoice(carrierId, input)`.
- `statusOverride` / `paidAt` — flip a seeded or created invoice between
  `DUE` ⇄ `PAID` without mutating the shared seed (`markPaid` / `markDue`).
- `invoiceForOrderTruck(orderId, truckId)` — guards against duplicates.
- `resolveInvoices(carrierId, state)` — merges seed + created, applies
  overrides, newest first (pure read helper).
- `resetInvoices()` — demo reset.

## 4. Assigning a freelancer (invoicing)

Both assignment surfaces detect a freelancer truck and require a trip fee before
the action is allowed:

- **Single order** — the «إسناد شاحنة» dialog
  (`apps/web/carrier/.../orders/[id]/page.tsx`): each truck shows its
  `OwnershipBadge`; picking a freelancer reveals the **أجرة الرحلة** field and
  shows the expected margin. On confirm, `addInvoice` issues the invoice.
- **Consolidated legs** — the distribution panel
  (`components/consolidated-panel.tsx`): same fee field per leg; the invoice's
  `orderId` is leg-suffixed (`<order>-L<index>`) so each leg is tracked
  separately. The leg's share of the order revenue is shown as a reference.

## 5. Profitability page

**Carrier → finance → «الربحية»** (`/profitability`,
`apps/web/carrier/.../profitability/page.tsx`):

- Totals: order **revenue**, **freelancer cost**, **net profit**, and amount
  **still due**.
- A table of every freelancer invoice: order, freelancer (driver + plate),
  client revenue, trip fee, profit + margin %, status, and a **mark paid /
  reopen** action (with a confirmation).

## 6. Backend (v0.9.25)

Freelancer invoices are now persisted by the API (see `docs/LOCAL_BACKEND.md`).

- Prisma model `FreelancerInvoice` + enum `FreelancerInvoiceStatus`, unique per
  `(carrierId, orderId, truckId)`. `orderRevenue` snapshots the client-side
  earning so provider margin needs no re-resolution.
- Module `apps/api/src/modules/freelancer-invoices/`:
  `GET /freelancer-invoices` (carrier scoped), `POST` (idempotent upsert),
  `PATCH /:id/pay`, `PATCH /:id/reopen`.
- The carrier **profitability page** reads `/freelancer-invoices` (resolving
  plate/driver from the live fleet) and mark-paid / reopen hit the API. The
  **assign-to-freelancer** flows (single order + consolidated legs)
  `POST /freelancer-invoices` on assignment, passing the order/leg revenue.
- The localStorage store (`freelancer-store.ts`) remains a **fallback** for
  offline/design runs; the demo-reset button is hidden when the API is live.

Still client-only: `ownership` edits other than via the fleet API, and tying an
invoice's payment to a real settlement/wallet entry.

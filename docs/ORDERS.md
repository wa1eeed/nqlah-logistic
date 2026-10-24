# Orders — Types & Lifecycle

Reference for order **types** and the **consolidated (multi-truck) order** flow.
For the general order state machine and escrow, see `docs/ARCHITECTURE.md`.

---

## 1. Order types

An order is one of two kinds (`Order.orderType`, defaults to `SINGLE` when absent):

- **`SINGLE`** — one shipment on one truck. The platform's standard flow.
- **`CONSOLIDATED`** — a bulk request for **N trucks on the same route and
  cargo**, published as **one order** with **one order number** and **one
  consolidated invoice**. The awarded carrier then distributes the N legs across
  its own trucks/drivers.

The client chooses the type in the new-order form (Step 1). For a consolidated
order a stepper sets `truckCount` (range 2–20). Everything else in the request
(route, cargo, truck type, requirements) is shared by all trucks.

Model (`packages/shared-utils/src/mock-data.ts`):

```ts
type OrderType = 'SINGLE' | 'CONSOLIDATED';
type ConsolidatedLegStatus = 'PENDING' | 'ASSIGNED' | 'IN_TRANSIT' | 'DELIVERED';

interface ConsolidatedLeg { index: number; status: ConsolidatedLegStatus; truckId?: string; driverId?: string; }

interface Order {
  // …
  orderType?: OrderType;
  truckCount?: number;        // CONSOLIDATED only
  legs?: ConsolidatedLeg[];   // CONSOLIDATED only — one per truck
}
```

---

## 2. Consolidated order lifecycle

1. **Create** — the client submits one consolidated order (`orderType`,
   `truckCount`). It is published, bid on, and awarded like any order, under one
   order number.
2. **Distribute** — after the award, the carrier distributes each **leg** to one
   of its fleet trucks. The truck's **linked driver** (see `docs/FLEET.md`) is
   attached automatically. Progress is tracked as *distributed / total*.
3. **Transit & delivery** — each leg carries its own status
   (`PENDING → ASSIGNED → IN_TRANSIT → DELIVERED`); the parent order rolls them
   up.
4. **Invoice** — one consolidated invoice: `truckCount × per-truck amount =
   total`, under the single order number. `agreedPrice` is the order total;
   per-truck = `agreedPrice / truckCount`.

---

## 3. UI

- **New-order form** — `apps/web/client/src/app/(app)/orders/new/page.tsx`:
  order-type cards + truck-count stepper (Step 1); the summary and review step
  reflect the choice.
- **Carrier distribution (interactive)** —
  `apps/web/carrier/src/components/consolidated-panel.tsx`, backed by
  `apps/web/carrier/src/stores/consolidated-store.ts` (Zustand + persist, keyed
  by `orderId`). Shows a progress bar, a per-leg board (assign / clear via a
  truck picker), and the consolidated invoice. Rendered on the carrier order
  detail when `order.orderType === 'CONSOLIDATED'`.
- **Client & admin (read-only)** — a `ConsolidatedReadonly` breakdown (each leg:
  plate + driver + status) and the consolidated invoice, on their order-detail
  pages. The single-truck plate/driver block is shown only for `SINGLE` orders.

---

## 4. Demo notes & future (real API)

- In demo mode the carrier's distribution lives in the carrier's local store, so
  the baseline (seeded) distribution is what client/admin display. With a real
  backend the legs and their assignments are server-side and shared across all
  parties in real time.
## Backend (v0.9.26)

Consolidated orders and their legs are persisted by the API (see
`docs/LOCAL_BACKEND.md`).

- `Order.orderType` (`SINGLE` | `CONSOLIDATED`) + `truckCount`. `OrderTruck` is a
  leg with `sequence`, `status`, and `driverId` — one row per **distributed**
  leg; undistributed legs are implicit (`PENDING`).
- Carrier-scoped endpoints: `GET /orders/:id/legs` (full 1..N list),
  `POST /orders/:id/legs/:index/distribute`, `DELETE /orders/:id/legs/:index`,
  `PATCH /orders/:id/legs/:index/status`. A truck serves at most one leg.
- The parent order's status is **rolled up** (forward-only) from its legs: all
  delivered → DELIVERED, any in transit → IN_TRANSIT, all distributed →
  ASSIGNED.
- The carrier `ConsolidatedPanel` reads `/orders/:id/legs` and distribute/clear
  persist to the DB (mock fallback kept). The client/admin **read-only**
  breakdown still reads `order.legs` and can move to `/orders/:id/legs` later.

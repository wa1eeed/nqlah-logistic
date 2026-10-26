# Orders — Types & Lifecycle

Reference for order **types** and the **consolidated (multi-truck) order** flow,
including heterogeneous legs, per-leg carriers, and per-leg bidding. For the
general order state machine and escrow, see [`docs/ARCHITECTURE.md`](ARCHITECTURE.md);
for payment collection, see [`docs/POLICIES.md`](POLICIES.md) §Collection.

---

## 1. Order types

An order is one of two kinds (`Order.orderType`, defaults to `SINGLE`):

- **`SINGLE`** — one shipment on one truck. The platform's standard flow.
- **`CONSOLIDATED`** — several trucks under **one order**, with **one order
  number**, **one client**, and **one consolidated invoice**. Its legs may be
  either homogeneous or heterogeneous:
  - **Homogeneous** — N trucks on the **same route, truck type and split price**.
    The client sets a `truckCount` (2–20); everything else is shared.
  - **Heterogeneous** — each leg has its **own truck type, destination and
    price** (and, in phase 2, its own carrier), while the single pickup origin,
    client and invoice stay shared.

The client picks the kind in the new-order wizard (Step 1). For a consolidated
order a toggle chooses **identical legs** (the `truckCount` stepper + per-leg
reference editor) or **mixed legs** (a per-leg editor: truck type, destination,
price, reference — add/remove legs, with a live total).

### Model

Prisma (`apps/api/prisma/schema.prisma`): the per-leg plan lives in **`OrderLeg`**,
the actual truck/driver assignment in **`OrderTruck`** (both keyed by
`(orderId, sequence)`). Homogeneous legacy orders have no `OrderLeg` rows and fall
back to the order's own values.

```prisma
model OrderLeg {
  orderId, sequence              // 1-based leg index
  reference?                     // per-leg shipment reference
  requiredTruckType              // per-leg truck type
  destination{City,Region,Address,Lat?,Lng?}   // per-leg destination (origin is shared)
  price?                         // per-leg price; order total = Σ leg prices
  // phase 2 — a leg's own carrier:
  carrierId?                     // the carrier serving this leg
  status                         // PENDING | ASSIGNED | IN_TRANSIT | DELIVERED
  commissionAmount?, carrierAmount?   // per-leg financial split of `price`
  serviceVatAmount?, commissionVatAmount?   // per-leg VAT breakdown (phase 2a)
  settledAt?                     // when the leg payout was released
  bids Bid[]                     // phase 2b — per-leg bids
}
```

**Order-level financials** (set at create / assign / bid-accept, see
[`FINANCE.md`](FINANCE.md)): `agreedPrice`, `commissionAmount`, `carrierAmount`,
and the VAT breakdown `serviceVatAmount`, `commissionVatAmount`, `clientTotalDue`.
`Order.invoices[]` holds the tax invoices issued on completion
([`INVOICES.md`](INVOICES.md)).

Frontend shape (`packages/shared-utils/src/mock-data.ts`):

```ts
interface ConsolidatedLeg {
  index: number;
  status: 'PENDING' | 'ASSIGNED' | 'IN_TRANSIT' | 'DELIVERED';
  reference?: string;
  truckId?: string; driverId?: string; plateNumber?: string; driverName?: string;
  // heterogeneous spec (falls back to the order's values when absent):
  requiredTruckType?: TruckType;
  destinationCity?: string; destinationRegion?: string; destinationAddress?: string;
  price?: number;
  // phase 2 — per-leg carrier + settlement:
  carrierId?: string; carrierName?: string; carrierAmount?: number;
  // phase 2b — per-leg bidding:
  bidCount?: number; myBidAmount?: number; myBidStatus?: BidStatus;
}
```

---

## 2. Consolidated lifecycle

1. **Create** — the client submits one consolidated order. A heterogeneous order
   sends a `legs[]` spec; `truckCount` is derived and the order total is the **sum
   of the legs' prices** (seeding `agreedPrice` for a DIRECT order and
   `clientBudget`). A homogeneous order sends `truckCount` (+ optional
   `legReferences`).
2. **Source a carrier per leg** — two paths, mixable:
   - **Direct assignment** (phase 2a) — the client/admin assigns a carrier to each
     leg (`POST /orders/:id/legs/:index/assign-carrier`). The carrier must be
     visible to the client; the leg's 8% commission split is computed from its price.
   - **Open-market bidding** (phase 2b) — carriers **bid on individual legs**
     (`POST /orders/:id/bids { legIndex, amount }`); the client/admin **awards** a
     leg to a bid, which assigns that carrier at the bid amount.
3. **Distribute** — a leg's carrier distributes the leg to one of **its own**
   fleet trucks (the truck must match the leg's required type); the truck's linked
   driver is attached automatically.
4. **Transit & delivery** — the leg's carrier advances its leg
   (`ASSIGNED → IN_TRANSIT → DELIVERED`). The order status **rolls up** from its
   legs (all delivered → `DELIVERED`; any moving/delivered → `IN_TRANSIT`; all
   legs have a carrier → `ASSIGNED`).
5. **Settlement** — on **leg delivery**, the leg's carrier is credited its
   `carrierAmount` (idempotent, guarded by `settledAt`); the platform keeps the
   per-leg commission. The client still pays the order total once (order-level
   collection / escrow); payouts are released per leg.
6. **Invoice** — one consolidated invoice under the single order number. For a
   homogeneous order it is `truckCount × per-truck amount`; for a heterogeneous
   order it is the **sum of the legs' prices**, shown per leg.

---

## 3. API

Leg list + assignment + status (`apps/api/src/modules/orders/`):

| Endpoint | Who | Purpose |
| --- | --- | --- |
| `GET /orders/:id/legs` | client / leg carrier / order carrier / admin | Full 1..N leg list, enriched with per-leg spec, carrier, plate/driver, `bidCount`, and the caller's own bid. Includes a `heterogeneous` flag. |
| `POST /orders/:id/legs/:index/assign-carrier` | client / admin | Assign a carrier to a leg (`{ carrierId, price? }`); computes the split, sets the leg `ASSIGNED`. |
| `DELETE /orders/:id/legs/:index/carrier` | client / admin | Clear a leg's carrier (while not in transit). |
| `POST /orders/:id/legs/:index/distribute` | leg carrier / admin | Assign one of the carrier's own trucks to the leg (type must match). |
| `DELETE /orders/:id/legs/:index` | leg carrier / admin | Un-distribute the truck. |
| `PATCH /orders/:id/legs/:index/status` | leg carrier / admin | Advance the leg; `DELIVERED` releases the leg payout. |

Per-leg bidding (`apps/api/src/modules/bids/`):

| Endpoint | Who | Purpose |
| --- | --- | --- |
| `POST /orders/:id/bids` `{ legIndex, amount }` | carrier | Bid on a leg; the leg must be open and the carrier must own a truck of its type (`NO_MATCHING_TRUCK`, `LEG_ALREADY_ASSIGNED`). Omit `legIndex` for a classic order-level bid. |
| `GET /orders/:id/bids?legIndex=N` | client / carrier / admin | A leg's bids (the order-level list excludes leg bids). |
| `POST /orders/:id/bids/:bidId/accept` | client / admin | Award: assigns the leg's carrier + price + split, rejects the other bids on that leg, rolls up the order. |

**Authorization:** a leg's own carrier — not only the order carrier — may
distribute its truck and advance its leg, and may view any order where it serves a
leg. A carrier may bid on several legs of one order; uniqueness is enforced by two
partial unique indexes on `Bid` (one per order+carrier for order-level bids, one
per leg+carrier for leg bids).

---

## 4. UI

- **New-order wizard** — `apps/web/client/src/app/(app)/orders/new/page.tsx`:
  order-type cards, the identical/mixed toggle, and the per-leg editor for mixed
  legs. The summary and review steps reflect the choice.
- **Carrier panel** — `apps/web/carrier/src/components/consolidated-panel.tsx`:
  shows each leg's spec + carrier; a **bid** action ("قدّم عرضاً") on serviceable
  open legs; and, for the carrier's **own** legs, distribute + start/deliver
  controls. Rendered on the carrier order detail for `CONSOLIDATED` orders.
- **Admin & client order detail** — a `ConsolidatedReadonly` breakdown (per-leg
  truck type, destination, price, carrier, status) and the per-leg invoice. The
  **admin** detail adds a per-leg **carrier assignment** dropdown and a per-leg
  **bids → Award** dialog. The single-truck plate/driver block shows only for
  `SINGLE` orders.

---

## 5. Changelog anchors

- v0.9.26 — consolidated orders + legs persisted by the API.
- v0.9.35 — per-leg shipment references.
- v0.9.68 — heterogeneous legs (per-leg truck type / destination / price).
- v0.9.69 — per-leg carriers + per-leg settlement (direct assignment).
- v0.9.70 — per-leg open-market bidding + award.

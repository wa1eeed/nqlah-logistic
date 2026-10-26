# Workflow & Policy Engine

The engine drives **how the platform operates per company**. Four layers:

```
Company.planId
   └─ Plan (membership)        commercial wrapper a company subscribes to (audience-aware)
        └─ Policy Profile       the operating ruleset (the "group")
             ├─ modules          sourcing / pricing / collection / visibility (+ defaults + enforcement)
             ├─ capability layer feature flags + numeric limits
             └─ commission       rate / appliesTo / price-VAT-inclusive
        └─ Engine               resolves the effective policy + features and drives the workflow
```

`PolicyEngineService` (`PoliciesService`) resolves a company's **effective
operating policy** by precedence: **sub-tenant owner > Plan > legacy group
membership (`clientIds`) > default**. Everything is configured by the **admin**,
surfaced at **Admin → محرك السياسات والتشغيل**.

### Plans (memberships)

A `Plan` (باقة/عضوية) is a thin commercial wrapper that references one Policy
Profile; its *shape* (modules + features + commission) comes from that profile.
Plans are **audience-aware** (`CLIENT` | `CARRIER` | `BOTH`), can be marked
`isDefault` per audience, and may carry an optional `commissionRateOverride`.
A company subscribes via `Company.planId` (admin-assigned now; registration-bound
later). API: `GET/POST/PUT/DELETE /policies/plans`, `POST /policies/assign-plan`.

### Capability layer (features & limits)

Each profile carries a flexible `features` map — **feature flags** and **numeric
limits** — that plans grant to their subscribers. A feature is **denied only when
explicitly `false`**; absent = allowed (so an ungrouped company keeps full access).
Known capabilities: `consolidatedOrders`, `perLegCarriers`, `liveTracking`,
`freelancerFleet`, `whiteLabel`, `prioritySupport`, `advancedAnalytics`; limits:
`maxActiveOrders`, `maxFleetSize`, `maxTeamMembers`. New keys need no migration.

**Enforced gates (phase 1):** consolidated-order creation needs
`consolidatedOrders`; per-leg carriers/bidding need `perLegCarriers`; enabling a
carrier's white-label needs `whiteLabel`. `PolicyEngineService.hasFeature()` is
the check; `/policies/mine` exposes the whole layer so the apps adapt.

> **Phase 2 (done):** the dynamic commission + VAT math (commission applies to
> client/carrier/both, VAT-inclusive pricing, commission's own VAT), carrier VAT
> registration at signup, and VAT-compliant **tax invoices** (service + commission).
> See [`FINANCE.md`](FINANCE.md) and [`INVOICES.md`](INVOICES.md).

---

## 1. Profile model

Prisma `PolicyGroup` (`apps/api/prisma/schema.prisma`); frontend `ClientPolicy`
(`packages/shared-utils/src/mock-data.ts`).

```ts
interface ClientPolicy {
  // ── Allow toggles (which options the client may use) ──
  allowMarket: boolean;        // publish to the open market
  allowDirect: boolean;        // direct-assign to a carrier
  forcedCarrierId?: string;    // lock direct-assign to this carrier (market off)
  allowMarketPricing: boolean; // carriers bid
  allowFixedPricing: boolean;  // client sets a fixed price
  allowPrepaid: boolean;       // Escrow / prepaid wallet / gateway
  allowCOD: boolean;           // cash on delivery

  // ── Per-group module DEFAULTS (admin-set) ──
  defaultAssignment?: 'MARKET' | 'DIRECT';
  defaultPricing?: 'MARKET' | 'FIXED';
  defaultCollectionMethod?: 'ESCROW' | 'PREPAID_WALLET' | 'PREPAID_GATEWAY' | 'COD';
  enforceCollectionMethod?: boolean;   // force the default; the client can't override

  // ── Provider visibility scope ──
  visibilityScope?: 'ALL' | 'GROUP' | 'CARRIER';
  visibleCarrierGroupId?: string;      // when scope = GROUP
}
```

- A **client belongs to at most one** `PolicyGroup`; ungrouped clients use
  `DEFAULT_CLIENT_POLICY` (everything allowed, no defaults, no enforcement,
  scope `ALL`). Both `assignClient` and `updateGroup(clientIds)` strip a client
  from every other group, so the effective policy is never ambiguous.
- A **`CarrierGroup`** is a named set of providers, used as the target of a client
  group's `GROUP` visibility scope.

---

## 2. The modules

Each client group configures four modules, surfaced in the admin UI as four
colour-coded cards:

1. **Assignment** — `allowMarket` / `allowDirect` toggles + a `defaultAssignment`.
   A `forcedCarrierId` pins every order to one provider (direct-only).
2. **Pricing** — `allowMarketPricing` / `allowFixedPricing` toggles + a
   `defaultPricing`.
3. **Collection** — `allowPrepaid` / `allowCOD` toggles, a `defaultCollectionMethod`,
   and an **enforce** switch. When enforced, the order's collection method is
   forced to the group default and the client's choice is ignored
   (`CollectionService.resolveMethod`); otherwise the client's choice wins, falling
   back to the group default, then `ESCROW`. The result is always validated against
   the allow toggles.
4. **Provider visibility** — `visibilityScope`: `ALL` (whole market), `GROUP` (only
   `visibleCarrierGroupId`'s carriers), or `CARRIER` (only `forcedCarrierId`).

### How defaults are applied (order creation)

`OrdersService.resolveSourcing` + `CollectionService.resolveMethod`:

- **Sourcing** — when the client omits the mode, the group's `defaultAssignment`
  is used; with no default, the mode is derived from the allow toggles (direct when
  the market is disabled) so an unspecified mode never lands on a disabled module.
- **Pricing** — `defaultPricing` seeds the client form; fixed pricing is gated by
  `allowFixedPricing`.
- **Collection** — the default/enforcement above.

---

## 3. Provider visibility

`PoliciesService` resolves, from a client's group:

- `visibleCarrierIds(clientId)` — the carriers a client may see/deal with (`null` =
  whole market). A carrier-owned (sub-tenant) client can only ever see its owner.
- `visibleCarriersForClient(clientId)` — the **active** carrier companies for the
  client's DIRECT picker (powers `GET /policies/visible-carriers`).
- `canCarrierServeClient(carrierId, clientId)` — whether a carrier may bid on a
  client's market order.
- `restrictedClientIdsForCarrier(carrierId)` — clients whose market orders are
  hidden from a carrier (filters the carrier's market listing).

These are enforced server-side: the carrier market list excludes restricted
clients, bids are rejected for out-of-scope carriers, and a DIRECT `targetCarrierId`
outside the visible set is rejected at order creation.

---

## 4. API

Module `apps/api/src/modules/policies/`:

| Endpoint | Who | Purpose |
| --- | --- | --- |
| `GET /policies/mine` | any client | The caller's effective policy (its group's, else defaults). |
| `GET /policies/visible-carriers` | any client | The active carriers the client may target for a DIRECT order. |
| `GET/POST/PUT/DELETE /policies/groups` | admin | Client-group CRUD (name, description, full policy, `clientIds`). |
| `POST /policies/assign` | admin | Move a client into a group (or out). |
| `GET/POST/PUT/DELETE /policies/carrier-groups` | admin | Carrier-group CRUD. |

The admin panel and the client new-order form call these; both keep a mock
fallback for offline/design runs. The client form **seeds** its selections from the
group's defaults, **clamps** disallowed selections when the policy loads, and
**locks** the payment step when the collection method is enforced.

---

## 5. Admin UI

**Admin → Policies & Groups** (`apps/web/admin/src/app/(app)/policies/page.tsx`):

- Tabs for **client groups** (`client-policies-panel.tsx`) and **carrier groups**
  (`carrier-groups-panel.tsx`).
- Each client group renders as four colour-coded, icon-led module cards with an
  at-a-glance chip summary (a 🔒 lock on an enforced collection method), per-module
  toggles, and a default selector.
- Create / rename / delete groups; link clients (single-membership); pick a forced
  provider or a visible carrier group.
- Group membership is reflected on the company list (a group-name tag) and the
  company 360° detail header.

---

## 6. Changelog anchors

- v0.9.27 — policies persisted by the API.
- v0.9.6x — dedicated Policies & Groups page; carrier groups; provider visibility
  scope; group tags on companies.
- v0.9.66 — admin-configured per-group module defaults (assignment / pricing /
  collection) + collection enforcement + elegant module-card UX.
- v0.9.67 — client dashboard honours the defaults/enforcement; `visible-carriers`
  endpoint; single-group-membership + sourcing-fallback robustness.

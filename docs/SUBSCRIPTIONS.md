# Subscription Plans

Recurring memberships with **dynamic, component-based pricing**, built on the
Workflow & Policy Engine (see [`POLICIES.md`](POLICIES.md)). A plan wraps a Policy
Profile (its operating ruleset) and adds a price + a set of priced modules; a
company holds one subscription against a plan.

> Payment is **stubbed** for now (the gateway isn't wired). The lifecycle —
> status, cycle, period, renewal date, price snapshot — is modelled so the billing
> layer can be added later without reshaping the data.

```
PlanModule (priced capability)  ─┐
                                 ├─► Plan (profile + price + modules) ─► Subscription (company)
PolicyProfile (operating rules) ─┘
```

---

## 1. Dynamic pricing

A plan's price is built up from components, so enabling a module raises the price
directly:

```
monthlyPrice = isFree ? 0 : basePrice + Σ(included module prices)
yearlyPrice  = monthlyPrice × 12 × (1 − yearlyDiscountPct/100)
```

The admin plan builder shows this live as modules/limits are toggled. The API
returns it on every plan as `price = { monthly, yearly, modulesTotal }`.

`Plan` fields (`apps/api/prisma/schema.prisma`): `isFree`, `basePrice`,
`billingCycle`, `yearlyDiscountPct`, `includedTruckLimit`, `trialDays`,
`sortOrder`, plus the existing `tier`, `audience` (`CLIENT`|`CARRIER`|`BOTH`),
`isDefault`, `active`, `policyGroupId`, `commissionRateOverride`.

## 2. Module catalog

`PlanModule` is an admin-managed catalog of **priced capabilities**. Each module's
`key` is a capability-layer feature flag (e.g. `fleetMaintenance`,
`driverManagement`, `contractedDrivers`), and its `price` adds to any plan that
includes it (`PlanModuleLink`). Seeded provider modules: driver management, fleet
maintenance, contracted drivers, advanced analytics, priority support.

**Capability grant:** when the engine resolves a company's effective policy, the
plan's included module keys are set as feature flags and `includedTruckLimit`
becomes the `maxFleetSize` limit — layered on top of the profile's own features
(`PoliciesService.effectiveForCompany`).

## 3. Subscription lifecycle

`Subscription` (one per company, `SubscriptionsService`):

- **status**: `TRIALING` | `ACTIVE` | `PAST_DUE` | `CANCELLED` | `EXPIRED`.
  A free plan → `ACTIVE` immediately; a paid plan with `trialDays > 0` → `TRIALING`.
- **billingCycle** (`MONTHLY`|`YEARLY`), **priceSnapshot** (locked at subscribe),
  **currentPeriodStart/End**, **trialEndsAt**, **cancelAtPeriodEnd**, **canceledAt**.
- `subscribe(companyId, planId, cycle?)` — create or switch; sets `Company.planId`.
- `cancel(companyId, atPeriodEnd=true)` — flag for period end, or cancel now
  (clears `Company.planId`).
- Admin `assignPlan` delegates here, so `Company.planId` and the `Subscription`
  stay in sync.

## 4. Binding at registration

`POST /auth/register` accepts an optional `planId`. The chosen plan (validated for
the company's audience) or the audience **default** plan is bound and a
subscription is created — non-blocking, so signup never fails on it
(`AuthService.resolveSignupPlan`). The carrier signup wizard shows a plan picker
(cards with the dynamic price, truck limit, trial and modules).

## 5. API

Module `apps/api/src/modules/policies/`:

| Method | Path | Who | Purpose |
| --- | --- | --- | --- |
| `GET` | `/policies/plans/public?audience=` | public | Active plans + computed prices, for the signup picker. |
| `GET` | `/policies/plans` 👮 | admin | Full plan list (with pricing + modules). |
| `POST`/`PUT`/`DELETE` | `/policies/plans[/:id]` 👮 | admin | Plan CRUD (pricing + `moduleIds`). |
| `GET`/`POST`/`PUT`/`DELETE` | `/policies/plan-modules[/:id]` 👮 | admin | Module catalog CRUD. |
| `POST` | `/policies/assign-plan` 👮 | admin | Subscribe/switch a company (or clear). |
| `GET` | `/policies/subscription/mine` 🔒 | any | The caller's subscription + plan. |
| `POST` | `/policies/subscription/subscribe` 🔒 | any | Self-subscribe `{ planId, billingCycle? }`. |
| `POST` | `/policies/subscription/cancel` 🔒 | any | Cancel `{ immediate? }` (default at period end). |
| `GET` | `/policies/subscription/:companyId` 👮 | admin | A company's subscription. |

## 6. Admin UI

**Admin → محرك السياسات والتشغيل**: the **الباقات** tab is a dynamic plan builder
(free toggle, base price, yearly discount, truck limit, trial, module multi-select,
live computed price); the **موديولز الباقات** tab manages the priced catalog.

## 7. Deleting a plan (safe delete)

A plan with subscribers can't be deleted blindly. `DELETE /policies/plans/:id`:

- with subscribers and no option → refuses with `PLAN_HAS_SUBSCRIBERS` + the count;
- `?reassignTo=<planId>` → moves every subscriber to that plan, then deletes;
- `?detach=true` → cancels their subscriptions (they fall back to the default
  policy), then deletes.

The admin plan-delete dialog offers "transfer to …" or "detach". A **policy
profile** backing one or more plans is likewise protected (`GROUP_IN_USE`).

## 8. Bootstrapping an environment

Plans/modules aren't demo data, so they're provisioned by
`pnpm --filter @naqla/api db:ensure-plans` (`apps/api/prisma/ensure-plans.ts`),
which is part of `npm run db:deploy`. It upserts the priced module catalog and
creates the Basic (free, default) + Professional plans **idempotently, without any
demo data** — safe in production — and leaves later admin edits untouched. If no
default carrier plan exists it marks Basic as the default. Edit everything
afterwards from the admin panel.

## 9. Deferred (next)

- **Payment + auto-renewal**: charge the price snapshot, advance periods, dunning
  for `PAST_DUE`, proration on upgrade/downgrade, subscription invoices.
- **Self-service billing page** (carrier/client): upgrade / downgrade / cancel.

## 10. Changelog anchors

- v0.9.80 — subscription plans (dynamic pricing + lifecycle + signup binding).

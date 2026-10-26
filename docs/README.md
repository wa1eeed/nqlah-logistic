# Documentation Index — Naqla Logistics

All project documentation lives here (and a few files at the repo root). It is
written in **English** and maintained to the cadence defined in
[`DOCUMENTATION.md`](DOCUMENTATION.md): short `CHANGELOG` entries per approved
feature, a focused reference per subsystem once it stabilizes, and a final
polish pass before release.

## How we document (read first)

- [`DOCUMENTATION.md`](DOCUMENTATION.md) — the documentation standard and cadence.

## System references

- [`ARCHITECTURE.md`](ARCHITECTURE.md) — system-wide design, modules, order
  lifecycle, escrow.
- [`FLEET.md`](FLEET.md) — trucks & drivers: bidirectional linking, status sync,
  audit log, ID codes, trips.
- [`ORDERS.md`](ORDERS.md) — order types (single vs consolidated), heterogeneous
  legs (per-leg truck type/destination/price), per-leg carriers + per-leg bidding
  + settlement, distribution, and invoices.
- [`POLICIES.md`](POLICIES.md) — the Workflow & Policy Engine: plans → profiles →
  modules + capability layer + commission; sourcing/pricing/collection toggles +
  defaults + enforcement, provider-visibility scope, and carrier groups.
- [`FINANCE.md`](FINANCE.md) — commission + VAT math (`computeOrderFinancials`),
  `commissionAppliesTo`, VAT-inclusive pricing, carrier VAT registration, and
  settlement.
- [`INVOICES.md`](INVOICES.md) — VAT-compliant tax invoices on completion: service
  + commission invoices, the platform as a party, and ZATCA snapshots.
- [`FREELANCERS.md`](FREELANCERS.md) — provider dispatcher: owned vs freelancer
  fleet, per-trip freelancer invoices, and the profitability page.
- [`TRACKING.md`](TRACKING.md) — live shipment tracking: real OSRM road routes,
  the mock realtime (WebSocket-style) channel, and the events timeline.
- [`API.md`](API.md) — API surface.

## Operations

- [`LOCAL_BACKEND.md`](LOCAL_BACKEND.md) — run the API + Postgres + Redis
  locally (needed to wire features to the real backend and verify them).
- [`apps/api/test/e2e/README.md`](../apps/api/test/e2e/README.md) — black-box
  HTTP verification suites (policies & modules, heterogeneous orders, per-leg
  carriers, per-leg bidding); run with `pnpm --filter @naqla/api verify:e2e`.
- [`DEPLOYMENT.md`](DEPLOYMENT.md) — deployment.
- [`MONITORING.md`](MONITORING.md) — monitoring.
- [`SECURITY.md`](SECURITY.md) — security.
- [`KPIs.md`](KPIs.md) — key metrics.

## Root-level docs

- `../README.md` — project overview.
- `../GETTING_STARTED.md` — local setup.
- `../CHANGELOG.md` — chronological change log (newest under `[Unreleased]`).
- `../PENDING_WORK.md` — live backlog and current status.

> Note: the technical references in this `docs/` folder are maintained in English.
> The product is Arabic-first, so `../README.md`, `../CHANGELOG.md` and
> `../CLAUDE_CODE_INSTRUCTIONS.md` are bilingual (Arabic narrative + English
> technical terms); changelog entries from v0.8.0 onward are written in English.

# ADR 0001 — Money as exact Decimal

- **Status:** Accepted (2026-10-25)
- **Context:** Naqla handles real money (escrow hold/release, wallet ledger,
  commission, VAT, freelancer settlements). Monetary values were stored as
  Postgres `double precision` (`Float`) and computed with JavaScript floats and
  `.toFixed(2)`. Binary floating point cannot represent decimal fractions
  exactly, so sums and commission/VAT splits accumulate drift — unacceptable for
  a financial ledger and for the payment-collection modules that build on it.

## Decision

1. **Storage & type.** All monetary columns are `Decimal(12,2)` (Postgres
   `NUMERIC`); `Company.commissionRate` is `Decimal(5,4)` (a 0..1 rate).
   `Decimal(12,2)` holds up to 9,999,999,999.99 — ample for SAR amounts.
   Non-money numerics (weights, volumes, truck dimensions, lat/lng, ratings,
   speed) remain `Float` — they are measurements, not money.

2. **Server arithmetic is exact.** Money is added/subtracted/multiplied with
   `Prisma.Decimal` via helpers in `apps/api/src/common/money/money.ts`:
   - `money(v)` → a `Decimal` (null/undefined → 0),
   - `round2(d)` → 2-dp half-up rounding,
   - `toNum(v)` → `number`, for reporting/KPI math where a float is acceptable.
   Prefer exact `Decimal` math on the **financial path** (wallet balance, notes,
   commission, VAT, settlements). Reporting aggregates (dashboards/KPIs) may use
   `toNum` since they are display figures, not ledger truth.

3. **Transport as `number`, not string.** At the API boundary the global
   `ResponseInterceptor` runs `normalizeDecimals`, deep-converting every
   `Decimal` in a response to a plain `number`. This keeps every response shape
   and every frontend consumer (`<Currency>`, charts) **unchanged**. SAR amounts
   at 2 dp are far inside the IEEE-754 safe-integer range, so the number form is
   lossless in practice for transport and display; exactness is preserved where
   it matters — in storage and server-side computation.

## Consequences

- Reads of money fields are `Prisma.Decimal` in service code; arithmetic must go
  through the helpers (raw `+`/`*` on a `Decimal` is a type error, which guards
  against accidental float math).
- Prisma accepts `number | string | Decimal` when writing a `Decimal` column, so
  DTO inputs (plain numbers from JSON) need no change.
- Future payment-collection modules (wallet deduction, online gateway, COD,
  partial) compute on exact `Decimal`.

## Alternatives considered

- **Integer minor units (halalas).** Exact, but forces a scale/unscale at every
  boundary and a wider frontend change. Rejected for higher blast radius.
- **Decimal strings over the wire.** Most "correct" at transport, but ripples
  through every numeric frontend consumer. Rejected to keep this change
  backend-only; revisitable if amounts ever approach the safe-integer limit.

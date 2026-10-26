# End-to-end verification scripts

Black-box checks that drive the **running API** over HTTP to verify the policy and
consolidated-order features end to end. They complement (do not replace) the Jest
unit suite (`pnpm --filter @naqla/api test`), which mocks Prisma; these exercise
the real HTTP + DB path.

| Script | Covers |
| --- | --- |
| `policies.e2e.mjs` | Per-group collection **enforcement** + defaults, client override, provider-**visibility** scope, `visible-carriers`. |
| `heterogeneous-orders.e2e.mjs` | Consolidated orders with **per-leg** truck type / destination / price; summed pricing; homogeneous back-compat. |
| `per-leg-carriers.e2e.mjs` | A **different carrier per leg**, per-leg financials, per-leg **settlement** on delivery, order rollup. |
| `per-leg-bidding.e2e.mjs` | **Per-leg bidding**: bid on individual legs, truck-type gate, award a leg to a bid, reject-others, rollup. |

## Prerequisites

1. A local API running on `http://localhost:4000` (see [`docs/LOCAL_BACKEND.md`](../../../../docs/LOCAL_BACKEND.md)):
   ```bash
   pnpm --filter @naqla/api start   # or: node apps/api/dist/src/main.js
   ```
2. A seeded database with the demo accounts (`pnpm --filter @naqla/api exec prisma db seed`):
   `admin@naqla.sa` / `client@naqla.sa` / `carrier@naqla.sa` (passwords in
   [`apps/api/prisma/seed.ts`](../../prisma/seed.ts)).
3. For `per-leg-bidding.e2e.mjs` (and the runner), **`DATABASE_URL`** must be set —
   it seeds a second carrier's bid + truck directly via Prisma. Load the API env first:
   ```bash
   set -a && . ./.env && set +a
   ```

Each script creates its own test data and **cancels/deletes it** on the way out.

## Running

```bash
# one suite
node apps/api/test/e2e/policies.e2e.mjs

# everything (needs DATABASE_URL in env)
set -a && . ./.env && set +a
node apps/api/test/e2e/run-all.mjs
```

Override the base URL with `E2E_BASE` (e.g. a staging API):

```bash
E2E_BASE=https://api.nqlah.nx.sa/api node apps/api/test/e2e/policies.e2e.mjs
```

Each script exits `0` on success, non-zero on any failed check.

# Client Policies — Per-Client / Per-Group Configuration

Admins tailor how the platform behaves **per client** (grouped into policy
groups): which distribution, pricing, and payment options the client sees when
creating an order.

---

## 1. Model

`packages/shared-utils/src/mock-data.ts`.

```ts
interface ClientPolicy {
  allowMarket: boolean;        // publish to the open market
  allowDirect: boolean;        // direct-assign to a carrier
  forcedCarrierId?: string;    // lock direct-assign to this carrier (market off)
  allowMarketPricing: boolean; // carriers bid
  allowFixedPricing: boolean;  // client sets a fixed price
  allowPrepaid: boolean;       // Escrow
  allowCOD: boolean;           // cash on delivery
}

interface PolicyGroup { id; name; description?; policy: ClientPolicy; clientIds: string[]; }

policyForClient(clientId, groups?) // → the client's group policy, else DEFAULT_CLIENT_POLICY
```

`DEFAULT_CLIENT_POLICY` enables everything. `POLICY_GROUPS_SEED` ships two example
groups (a contracted/forced-provider group and a market-only group).

## 2. Admin UI

**Admin → Settings → «سياسات العملاء»**
(`apps/web/admin/src/components/settings/client-policies-panel.tsx`, backed by
`stores/policy-store.ts`, Zustand + persist):

- Create / rename / delete **groups**.
- Per group: toggle each policy option (Switch), pick a **forced provider** for
  direct-assign, and **link clients** (a client belongs to at most one group).
- A **default** section lists clients with no group (all options enabled).

## 3. Client form gating

The new-order form (`apps/web/client/.../orders/new/page.tsx`) computes
`policyForClient(CURRENT_CLIENT_ID)` and:

- hides the distribution / pricing / payment options the policy disables;
- pre-selects the only remaining option;
- when `forcedCarrierId` is set, locks the order to direct-assign to that
  provider and shows a notice.

## 4. Backend (v0.9.27)

Policies are now persisted by the API (see `docs/LOCAL_BACKEND.md`), so an admin
change reaches the client's order form — the localStorage-per-origin limitation
is gone.

- Prisma model `PolicyGroup` (the 7 flags + `forcedCarrierId` + `clientIds`),
  migration `add_policy_groups`. A client belongs to at most one group.
- Module `apps/api/src/modules/policies/`:
  `GET /policies/mine` (effective policy for the acting client — its group's,
  else all-enabled defaults); admin-guarded `GET/POST/PUT/DELETE
  /policies/groups` and `POST /policies/assign`.
- The admin panel and the client new-order form call these endpoints; both keep
  a mock fallback for offline/design runs. The client form **clamps** its
  current selections to valid options when the policy loads or changes.

## 5. Demo note

With the backend running, admin edits apply to the client immediately. Without
it, each app falls back to the seeded policy in its own origin (the original
demo behavior).

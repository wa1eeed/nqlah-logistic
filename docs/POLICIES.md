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

## 4. Demo note & future

In demo mode the admin store (localStorage, admin origin) and the client form
read independently, so the client form reflects the **seeded** policy, not live
admin edits. With a real backend the policy is stored server-side and resolved
per request, so admin changes apply to the client immediately. The resolver and
UI are already shaped for that.

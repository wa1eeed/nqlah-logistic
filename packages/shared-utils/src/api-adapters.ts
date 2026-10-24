/**
 * Adapters between the live API response shape (mirroring `Prisma.Order` etc.)
 * and the mock-data shape that the UI was written against. The mock shape is
 * the SoT for components — backend responses are normalized into it so pages
 * don't crash when a field is named differently or returned as a relation.
 *
 * Why a normalizer here (not a backend rename)?
 *   • The Prisma schema is mature and aligns with SQL conventions (e.g.
 *     `weight` not `weightKg`).
 *   • Mock data + a dozen pages already standardized on shorter names.
 *   • A thin frontend adapter is cheaper than refactoring 30+ files.
 */

import type { Order, Bid } from './mock-data';

/**
 * Live API order — a superset/variant of the mock `Order` with Prisma-style
 * field names and embedded relations from `findById()`'s `include` clause.
 * Kept loose (`Partial<...> & Record<...>`) so we accept whatever the
 * backend returns without TS noise.
 */
interface ApiOrder {
  // Prisma-style field names that differ from the mock:
  weight?: number;
  requiredTruckType?: string;
  // Optional relations / aggregations:
  _count?: { bids?: number };
  bids?: Bid[];
  // Pass-through fields (same name in mock + API):
  [key: string]: unknown;
}

/**
 * Maps a single live API order into the mock Order shape. Idempotent — if you
 * pass it an already-normalized object, the aliased keys are simply re-set.
 *
 * Also normalizes the embedded `bids` relation (Prisma field `amount` →
 * mock `price`) so the bid comparison UI doesn't need to know whether the
 * data came from API or mock.
 *
 * Returns `null` (not undefined) for falsy input so the caller can write
 * `normalizeOrder(data) ?? fallback` without an extra guard.
 */
export function normalizeOrder(input: ApiOrder | Order | null | undefined): Order | null {
  if (!input) return null;
  const o = input as ApiOrder & Partial<Order>;
  const bids = Array.isArray(o.bids)
    ? (o.bids as unknown[]).map((b) => normalizeBid(b as Record<string, unknown>))
    : undefined;
  return {
    ...(o as object),
    weightKg: (o.weight ?? o.weightKg ?? 0) as number,
    truckType: (o.requiredTruckType ?? o.truckType ?? '') as string,
    bidCount: (o._count?.bids ?? o.bidCount ?? (Array.isArray(o.bids) ? o.bids.length : 0)) as number,
    ...(bids ? { bids } : {}),
  } as Order;
}

/**
 * Maps an API Bid (Prisma shape: `amount`, etc.) into the mock Bid shape
 * (`price`). Other field names already align between API + mock.
 */
export function normalizeBid<T extends Record<string, unknown>>(input: T): T & { price: number; amount: number } {
  const b = input as Record<string, unknown>;
  const amount = (b.amount as number | undefined) ?? (b.price as number | undefined) ?? 0;
  return {
    ...b,
    price: amount,
    amount,
  } as T & { price: number; amount: number };
}

/**
 * Maps a list-API response into an array of normalized orders. Handles all
 * the response wrappers the API returns:
 *   • plain array `[...]`
 *   • paginated `{ items: [...], total }`
 *   • envelope `{ success, data: [...] }` (the SWR fetcher unwraps this layer
 *     already, but we accept it here for safety)
 */
export function normalizeOrderList(input: unknown): Order[] {
  if (!input) return [];
  const arr = Array.isArray(input)
    ? input
    : Array.isArray((input as { items?: unknown[] }).items)
      ? (input as { items: unknown[] }).items
      : Array.isArray((input as { data?: unknown[] }).data)
        ? (input as { data: unknown[] }).data
        : [];
  return (arr as ApiOrder[])
    .map((o) => normalizeOrder(o))
    .filter((o): o is Order => o !== null);
}

/**
 * Unwrap whatever envelope the list endpoint chose (plain array, `{items}`,
 * or `{data}`). Used by the truck + payment normalizers (same wrappers).
 */
function unwrapList(input: unknown): unknown[] {
  if (!input) return [];
  if (Array.isArray(input)) return input;
  const items = (input as { items?: unknown[] }).items;
  if (Array.isArray(items)) return items;
  const data = (input as { data?: unknown[] }).data;
  if (Array.isArray(data)) return data;
  return [];
}

/**
 * Maps an API Truck (Prisma fields: `type` / `capacity` / `year`) into the
 * mock Truck shape used by the carrier fleet UI (`truckType` / `capacityKg` /
 * `modelYear`). Capacity unit: backend stores tons in `capacity`, but the
 * mock + UI assume kg via `capacityKg`. We compute both so the UI works
 * regardless of which field it reads.
 *
 * Idempotent — re-running on an already-normalized object keeps the mock keys.
 */
export function normalizeTruck<T extends object>(input: T | null | undefined): T | null {
  if (!input) return null;
  const t = input as Record<string, unknown>;
  // API stores capacity in tons (carrier form value × 1). Mock uses kg.
  const capacityTons = (t.capacity as number | undefined)
    ?? ((t.capacityKg as number | undefined) ? ((t.capacityKg as number) / 1000) : undefined);
  const capacityKg = (t.capacityKg as number | undefined)
    ?? ((t.capacity as number | undefined) != null ? ((t.capacity as number) * 1000) : 0);
  const id = String(t.id ?? '');
  return {
    ...t,
    truckType: (t.truckType as string | undefined) ?? (t.type as string | undefined) ?? '',
    capacityKg,
    capacity: capacityTons ?? 0,
    modelYear: (t.modelYear as number | undefined) ?? (t.year as number | undefined) ?? 0,
    // Computed fields used by the table — preserve mock defaults when API omits.
    status: (t.status as string | undefined) ?? 'AVAILABLE',
    // Short human code (mock has it; API doesn't) — derive from the id tail.
    code: (t.code as string | undefined) ?? (id ? `TRK-${id.slice(-5).toUpperCase()}` : ''),
    // Ownership: provider's own fleet vs freelancer. Default OWNED.
    ownership: (t.ownership as string | undefined) ?? 'OWNED',
    // Driver link: API uses currentDriverId; mock uses assignedDriverId.
    assignedDriverId: (t.assignedDriverId as string | undefined) ?? (t.currentDriverId as string | undefined) ?? null,
  } as unknown as T;
}

export function normalizeTruckList<T extends object>(input: unknown): T[] {
  return unwrapList(input)
    .map((t) => normalizeTruck(t as T))
    .filter((t): t is T => t !== null);
}

/**
 * Normalize an API DriverProfile to the shape the fleet UI expects (mock
 * `Driver`): `fullName` (from the related user), `code`, `licenseClass`
 * (= licenseType), `ownership`, `status`, `totalTrips`. Idempotent.
 */
export function normalizeDriver<T extends object>(input: T | null | undefined): T | null {
  if (!input) return null;
  const d = input as Record<string, unknown>;
  const user = (d.user as Record<string, unknown> | undefined) ?? undefined;
  const userName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  const fullName = (d.fullName as string | undefined) || userName || '';
  const id = String(d.id ?? '');
  return {
    ...d,
    fullName,
    code: (d.code as string | undefined) ?? (id ? `DRV-${id.slice(-5).toUpperCase()}` : ''),
    licenseClass: (d.licenseClass as string | undefined) ?? (d.licenseType as string | undefined) ?? '',
    nationalId: (d.nationalId as string | undefined) ?? (user?.nationalId as string | undefined) ?? '',
    phone: (d.phone as string | undefined) ?? (user?.phone as string | undefined) ?? '',
    ownership: (d.ownership as string | undefined) ?? 'OWNED',
    status: (d.status as string | undefined) ?? 'AVAILABLE',
    totalTrips: (d.totalTrips as number | undefined) ?? 0,
  } as unknown as T;
}

export function normalizeDriverList<T extends object>(input: unknown): T[] {
  return unwrapList(input)
    .map((d) => normalizeDriver(d as T))
    .filter((d): d is T => d !== null);
}

/**
 * Maps an API Payment (Prisma fields: `status` / `totalAmount` /
 * `commissionAmount` / `carrierAmount`) into the mock Payment shape (`state`
 * / `amount` / `commission` / `vat`). API has no VAT field — we default to 0
 * to prevent `NaN` in `.toLocaleString()` math downstream.
 */
export function normalizePayment<T extends object>(input: T | null | undefined): T | null {
  if (!input) return null;
  const p = input as Record<string, unknown>;
  const amount = (p.amount as number | undefined) ?? (p.totalAmount as number | undefined) ?? 0;
  const commission =
    (p.commission as number | undefined) ?? (p.commissionAmount as number | undefined) ?? 0;
  return {
    ...p,
    state: (p.state as string | undefined) ?? (p.status as string | undefined) ?? 'PENDING',
    amount,
    totalAmount: amount,
    commission,
    commissionAmount: commission,
    vat: (p.vat as number | undefined) ?? 0,
    carrierAmount:
      (p.carrierAmount as number | undefined) ?? (amount - commission),
    paidAt: p.paidAt ?? p.heldAt ?? p.createdAt ?? null,
  } as unknown as T;
}

export function normalizePaymentList<T extends object>(input: unknown): T[] {
  return unwrapList(input)
    .map((p) => normalizePayment(p as T))
    .filter((p): p is T => p !== null);
}

/**
 * Maps an API Company (Prisma fields: `type`, `createdAt`, `kycStatus` with the
 * API's `PENDING` value, plus a `_count` of trucks/users) into the mock
 * `Company` shape the admin UI was written against (`kind`, `joinedAt`,
 * `kycStatus` with `PENDING_VERIFICATION`, `fleetSize`). Carrier performance
 * fields (rating / completedTrips / responseTimeMins / insurance / monthlyVolume)
 * don't exist on the DB Company and stay undefined — the UI must guard them.
 *
 * Idempotent — an already-mock-shaped company (has `kind`) passes through.
 */
export function normalizeCompany<T extends object>(input: T | null | undefined): T | null {
  if (!input) return null;
  const c = input as Record<string, unknown>;
  const rawKyc = (c.kycStatus as string | undefined) ?? 'NOT_SUBMITTED';
  // The API enum uses PENDING; the mock/UI + StatusBadge use PENDING_VERIFICATION.
  const kycStatus = rawKyc === 'PENDING' ? 'PENDING_VERIFICATION' : rawKyc;
  const count = (c._count as { trucks?: number; users?: number } | undefined) ?? undefined;
  return {
    ...c,
    kind: (c.kind as string | undefined) ?? (c.type as string | undefined) ?? 'CLIENT',
    joinedAt: (c.joinedAt as string | undefined) ?? (c.createdAt as string | undefined) ?? '',
    kycStatus,
    accountType: (c.accountType as string | undefined) ?? 'COMPANY',
    nameEn: (c.nameEn as string | undefined) ?? '',
    crNumber: (c.crNumber as string | undefined) ?? '',
    vatNumber: (c.vatNumber as string | undefined) ?? '',
    // Fleet size: the API exposes it only via findById's `_count.trucks`.
    fleetSize: (c.fleetSize as number | undefined) ?? count?.trucks,
  } as unknown as T;
}

export function normalizeCompanyList<T extends object>(input: unknown): T[] {
  return unwrapList(input)
    .map((c) => normalizeCompany(c as T))
    .filter((c): c is T => c !== null);
}

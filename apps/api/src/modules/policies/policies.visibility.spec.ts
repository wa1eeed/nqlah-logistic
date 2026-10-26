import { PoliciesService } from './policies.service';

/**
 * Unit tests for provider-visibility resolution. A client group's
 * visibilityScope limits which carriers can see/bid on its orders:
 *   ALL → everyone; CARRIER → only forcedCarrierId; GROUP → the carrier group.
 */
function makeService(opts: {
  groups?: Record<string, unknown>[];
  carrierGroups?: Record<string, unknown>[];
}) {
  const groups = opts.groups ?? [];
  const carrierGroups = opts.carrierGroups ?? [];
  const prisma = {
    company: { findUnique: jest.fn(async () => ({ ownerCarrierId: null })) },
    policyGroup: {
      findFirst: jest.fn(async ({ where }: { where: { clientIds: { has: string } } }) =>
        groups.find((g) => (g.clientIds as string[]).includes(where.clientIds.has)) ?? null),
      findMany: jest.fn(async () => groups.filter((g) => g.visibilityScope !== 'ALL')),
    },
    carrierGroup: {
      findUnique: jest.fn(async ({ where }: { where: { id: string } }) =>
        carrierGroups.find((c) => c.id === where.id) ?? null),
      findMany: jest.fn(async ({ where }: { where: { id: { in: string[] } } }) =>
        carrierGroups.filter((c) => where.id.in.includes(c.id as string))),
    },
  };
  return new PoliciesService(prisma as never, {} as never);
}

describe('PoliciesService provider visibility', () => {
  it('returns null (whole market) for an ungrouped client', async () => {
    const svc = makeService({});
    await expect(svc.visibleCarrierIds('client-x')).resolves.toBeNull();
  });

  it('CARRIER scope exposes only the forced carrier', async () => {
    const svc = makeService({
      groups: [{ clientIds: ['c1'], visibilityScope: 'CARRIER', forcedCarrierId: 'car-1', visibleCarrierGroupId: null }],
    });
    await expect(svc.visibleCarrierIds('c1')).resolves.toEqual(['car-1']);
    await expect(svc.canCarrierServeClient('car-1', 'c1')).resolves.toBe(true);
    await expect(svc.canCarrierServeClient('car-2', 'c1')).resolves.toBe(false);
  });

  it('GROUP scope exposes the carriers in the visible carrier group', async () => {
    const svc = makeService({
      groups: [{ clientIds: ['c1'], visibilityScope: 'GROUP', forcedCarrierId: null, visibleCarrierGroupId: 'cg-1' }],
      carrierGroups: [{ id: 'cg-1', carrierIds: ['car-7', 'car-8'] }],
    });
    await expect(svc.visibleCarrierIds('c1')).resolves.toEqual(['car-7', 'car-8']);
    await expect(svc.canCarrierServeClient('car-7', 'c1')).resolves.toBe(true);
    await expect(svc.canCarrierServeClient('car-9', 'c1')).resolves.toBe(false);
  });

  it('lists restricted clients for a carrier outside the allowed set', async () => {
    const svc = makeService({
      groups: [
        { clientIds: ['c1', 'c2'], visibilityScope: 'CARRIER', forcedCarrierId: 'car-1', visibleCarrierGroupId: null },
        { clientIds: ['c3'], visibilityScope: 'GROUP', forcedCarrierId: null, visibleCarrierGroupId: 'cg-1' },
      ],
      carrierGroups: [{ id: 'cg-1', carrierIds: ['car-2'] }],
    });
    // car-2 is allowed by the GROUP (c3) but not the CARRIER group (c1,c2).
    await expect(svc.restrictedClientIdsForCarrier('car-2')).resolves.toEqual(['c1', 'c2']);
    // car-1 is allowed by the CARRIER group but not the GROUP (c3).
    await expect(svc.restrictedClientIdsForCarrier('car-1')).resolves.toEqual(['c3']);
  });
});

import { PoliciesService } from './policies.service';

/**
 * Sub-tenancy: a carrier-owned client's effective policy is forced to its owner
 * (direct-only, off-market), and only the owner is a visible carrier for it.
 */
function makeService(ownerByClient: Record<string, string | null>) {
  const prisma = {
    company: {
      findUnique: jest.fn(async ({ where }: { where: { id: string } }) =>
        where.id in ownerByClient ? { ownerCarrierId: ownerByClient[where.id] } : null),
    },
    policyGroup: { findFirst: jest.fn(async () => null) },
  };
  return new PoliciesService(prisma as never, {} as never);
}

describe('PoliciesService sub-tenancy (owned clients)', () => {
  it('forces an owned client to its owner, off-market', async () => {
    const svc = makeService({ 'owned-1': 'carrier-9' });
    const p = await svc.effectiveForCompany('owned-1');
    expect(p.forcedCarrierId).toBe('carrier-9');
    expect(p.allowMarket).toBe(false);
    expect(p.visibilityScope).toBe('CARRIER');
  });

  it('exposes only the owner as a visible carrier for an owned client', async () => {
    const svc = makeService({ 'owned-1': 'carrier-9' });
    await expect(svc.visibleCarrierIds('owned-1')).resolves.toEqual(['carrier-9']);
    await expect(svc.canCarrierServeClient('carrier-9', 'owned-1')).resolves.toBe(true);
    await expect(svc.canCarrierServeClient('carrier-5', 'owned-1')).resolves.toBe(false);
  });

  it('leaves a normal (unowned) client on the open market', async () => {
    const svc = makeService({ 'plain-1': null });
    const p = await svc.effectiveForCompany('plain-1');
    expect(p.allowMarket).toBe(true);
    expect(p.forcedCarrierId).toBeUndefined();
    await expect(svc.visibleCarrierIds('plain-1')).resolves.toBeNull();
  });
});

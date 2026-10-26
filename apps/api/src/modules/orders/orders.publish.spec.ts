import { OrdersService } from './orders.service';

/**
 * Regression: publishing a DIRECT order that already has an upfront price
 * auto-assigns it AND must open the collection (escrow/prepaid/COD) — the same
 * as assign()/bid-accept. A live e2e caught that this branch previously skipped
 * collection.initiate, leaving such orders with no Payment.
 */
function makeService(order: Record<string, unknown>) {
  const assigned = { ...order, status: 'ASSIGNED', carrierId: order.targetCarrierId };
  const tx = { order: { update: jest.fn(async () => assigned) } };
  const prisma = {
    order: { findUnique: jest.fn(async () => order) },
    $transaction: jest.fn(async (cb: (t: typeof tx) => unknown) => cb(tx)),
  };
  const policies = { effectiveForCompany: jest.fn(async () => ({ allowMarket: true, allowDirect: true })) };
  const collection = { initiate: jest.fn(async () => ({})) };
  const svc = new OrdersService(prisma as never, {} as never, policies as never, collection as never, {} as never);
  return { svc, prisma, collection, tx };
}

describe('OrdersService.publish — DIRECT upfront', () => {
  const base = { id: 'o1', clientId: 'cl1', status: 'DRAFT', mode: 'DIRECT', agreedPrice: 4000, targetCarrierId: 'car1' };

  it('auto-assigns and opens the collection on publish', async () => {
    const { svc, collection, tx } = makeService(base);
    const res = await svc.publish('o1', { companyId: 'cl1', role: 'CLIENT_ADMIN', id: 'u1' } as never);
    expect(tx.order.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'ASSIGNED', carrierId: 'car1' }) }));
    expect(collection.initiate).toHaveBeenCalledTimes(1);
    expect((res as { status: string }).status).toBe('ASSIGNED');
  });
});

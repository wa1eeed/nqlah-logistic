// Per-leg open-market bidding (phase 2b): carriers bid on individual legs, the
// client/admin awards a leg to a bid. Uses Prisma to seed a second carrier's bid
// and a matching truck (so DATABASE_URL must be set — see README.md).
import { j, unwrap, listOf, context, getPrisma, checker } from './_helpers.mjs';

export async function run(ctx) {
  const { ok, note, done } = checker('Per-leg open-market bidding');
  const prisma = getPrisma();
  try {
    const { admin, client, carrier: carrierA } = ctx ?? (await context());
    ok('logins', !!admin && !!client.token && !!carrierA.token);
    const A = carrierA.user.companyId;
    const B = (await prisma.company.findFirst({ where: { type: 'CARRIER', id: { not: A } }, select: { id: true } })).id;
    // Ensure carrier B owns a LARGE_FLATBED truck so it can bid on leg 1.
    if (!(await prisma.truck.findFirst({ where: { companyId: B, type: 'LARGE_FLATBED' } }))) {
      await prisma.truck.create({ data: { companyId: B, plateNumber: 'E2E-' + Math.random().toString(36).slice(2, 8).toUpperCase(), type: 'LARGE_FLATBED', capacity: 20, isActive: true } });
    }

    const order = unwrap((await j('POST', '/orders', client.token, {
      cargoType: 'GENERAL', cargoDescription: 'e2e per-leg bidding', weight: 4000,
      mode: 'OPEN', orderType: 'CONSOLIDATED',
      originCity: 'الرياض', originRegion: 'الرياض', originAddress: 'w',
      destinationCity: 'جدة', destinationRegion: 'مكة المكرمة', destinationAddress: 'p',
      requiredTruckType: 'LARGE_FLATBED', pickupDate: new Date(Date.now() + 2 * 86400000).toISOString(),
      legs: [
        { requiredTruckType: 'LARGE_FLATBED', destinationCity: 'جدة', destinationRegion: 'مكة المكرمة', destinationAddress: 'a', price: 5000 },
        { requiredTruckType: 'REFRIGERATED', destinationCity: 'الدمام', destinationRegion: 'الشرقية', destinationAddress: 'b', price: 7000 },
        { requiredTruckType: 'TANKER', destinationCity: 'أبها', destinationRegion: 'عسير', destinationAddress: 'c', price: 4000 },
      ],
    })).data);
    await j('POST', `/orders/${order.id}/publish`, client.token);
    ok('heterogeneous OPEN order published (3 legs)', order?.truckCount === 3);

    const b1 = await j('POST', `/orders/${order.id}/bids`, carrierA.token, { legIndex: 1, amount: 4800 });
    const b2 = await j('POST', `/orders/${order.id}/bids`, carrierA.token, { legIndex: 2, amount: 6500 });
    ok('A bids on leg 1 + leg 2 (two legs of one order)', b1.status < 400 && b2.status < 400);
    const b3 = await j('POST', `/orders/${order.id}/bids`, carrierA.token, { legIndex: 3, amount: 3900 });
    ok('A cannot bid on a leg type it lacks (TANKER)', b3.status >= 400 && JSON.stringify(b3.data).includes('NO_MATCHING_TRUCK'));

    const leg1 = await prisma.orderLeg.findUnique({ where: { orderId_sequence: { orderId: order.id, sequence: 1 } }, select: { id: true } });
    await prisma.bid.create({ data: { orderId: order.id, orderLegId: leg1.id, carrierId: B, amount: 4600, status: 'PENDING' } });

    const l1 = listOf((await j('GET', `/orders/${order.id}/bids?legIndex=1`, admin)).data);
    ok('leg 1 has 2 bids (A + B)', l1.length === 2, String(l1.length));
    ok('order-level bid list excludes leg bids', listOf((await j('GET', `/orders/${order.id}/bids`, admin)).data).length === 0);

    const aBid = l1.find((b) => b.carrierId === A);
    await j('POST', `/orders/${order.id}/bids/${aBid.id}/accept`, admin);
    const legs = unwrap((await j('GET', `/orders/${order.id}/legs`, admin)).data);
    ok('leg 1 awarded to A @ 4800 (carrierAmount 5078.4, VAT-aware)',
      legs.legs[0].carrierId === A && legs.legs[0].price === 4800 && legs.legs[0].carrierAmount === 5078.4 && legs.legs[0].status === 'ASSIGNED', JSON.stringify(legs.legs[0]));
    const bBid = await prisma.bid.findFirst({ where: { orderLegId: leg1.id, carrierId: B } });
    ok("B's losing leg-1 bid was rejected", bBid?.status === 'REJECTED', bBid?.status);

    const rebid = await j('POST', `/orders/${order.id}/bids`, carrierA.token, { legIndex: 1, amount: 4000 });
    ok('cannot bid on an already-assigned leg', rebid.status >= 400 && JSON.stringify(rebid.data).includes('LEG_ALREADY_ASSIGNED'));

    const l2 = listOf((await j('GET', `/orders/${order.id}/bids?legIndex=2`, admin)).data);
    await j('POST', `/orders/${order.id}/bids/${l2[0].id}/accept`, admin);
    await j('POST', `/orders/${order.id}/legs/3/assign-carrier`, admin, { carrierId: A });
    const final = unwrap((await j('GET', `/orders/${order.id}`, admin)).data);
    ok('order ASSIGNED once every leg has a carrier', final?.status === 'ASSIGNED', final?.status);

    await j('POST', `/orders/${order.id}/cancel`, admin, { reason: 'e2e' });
    note('done');
    return done();
  } finally {
    await prisma.$disconnect();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) run().then((ok) => process.exit(ok ? 0 : 1)).catch((e) => { console.error(e); process.exit(2); });

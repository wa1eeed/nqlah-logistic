// Per-leg carriers (phase 2a): a different carrier per leg, per-leg financials,
// per-leg settlement on delivery, and order rollup. Wallet read via the admin API.
import { j, unwrap, listOf, context, checker } from './_helpers.mjs';

export async function run(ctx) {
  const { ok, note, done } = checker('Per-leg carriers + settlement');
  {
    const { admin, client } = ctx ?? (await context());
    ok('logins', !!admin && !!client.token);
    const carriers = listOf((await j('GET', '/companies?type=CARRIER&limit=100', admin)).data);
    const A = carriers[0]; const B = carriers.find((c) => c.id !== A.id);
    ok('two carriers available', !!A && !!B);

    const wallet = async (cid) => Number(unwrap((await j('GET', `/admin/companies/${cid}/statement`, admin)).data)?.walletBalance ?? 0);
    const aBefore = await wallet(A.id);

    const order = unwrap((await j('POST', '/orders', client.token, {
      cargoType: 'GENERAL', cargoDescription: 'e2e per-leg carriers', weight: 4000,
      mode: 'DIRECT', orderType: 'CONSOLIDATED',
      originCity: 'الرياض', originRegion: 'الرياض', originAddress: 'w',
      destinationCity: 'جدة', destinationRegion: 'مكة المكرمة', destinationAddress: 'p',
      requiredTruckType: 'LARGE_FLATBED', pickupDate: new Date(Date.now() + 2 * 86400000).toISOString(),
      legs: [
        { requiredTruckType: 'LARGE_FLATBED', destinationCity: 'جدة', destinationRegion: 'مكة المكرمة', destinationAddress: 'a', price: 5000 },
        { requiredTruckType: 'REFRIGERATED', destinationCity: 'الدمام', destinationRegion: 'الشرقية', destinationAddress: 'b', price: 7000 },
      ],
    })).data);
    ok('heterogeneous order created (2 legs)', order?.truckCount === 2);

    await j('POST', `/orders/${order.id}/legs/1/assign-carrier`, admin, { carrierId: A.id });
    const afterAssign = unwrap((await j('POST', `/orders/${order.id}/legs/2/assign-carrier`, admin, { carrierId: B.id })).data);
    // Carrier amounts are VAT-aware: price 5000 → serviceTotal 5750 − commissionTotal 460 = 5290; 7000 → 8050 − 644 = 7406.
    const L = afterAssign?.legs || [];
    ok('leg 1 → A ASSIGNED, carrierAmount 5290', L[0]?.carrierId === A.id && L[0]?.status === 'ASSIGNED' && L[0]?.carrierAmount === 5290, JSON.stringify(L[0]));
    ok('leg 2 → B ASSIGNED, carrierAmount 7406', L[1]?.carrierId === B.id && L[1]?.status === 'ASSIGNED' && L[1]?.carrierAmount === 7406, JSON.stringify(L[1]));
    ok('legs carry carrier names', !!L[0]?.carrierName && !!L[1]?.carrierName);

    const assigned = unwrap((await j('GET', `/orders/${order.id}`, admin)).data);
    ok('order ASSIGNED after both legs assigned', assigned?.status === 'ASSIGNED', assigned?.status);

    await j('PATCH', `/orders/${order.id}/legs/1/status`, admin, { status: 'IN_TRANSIT' });
    const afterL1 = unwrap((await j('PATCH', `/orders/${order.id}/legs/1/status`, admin, { status: 'DELIVERED' })).data);
    ok('leg 1 DELIVERED, leg 2 ASSIGNED', afterL1?.legs?.[0]?.status === 'DELIVERED' && afterL1?.legs?.[1]?.status === 'ASSIGNED');
    const aAfter = await wallet(A.id);
    ok('carrier A credited its leg payout (+5290)', Math.round((aAfter - aBefore) * 100) / 100 === 5290, `${aBefore}→${aAfter}`);
    await j('PATCH', `/orders/${order.id}/legs/1/status`, admin, { status: 'DELIVERED' });
    ok('re-delivering leg 1 does not double-pay', (await wallet(A.id)) === aAfter);

    const partial = unwrap((await j('GET', `/orders/${order.id}`, admin)).data);
    ok('order IN_TRANSIT with one leg delivered', partial?.status === 'IN_TRANSIT', partial?.status);
    await j('PATCH', `/orders/${order.id}/legs/2/status`, admin, { status: 'DELIVERED' });
    const final = unwrap((await j('GET', `/orders/${order.id}`, admin)).data);
    ok('order DELIVERED after all legs delivered', final?.status === 'DELIVERED', final?.status);

    const reassign = await j('POST', `/orders/${order.id}/legs/1/assign-carrier`, admin, { carrierId: B.id });
    ok('cannot reassign a leg in progress/delivered', reassign.status >= 400);

    await j('POST', `/orders/${order.id}/cancel`, admin, { reason: 'e2e' });
    note('done');
    return done();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) run().then((ok) => process.exit(ok ? 0 : 1)).catch((e) => { console.error(e); process.exit(2); });

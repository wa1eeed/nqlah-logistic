// Finance & tax (phase 2a): dynamic commission + VAT on order financials.
// Uses Prisma to toggle the carrier's VAT registration and read it back.
import { j, unwrap, listOf, context, getPrisma, checker } from './_helpers.mjs';

export async function run(ctx) {
  const { ok, note, done } = checker('Finance & tax — commission + VAT');
  const prisma = getPrisma();
  try {
    const { admin, client, carrier } = ctx ?? (await context());
    const clientId = client.user.companyId;
    const carrierId = carrier.user.companyId;
    ok('logins', !!admin && !!client.token && !!carrier.token);

    // Ensure the carrier is VAT-registered for the first case.
    await prisma.company.update({ where: { id: carrierId }, data: { vatRegistered: true } });

    // Client profile + plan: commission 6%, on CARRIER, price VAT-exclusive.
    const profile = unwrap((await j('POST', '/policies/groups', admin, { name: '[e2e] finance profile' })).data);
    await j('PUT', `/policies/groups/${profile.id}`, admin, {
      policy: {
        allowMarket: true, allowDirect: true, allowMarketPricing: true, allowFixedPricing: true,
        allowPrepaid: true, allowCOD: true,
        commissionRate: 0.06, commissionAppliesTo: 'CARRIER', priceVatInclusive: false,
      },
    });
    const plan = unwrap((await j('POST', '/policies/plans', admin, { name: 'finance plan', audience: 'CLIENT', policyGroupId: profile.id })).data);
    await j('POST', '/policies/assign-plan', admin, { companyId: clientId, planId: plan.id });

    const base = {
      cargoType: 'GENERAL', cargoDescription: 'e2e finance', weight: 1000,
      mode: 'DIRECT', targetCarrierId: carrierId, agreedPriceUpfront: 10000,
      originCity: 'الرياض', originRegion: 'الرياض', originAddress: 'a',
      destinationCity: 'جدة', destinationRegion: 'مكة المكرمة', destinationAddress: 'b',
      requiredTruckType: 'LARGE_FLATBED', pickupDate: new Date(Date.now() + 86400000).toISOString(),
    };

    // Case 1: VAT-exclusive, commission on carrier, carrier registered, 6%.
    const o1 = unwrap((await j('POST', '/orders', client.token, base)).data);
    const f1 = unwrap((await j('GET', `/orders/${o1.id}`, admin)).data);
    ok('VAT-exclusive @6%: agreedPrice 10000, commission 600',
      Number(f1.agreedPrice) === 10000 && Number(f1.commissionAmount) === 600, `comm=${f1.commissionAmount}`);
    ok('service VAT 1500, commission VAT 90', Number(f1.serviceVatAmount) === 1500 && Number(f1.commissionVatAmount) === 90, `svat=${f1.serviceVatAmount} cvat=${f1.commissionVatAmount}`);
    ok('carrierAmount 10810 (11500 - 690)', Number(f1.carrierAmount) === 10810, String(f1.carrierAmount));
    ok('clientTotalDue 11500 (service total)', Number(f1.clientTotalDue) === 11500, String(f1.clientTotalDue));

    // Case 2: carrier NOT VAT-registered → service VAT 0.
    await prisma.company.update({ where: { id: carrierId }, data: { vatRegistered: false } });
    const o2 = unwrap((await j('POST', '/orders', client.token, base)).data);
    const f2 = unwrap((await j('GET', `/orders/${o2.id}`, admin)).data);
    ok('carrier not registered → service VAT 0, clientTotalDue 10000', Number(f2.serviceVatAmount) === 0 && Number(f2.clientTotalDue) === 10000, `svat=${f2.serviceVatAmount} due=${f2.clientTotalDue}`);
    ok('commission still has its own VAT (comm 600, cVat 90)', Number(f2.commissionAmount) === 600 && Number(f2.commissionVatAmount) === 90, `comm=${f2.commissionAmount} cvat=${f2.commissionVatAmount}`);
    ok('carrierAmount 9310 (10000 - 690)', Number(f2.carrierAmount) === 9310, String(f2.carrierAmount));

    // Case 3: commission on CLIENT adds the commission total to clientTotalDue.
    await prisma.company.update({ where: { id: carrierId }, data: { vatRegistered: true } });
    await j('PUT', `/policies/groups/${profile.id}`, admin, {
      policy: { allowMarket: true, allowDirect: true, allowMarketPricing: true, allowFixedPricing: true, allowPrepaid: true, allowCOD: true, commissionRate: 0.06, commissionAppliesTo: 'CLIENT', priceVatInclusive: false },
    });
    const o3 = unwrap((await j('POST', '/orders', client.token, base)).data);
    const f3 = unwrap((await j('GET', `/orders/${o3.id}`, admin)).data);
    ok('commission on CLIENT: carrierAmount 11500, clientTotalDue 12190',
      Number(f3.carrierAmount) === 11500 && Number(f3.clientTotalDue) === 12190, `carrier=${f3.carrierAmount} due=${f3.clientTotalDue}`);

    // Cleanup.
    for (const id of [o1.id, o2.id, o3.id]) await j('POST', `/orders/${id}/cancel`, client.token, { reason: 'e2e' });
    await j('POST', '/policies/assign-plan', admin, { companyId: clientId, planId: null });
    await j('DELETE', `/policies/plans/${plan.id}`, admin);
    await j('DELETE', `/policies/groups/${profile.id}`, admin);
    note('cleaned up');
    return done();
  } finally {
    await prisma.$disconnect();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) run().then((ok) => process.exit(ok ? 0 : 1)).catch((e) => { console.error(e); process.exit(2); });

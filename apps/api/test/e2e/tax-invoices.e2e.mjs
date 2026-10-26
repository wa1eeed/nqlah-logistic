// Tax invoices (phase 2b): completing an order generates VAT-compliant tax
// invoices — a carrier SERVICE invoice (→ client) and a platform COMMISSION
// invoice (→ bearer). Verifies amounts, party snapshots, and the BOTH split.
import { j, unwrap, listOf, context, getPrisma, checker } from './_helpers.mjs';

// Drive a DIRECT pre-priced order from creation to COMPLETED.
async function completeOrder(ctx, price) {
  const { admin, client, carrier } = ctx;
  const carrierId = carrier.user.companyId;
  const o = unwrap((await j('POST', '/orders', client.token, {
    cargoType: 'GENERAL', cargoDescription: 'e2e tax invoice', weight: 1000,
    mode: 'DIRECT', targetCarrierId: carrierId, agreedPriceUpfront: price,
    originCity: 'الرياض', originRegion: 'الرياض', originAddress: 'a',
    destinationCity: 'جدة', destinationRegion: 'مكة المكرمة', destinationAddress: 'b',
    requiredTruckType: 'LARGE_FLATBED', pickupDate: new Date(Date.now() + 86400000).toISOString(),
  })).data);
  const cur = unwrap((await j('GET', `/orders/${o.id}`, admin)).data);
  if (cur.status === 'DRAFT') await j('POST', `/orders/${o.id}/publish`, client.token);
  await j('POST', `/orders/${o.id}/confirm`, carrier.token);   // ASSIGNED → CONFIRMED
  await j('POST', `/orders/${o.id}/deliver`, carrier.token);   // CONFIRMED → DELIVERED
  await j('POST', `/orders/${o.id}/complete`, client.token);   // DELIVERED → COMPLETED (+ invoices)
  return o;
}

const invoicesFor = async (admin, orderId) =>
  listOf((await j('GET', '/invoices?limit=100', admin)).data).filter((x) => x.orderId === orderId);

export async function run(ctx) {
  const { ok, note, done } = checker('Tax invoices — service + commission');
  const prisma = getPrisma();
  try {
    const c = ctx ?? (await context());
    const { admin, client, carrier } = c;
    const clientId = client.user.companyId;
    const carrierId = carrier.user.companyId;
    ok('logins', !!admin && !!client.token && !!carrier.token);

    // Deterministic policy: carrier VAT-registered, 8% on CARRIER, exclusive.
    await prisma.company.update({ where: { id: carrierId }, data: { vatRegistered: true, commissionRate: 0.08 } });
    await j('POST', '/policies/assign-plan', admin, { companyId: clientId, planId: null });

    // ── Case 1: commission on CARRIER (default) ───────────────────────────
    const o1 = await completeOrder(c, 10000);
    const inv1 = await invoicesFor(admin, o1.id);
    ok('two invoices issued (service + commission)', inv1.length === 2, `count=${inv1.length}`);

    const service = inv1.find((x) => x.kind === 'SERVICE');
    const commission = inv1.find((x) => x.kind === 'COMMISSION');
    ok('SERVICE invoice present', !!service);
    ok('COMMISSION invoice present', !!commission);

    ok('SERVICE amounts: base 10000, VAT 1500, total 11500',
      Number(service?.amount) === 10000 && Number(service?.vatAmount) === 1500 && Number(service?.totalAmount) === 11500,
      JSON.stringify({ a: service?.amount, v: service?.vatAmount, t: service?.totalAmount }));
    ok('SERVICE seller = carrier, buyer = client',
      service?.issuerId === carrierId && service?.receiverId === clientId);
    ok('SERVICE carries ZATCA party snapshots',
      !!service?.sellerName && !!service?.sellerVatNumber && !!service?.buyerName);

    ok('COMMISSION amounts: base 800, VAT 120, total 920',
      Number(commission?.amount) === 800 && Number(commission?.vatAmount) === 120 && Number(commission?.totalAmount) === 920,
      JSON.stringify({ a: commission?.amount, v: commission?.vatAmount, t: commission?.totalAmount }));
    ok('COMMISSION seller = platform (no issuer FK), buyer = carrier',
      commission?.issuerId === null && commission?.receiverId === carrierId);
    ok('COMMISSION seller snapshot = platform VAT identity',
      !!commission?.sellerVatNumber && !!commission?.sellerName, JSON.stringify({ n: commission?.sellerName, v: commission?.sellerVatNumber }));
    ok('both invoices ISSUED', service?.status === 'ISSUED' && commission?.status === 'ISSUED');

    // Idempotency: completing again is rejected and does not add invoices.
    const again = await j('POST', `/orders/${o1.id}/complete`, client.token);
    ok('re-complete rejected (already COMPLETED)', again.status >= 400, String(again.status));
    ok('still exactly two invoices', (await invoicesFor(admin, o1.id)).length === 2);

    // ── Case 2: commission on BOTH → two commission invoices (half each) ───
    const profile = unwrap((await j('POST', '/policies/groups', admin, { name: '[e2e] tax BOTH profile' })).data);
    await j('PUT', `/policies/groups/${profile.id}`, admin, {
      policy: {
        allowMarket: true, allowDirect: true, allowMarketPricing: true, allowFixedPricing: true,
        allowPrepaid: true, allowCOD: true,
        commissionRate: 0.08, commissionAppliesTo: 'BOTH', priceVatInclusive: false,
      },
    });
    const plan = unwrap((await j('POST', '/policies/plans', admin, { name: 'tax BOTH plan', audience: 'CLIENT', policyGroupId: profile.id })).data);
    await j('POST', '/policies/assign-plan', admin, { companyId: clientId, planId: plan.id });

    const o2 = await completeOrder(c, 10000);
    const inv2 = await invoicesFor(admin, o2.id);
    const coms = inv2.filter((x) => x.kind === 'COMMISSION');
    ok('BOTH → three invoices (1 service + 2 commission)', inv2.length === 3, `count=${inv2.length}`);
    ok('two commission invoices, one to carrier + one to client',
      coms.length === 2 && coms.some((x) => x.receiverId === carrierId) && coms.some((x) => x.receiverId === clientId));
    const comTotal = coms.reduce((s, x) => s + Number(x.totalAmount), 0);
    ok('commission halves sum to the full commission total (920)', Math.round(comTotal * 100) / 100 === 920, `sum=${comTotal}`);

    // Cleanup.
    await j('POST', '/policies/assign-plan', admin, { companyId: clientId, planId: null });
    await j('DELETE', `/policies/plans/${plan.id}`, admin);
    await j('DELETE', `/policies/groups/${profile.id}`, admin);
    note('done');
    return done();
  } finally {
    await prisma.$disconnect();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) run().then((ok) => process.exit(ok ? 0 : 1)).catch((e) => { console.error(e); process.exit(2); });

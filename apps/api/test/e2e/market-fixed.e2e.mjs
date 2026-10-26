// Fixed-price market publishing: pricing (bidding vs fixed) is decoupled from
// assignment (market vs direct). A client can publish to the OPEN market at a
// FIXED price; carriers "accept" the price (bid locked to it) and the client
// picks one. Also checks the policy gates on each pricing mode.
import { j, unwrap, listOf, context, checker } from './_helpers.mjs';

export async function run(ctx) {
  const { ok, note, done } = checker('Fixed-price market publishing');
  const c = ctx ?? (await context());
  const { admin, client, carrier } = c;
  const clientId = client.user.companyId;
  ok('logins', !!admin && !!client.token && !!carrier.token);

  // Ungrouped client → default policy allows market + both pricing modes.
  await j('POST', '/policies/assign-plan', admin, { companyId: clientId, planId: null });

  const base = {
    cargoType: 'GENERAL', cargoDescription: 'e2e market-fixed', weight: 3000,
    originCity: 'الرياض', originRegion: 'الرياض', originAddress: 'a',
    destinationCity: 'جدة', destinationRegion: 'مكة المكرمة', destinationAddress: 'b',
    requiredTruckType: 'LARGE_FLATBED', pickupDate: new Date(Date.now() + 3 * 86400000).toISOString(),
  };

  // ── OPEN + FIXED: published to the market at a set price. ────────────────
  const o = unwrap((await j('POST', '/orders', client.token, { ...base, mode: 'OPEN', agreedPriceUpfront: 8000 })).data);
  ok('created OPEN + FIXED: priceMode FIXED, agreedPrice 8000, no carrier',
    o?.mode === 'OPEN' && o?.priceMode === 'FIXED' && Number(o?.agreedPrice) === 8000 && !o?.carrierId,
    JSON.stringify({ mode: o?.mode, pm: o?.priceMode, ap: o?.agreedPrice, c: o?.carrierId }));

  const pub = unwrap((await j('POST', `/orders/${o.id}/publish`, client.token)).data);
  ok('publishes to the market (PUBLISHED, still no carrier)', pub?.status === 'PUBLISHED' && !pub?.carrierId, pub?.status);

  // Carrier "accepts" the price → a bid locked to the fixed price (can't undercut).
  const bid = unwrap((await j('POST', `/orders/${o.id}/bids`, carrier.token, { amount: 5000 })).data);
  ok('carrier accept locks the bid to the fixed price (8000, not 5000)', Number(bid?.amount) === 8000, String(bid?.amount));

  // Client picks the carrier → ASSIGNED, financials resolved against that carrier.
  const acc = await j('POST', `/orders/${o.id}/bids/${bid.id}/accept`, client.token);
  ok('client accepts → assignment ok', acc.status < 400, String(acc.status));
  const assigned = unwrap((await j('GET', `/orders/${o.id}`, admin)).data);
  ok('order ASSIGNED with a carrier', assigned?.status === 'ASSIGNED' && !!assigned?.carrierId, assigned?.status);
  ok('financials resolved at accept: agreedPrice 8000, carrierAmount 8464, clientTotalDue 9200',
    Number(assigned?.agreedPrice) === 8000 && Number(assigned?.carrierAmount) === 8464 && Number(assigned?.clientTotalDue) === 9200,
    JSON.stringify({ ap: assigned?.agreedPrice, ca: assigned?.carrierAmount, due: assigned?.clientTotalDue }));

  // ── OPEN + BIDDING (no price): the classic market, carriers propose. ─────
  const b = unwrap((await j('POST', '/orders', client.token, { ...base, mode: 'OPEN' })).data);
  ok('created OPEN + BIDDING: priceMode BIDDING, no agreed price', b?.priceMode === 'BIDDING' && !b?.agreedPrice, JSON.stringify({ pm: b?.priceMode, ap: b?.agreedPrice }));
  await j('POST', `/orders/${b.id}/publish`, client.token);
  const freeBid = unwrap((await j('POST', `/orders/${b.id}/bids`, carrier.token, { amount: 7300 })).data);
  ok('bidding order keeps the carrier-proposed amount (7300)', Number(freeBid?.amount) === 7300, String(freeBid?.amount));

  // ── Policy gates: FIXED needs allowFixedPricing; BIDDING needs allowMarketPricing.
  const profile = unwrap((await j('POST', '/policies/groups', admin, { name: '[e2e] no-fixed profile' })).data);
  await j('PUT', `/policies/groups/${profile.id}`, admin, {
    policy: { allowMarket: true, allowDirect: true, allowMarketPricing: true, allowFixedPricing: false, allowPrepaid: true, allowCOD: true },
  });
  const plan = unwrap((await j('POST', '/policies/plans', admin, { name: 'no-fixed plan', audience: 'CLIENT', policyGroupId: profile.id })).data);
  await j('POST', '/policies/assign-plan', admin, { companyId: clientId, planId: plan.id });
  const blocked = await j('POST', '/orders', client.token, { ...base, mode: 'OPEN', agreedPriceUpfront: 8000 });
  ok('FIXED market order blocked when allowFixedPricing is false', blocked.status >= 400, String(blocked.status));

  // Cleanup.
  for (const id of [o.id, b.id]) await j('POST', `/orders/${id}/cancel`, client.token, { reason: 'e2e' });
  await j('POST', '/policies/assign-plan', admin, { companyId: clientId, planId: null });
  await j('DELETE', `/policies/plans/${plan.id}`, admin);
  await j('DELETE', `/policies/groups/${profile.id}`, admin);
  note('cleaned up');
  return done();
}

if (import.meta.url === `file://${process.argv[1]}`) run().then((ok) => process.exit(ok ? 0 : 1)).catch((e) => { console.error(e); process.exit(2); });

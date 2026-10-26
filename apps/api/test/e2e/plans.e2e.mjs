// Workflow & Policy Engine — plans (memberships) + capability layer + gates.
// Verifies: profile features/commission, plan → profile, assign plan to a company,
// /policies/mine exposure, and feature gating (consolidated orders + white-label).
import { j, unwrap, listOf, context, checker } from './_helpers.mjs';

export async function run(ctx) {
  const { ok, note, done } = checker('Workflow & Policy Engine — plans & features');
  const { admin, client, carrier } = ctx ?? (await context());
  ok('logins', !!admin && !!client.token && !!carrier.token);
  const clientId = client.user?.companyId;
  const carrierId = carrier.user?.companyId;

  const baseOrder = {
    cargoType: 'GENERAL', cargoDescription: 'e2e plans', weight: 1000,
    mode: 'OPEN', originCity: 'الرياض', originRegion: 'الرياض', originAddress: 'a',
    destinationCity: 'جدة', destinationRegion: 'مكة المكرمة', destinationAddress: 'b',
    requiredTruckType: 'LARGE_FLATBED', pickupDate: new Date(Date.now() + 86400000).toISOString(),
  };

  // ── Client profile + plan: consolidated DISABLED, commission 6% ──
  const profile = unwrap((await j('POST', '/policies/groups', admin, { name: '[e2e] Basic profile' })).data);
  await j('PUT', `/policies/groups/${profile.id}`, admin, {
    policy: {
      allowMarket: true, allowDirect: true, allowMarketPricing: true, allowFixedPricing: true,
      allowPrepaid: true, allowCOD: true,
      features: { consolidatedOrders: false, perLegCarriers: false, maxActiveOrders: 10 },
      commissionRate: 0.06, commissionAppliesTo: 'CARRIER', priceVatInclusive: false,
    },
  });
  const back = listOf((await j('GET', '/policies/groups', admin)).data).find((g) => g.id === profile.id);
  ok('profile persisted features + commission',
    back?.policy?.features?.consolidatedOrders === false && back?.policy?.commissionRate === 0.06 && back?.policy?.commissionAppliesTo === 'CARRIER',
    JSON.stringify(back?.policy?.features));

  const plan = unwrap((await j('POST', '/policies/plans', admin, {
    name: 'باقة أساسية', nameEn: 'Basic', tier: 'BASIC', audience: 'CLIENT', policyGroupId: profile.id, isDefault: false,
  })).data);
  ok('plan created → profile', plan?.id && plan?.policyGroupId === profile.id);

  await j('POST', '/policies/assign-plan', admin, { companyId: clientId, planId: plan.id });
  const mine = unwrap((await j('GET', '/policies/mine', client.token)).data);
  ok('client /policies/mine reflects plan features + commission',
    mine?.features?.consolidatedOrders === false && mine?.commissionRate === 0.06, JSON.stringify(mine?.features));

  // GATE: client cannot create a consolidated order (feature disabled by plan).
  const blocked = await j('POST', '/orders', client.token, { ...baseOrder, orderType: 'CONSOLIDATED', truckCount: 2 });
  ok('GATE: consolidated order blocked by plan', blocked.status >= 400 && JSON.stringify(blocked.data).includes('FEATURE_CONSOLIDATED_DISABLED'), String(blocked.status));

  // Grant the feature → now allowed.
  await j('PUT', `/policies/groups/${profile.id}`, admin, {
    policy: {
      allowMarket: true, allowDirect: true, allowMarketPricing: true, allowFixedPricing: true,
      allowPrepaid: true, allowCOD: true,
      features: { consolidatedOrders: true, perLegCarriers: true },
      commissionRate: 0.06, commissionAppliesTo: 'CARRIER',
    },
  });
  const allowed = await j('POST', '/orders', client.token, { ...baseOrder, orderType: 'CONSOLIDATED', truckCount: 2 });
  const allowedOrder = unwrap(allowed.data);
  ok('after granting the feature, consolidated order is created', (allowed.status === 201 || allowed.status === 200) && allowedOrder?.orderType === 'CONSOLIDATED', String(allowed.status));
  if (allowedOrder?.id) await j('POST', `/orders/${allowedOrder.id}/cancel`, client.token, { reason: 'e2e' });

  // ── Carrier profile + plan: white-label gate ──
  const cProfile = unwrap((await j('POST', '/policies/groups', admin, { name: '[e2e] Carrier profile' })).data);
  await j('PUT', `/policies/groups/${cProfile.id}`, admin, {
    policy: {
      allowMarket: true, allowDirect: true, allowMarketPricing: true, allowFixedPricing: true,
      allowPrepaid: true, allowCOD: true, features: { whiteLabel: false },
    },
  });
  const cPlan = unwrap((await j('POST', '/policies/plans', admin, { name: 'باقة مزوّد', audience: 'CARRIER', policyGroupId: cProfile.id })).data);
  await j('POST', '/policies/assign-plan', admin, { companyId: carrierId, planId: cPlan.id });
  const wlBlocked = await j('PATCH', `/admin/companies/${carrierId}/white-label`, admin, { enabled: true });
  ok('GATE: white-label enable blocked when plan lacks the feature', wlBlocked.status >= 400 && JSON.stringify(wlBlocked.data).includes('FEATURE_WHITE_LABEL_DISABLED'), String(wlBlocked.status));
  await j('PUT', `/policies/groups/${cProfile.id}`, admin, {
    policy: { allowMarket: true, allowDirect: true, allowMarketPricing: true, allowFixedPricing: true, allowPrepaid: true, allowCOD: true, features: { whiteLabel: true } },
  });
  const wlOk = await j('PATCH', `/admin/companies/${carrierId}/white-label`, admin, { enabled: true });
  ok('after granting whiteLabel, enable succeeds', wlOk.status === 200 || wlOk.status === 201, String(wlOk.status));
  await j('PATCH', `/admin/companies/${carrierId}/white-label`, admin, { enabled: false }); // restore

  // ── Cleanup ──
  await j('POST', '/policies/assign-plan', admin, { companyId: clientId, planId: null });
  await j('POST', '/policies/assign-plan', admin, { companyId: carrierId, planId: null });
  await j('DELETE', `/policies/plans/${plan.id}`, admin);
  await j('DELETE', `/policies/plans/${cPlan.id}`, admin);
  await j('DELETE', `/policies/groups/${profile.id}`, admin);
  await j('DELETE', `/policies/groups/${cProfile.id}`, admin);
  note('cleaned up plans + profiles');
  return done();
}

if (import.meta.url === `file://${process.argv[1]}`) run().then((ok) => process.exit(ok ? 0 : 1)).catch((e) => { console.error(e); process.exit(2); });

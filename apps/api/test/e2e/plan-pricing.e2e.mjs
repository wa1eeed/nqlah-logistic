// Subscription plans — dynamic pricing: a plan's price builds up from a base +
// the priced modules it includes; the included modules also grant their feature
// keys (and the truck limit) to subscribers via the policy engine.
import { j, unwrap, listOf, context, checker } from './_helpers.mjs';

export async function run(ctx) {
  const { ok, note, done } = checker('Plan pricing & modules');
  const c = ctx ?? (await context());
  const { admin, carrier } = c;
  const carrierCompanyId = carrier.user.companyId;
  ok('logins', !!admin && !!carrier.token);

  // Priced module catalog (admin).
  const m1 = unwrap((await j('POST', '/policies/plan-modules', admin, { key: 'e2eFleetMaint', name: 'صيانة', audience: 'CARRIER', price: 150 })).data);
  const m2 = unwrap((await j('POST', '/policies/plan-modules', admin, { key: 'e2eContracted', name: 'متعاقدون', audience: 'CARRIER', price: 100 })).data);
  ok('two modules created with prices', Number(m1?.price) === 150 && Number(m2?.price) === 100);

  const dupe = await j('POST', '/policies/plan-modules', admin, { key: 'e2eFleetMaint', name: 'dup' });
  ok('duplicate module key rejected', dupe.status >= 400, String(dupe.status));

  const profile = unwrap((await j('POST', '/policies/groups', admin, { name: '[e2e] plan pricing profile' })).data);

  // Free plan → price 0 regardless of modules.
  const free = unwrap((await j('POST', '/policies/plans', admin, { name: 'أساسية', audience: 'CARRIER', policyGroupId: profile.id, isFree: true })).data);
  ok('free plan → monthly 0', free?.price?.monthly === 0, JSON.stringify(free?.price));

  // Paid plan: base 300 + two modules (150 + 100) = 550/mo; yearly 20% off = 5280.
  const pro = unwrap((await j('POST', '/policies/plans', admin, {
    name: 'احترافية', audience: 'CARRIER', policyGroupId: profile.id,
    isFree: false, basePrice: 300, yearlyDiscountPct: 20, includedTruckLimit: 10,
    moduleIds: [m1.id, m2.id],
  })).data);
  ok('paid plan monthly = base + modules (550)', pro?.price?.monthly === 550, JSON.stringify(pro?.price));
  ok('yearly = monthly × 12 × (1 − 20%) = 5280', pro?.price?.yearly === 5280, String(pro?.price?.yearly));
  ok('plan carries its module ids', (pro?.moduleIds ?? []).length === 2);

  // Removing a module from the plan drops the price.
  const updated = unwrap((await j('PUT', `/policies/plans/${pro.id}`, admin, { moduleIds: [m1.id] })).data);
  ok('removing a module recomputes price (300 + 150 = 450)', updated?.price?.monthly === 450, JSON.stringify(updated?.price));

  // Engine: a subscriber inherits the plan's module keys + truck limit as features.
  await j('POST', '/policies/assign-plan', admin, { companyId: carrierCompanyId, planId: pro.id });
  const mine = unwrap((await j('GET', '/policies/mine', carrier.token)).data);
  const f = mine?.features ?? {};
  ok('subscriber gains the module feature (e2eFleetMaint)', f.e2eFleetMaint === true, JSON.stringify(f));
  ok("removed module's feature is NOT granted (e2eContracted)", f.e2eContracted === undefined);
  ok('included truck limit → maxFleetSize = 10', f.maxFleetSize === 10, String(f.maxFleetSize));

  // Cleanup.
  await j('POST', '/policies/assign-plan', admin, { companyId: carrierCompanyId, planId: null });
  await j('DELETE', `/policies/plans/${free.id}`, admin);
  await j('DELETE', `/policies/plans/${pro.id}`, admin);
  await j('DELETE', `/policies/groups/${profile.id}`, admin);
  await j('DELETE', `/policies/plan-modules/${m1.id}`, admin);
  await j('DELETE', `/policies/plan-modules/${m2.id}`, admin);
  note('cleaned up');
  return done();
}

if (import.meta.url === `file://${process.argv[1]}`) run().then((ok) => process.exit(ok ? 0 : 1)).catch((e) => { console.error(e); process.exit(2); });

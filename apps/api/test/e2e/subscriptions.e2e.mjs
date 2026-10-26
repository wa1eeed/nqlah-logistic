// Subscription lifecycle: admin plan assignment creates a subscription;
// self-service subscribe / cancel; trial handling; clearing a plan cancels it.
import { j, unwrap, context, checker } from './_helpers.mjs';

export async function run(ctx) {
  const { ok, note, done } = checker('Subscription lifecycle');
  const c = ctx ?? (await context());
  const { admin, carrier } = c;
  const carrierCompanyId = carrier.user.companyId;
  ok('logins', !!admin && !!carrier.token);

  const profile = unwrap((await j('POST', '/policies/groups', admin, { name: '[e2e] subs profile' })).data);
  const free = unwrap((await j('POST', '/policies/plans', admin, { name: 'أساسية-subs', audience: 'CARRIER', policyGroupId: profile.id, isFree: true, includedTruckLimit: 3 })).data);
  const pro = unwrap((await j('POST', '/policies/plans', admin, {
    name: 'احترافية-subs', audience: 'CARRIER', policyGroupId: profile.id,
    isFree: false, basePrice: 400, yearlyDiscountPct: 10, trialDays: 14,
  })).data);

  // Admin assigns the FREE plan → subscription ACTIVE, price 0.
  await j('POST', '/policies/assign-plan', admin, { companyId: carrierCompanyId, planId: free.id });
  let sub = unwrap((await j('GET', `/policies/subscription/${carrierCompanyId}`, admin)).data);
  ok('admin assign creates an ACTIVE free subscription (price 0)', sub?.status === 'ACTIVE' && Number(sub?.priceSnapshot) === 0, JSON.stringify({ s: sub?.status, p: sub?.priceSnapshot }));

  // Self-service switch to the PAID plan with a trial → TRIALING, trial end set.
  sub = unwrap((await j('POST', '/policies/subscription/subscribe', carrier.token, { planId: pro.id })).data);
  ok('paid plan with trial → TRIALING', sub?.status === 'TRIALING', sub?.status);
  ok('trial end date is set', !!sub?.trialEndsAt);
  ok('price snapshot = 400/mo', Number(sub?.priceSnapshot) === 400, String(sub?.priceSnapshot));

  // Yearly cycle snapshots the discounted yearly price (400×12×0.9 = 4320).
  sub = unwrap((await j('POST', '/policies/subscription/subscribe', carrier.token, { planId: pro.id, billingCycle: 'YEARLY' })).data);
  ok('yearly cycle → price snapshot 4320', sub?.billingCycle === 'YEARLY' && Number(sub?.priceSnapshot) === 4320, JSON.stringify({ cy: sub?.billingCycle, p: sub?.priceSnapshot }));

  // mine reflects it.
  const mine = unwrap((await j('GET', '/policies/subscription/mine', carrier.token)).data);
  ok('mine returns the subscription + plan', mine?.plan?.name === 'احترافية-subs');

  // Cancel at period end → flagged, still active.
  sub = unwrap((await j('POST', '/policies/subscription/cancel', carrier.token, {})).data);
  ok('cancel-at-period-end flags but keeps ACTIVE/TRIALING', sub?.cancelAtPeriodEnd === true && sub?.status !== 'CANCELLED', JSON.stringify({ c: sub?.cancelAtPeriodEnd, s: sub?.status }));

  // Admin clears the plan → subscription cancelled immediately.
  await j('POST', '/policies/assign-plan', admin, { companyId: carrierCompanyId, planId: null });
  sub = unwrap((await j('GET', `/policies/subscription/${carrierCompanyId}`, admin)).data);
  ok('clearing the plan cancels the subscription', sub?.status === 'CANCELLED', sub?.status);

  // Cleanup.
  await j('DELETE', `/policies/plans/${free.id}`, admin);
  await j('DELETE', `/policies/plans/${pro.id}`, admin);
  await j('DELETE', `/policies/groups/${profile.id}`, admin);
  note('cleaned up');
  return done();
}

if (import.meta.url === `file://${process.argv[1]}`) run().then((ok) => process.exit(ok ? 0 : 1)).catch((e) => { console.error(e); process.exit(2); });

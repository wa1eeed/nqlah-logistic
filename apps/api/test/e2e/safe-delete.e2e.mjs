// Dependency-aware deletes: a plan with subscribers can't be deleted blindly —
// the caller must reassign them to another plan or detach them; a policy profile
// backing plans is protected. (Financial records have no delete endpoints at all.)
import { j, unwrap, context, checker } from './_helpers.mjs';

export async function run(ctx) {
  const { ok, note, done } = checker('Safe (dependency-aware) deletes');
  const c = ctx ?? (await context());
  const { admin, carrier } = c;
  const carrierCompanyId = carrier.user.companyId;
  ok('logins', !!admin && !!carrier.token);

  const profile = unwrap((await j('POST', '/policies/groups', admin, { name: '[e2e] safe-delete profile' })).data);
  const p1 = unwrap((await j('POST', '/policies/plans', admin, { name: 'حذف-آمن-1', audience: 'CARRIER', policyGroupId: profile.id, isFree: true })).data);
  const p2 = unwrap((await j('POST', '/policies/plans', admin, { name: 'حذف-آمن-2', audience: 'CARRIER', policyGroupId: profile.id, isFree: true })).data);
  await j('POST', '/policies/assign-plan', admin, { companyId: carrierCompanyId, planId: p1.id });

  // 1. A profile backing plans is protected.
  const grpDel = await j('DELETE', `/policies/groups/${profile.id}`, admin);
  ok('deleting a profile used by plans is blocked (GROUP_IN_USE)', grpDel.status >= 400 && grpDel.data?.error?.code === 'GROUP_IN_USE', JSON.stringify(grpDel.data?.error?.code));

  // 2. Deleting a plan with subscribers is refused without a decision.
  const blocked = await j('DELETE', `/policies/plans/${p1.id}`, admin);
  ok('plan with a subscriber is not deleted blindly (PLAN_HAS_SUBSCRIBERS)', blocked.status >= 400 && blocked.data?.error?.code === 'PLAN_HAS_SUBSCRIBERS', JSON.stringify(blocked.data?.error?.code));

  // 3. Reassign subscribers to another plan, then the plan deletes.
  const reassign = await j('DELETE', `/policies/plans/${p1.id}?reassignTo=${p2.id}`, admin);
  ok('reassign-then-delete succeeds', reassign.status < 400, String(reassign.status));
  const sub = unwrap((await j('GET', `/policies/subscription/${carrierCompanyId}`, admin)).data);
  ok('subscriber was moved to the target plan', sub?.plan?.name === 'حذف-آمن-2', sub?.plan?.name);

  // 4. Detach subscribers, then the plan deletes (subscription cancelled + removed).
  const detach = await j('DELETE', `/policies/plans/${p2.id}?detach=true`, admin);
  ok('detach-then-delete succeeds', detach.status < 400, String(detach.status));
  const after = unwrap((await j('GET', `/policies/subscription/${carrierCompanyId}`, admin)).data);
  ok('subscriber detached (no active subscription)', after == null || after.status === 'CANCELLED', JSON.stringify(after?.status));

  // 5. Now the empty profile can be removed.
  const grpDel2 = await j('DELETE', `/policies/groups/${profile.id}`, admin);
  ok('empty profile deletes', grpDel2.status < 400, String(grpDel2.status));

  note('done');
  return done();
}

if (import.meta.url === `file://${process.argv[1]}`) run().then((ok) => process.exit(ok ? 0 : 1)).catch((e) => { console.error(e); process.exit(2); });

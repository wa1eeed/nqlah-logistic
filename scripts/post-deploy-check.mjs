// Post-deploy smoke check — confirms a DEPLOYED build is healthy and actually
// carries the finance/tax + policy-engine work. Read-only: it never creates,
// mutates, or deletes anything, so it is safe against staging or production.
//
//   # against staging:
//   E2E_BASE=https://api.nqlah.nx.sa/api node scripts/post-deploy-check.mjs
//   # against a local API (default):
//   node scripts/post-deploy-check.mjs
//
// It uses ONE admin login (rate-limited 5/30min) and the shared e2e helpers.
// Exits 0 when every check passes, 1 otherwise.
import { BASE, j, unwrap, listOf, adminLogin, checker } from '../apps/api/test/e2e/_helpers.mjs';

async function run() {
  const { ok, done } = checker(`Post-deploy check — ${BASE}`);

  // 1. Liveness. /health sits at the server root, outside the /api prefix.
  const origin = BASE.replace(/\/api\/?$/, '');
  let h = null;
  try {
    const r = await fetch(`${origin}/health`);
    const body = await r.json().catch(() => null);
    h = body?.data ?? body;
    ok('GET /health → ok', r.status === 200 && h?.status === 'ok', JSON.stringify(h));
  } catch (e) {
    ok('GET /health → ok', false, String(e?.message ?? e));
  }
  ok('database up', h?.checks?.database === 'up');

  // 2. Admin auth reachable.
  let admin;
  try { admin = await adminLogin(); } catch { admin = null; }
  ok('admin login works', !!admin, 'rate-limited? wait 30 min, or the build is down');
  if (!admin) return done();

  // 3. Finance build marker: companies carry the short code + VAT registration.
  const carriers = listOf((await j('GET', '/companies?type=CARRIER&limit=1', admin)).data);
  const c0 = carriers[0];
  ok('a carrier company is listed', !!c0);
  if (c0) {
    const detail = unwrap((await j('GET', `/companies/${c0.id}`, admin)).data);
    ok('company has a short code (new build)', typeof detail?.code === 'string' && detail.code.length > 0, `code=${detail?.code}`);
    ok('company exposes vatRegistered (finance_vat migration)', detail?.vatRegistered !== undefined, `vatRegistered=${detail?.vatRegistered}`);
  }

  // 4. Policy Engine build marker: plans endpoint answers with a list.
  const plans = await j('GET', '/policies/plans', admin);
  ok('GET /policies/plans → 200 (policy engine)', plans.status === 200 && Array.isArray(listOf(plans.data)), `status=${plans.status}`);

  // 5. Invoices endpoint reachable (tax-invoices build).
  const inv = await j('GET', '/invoices?limit=1', admin);
  ok('GET /invoices → 200 (invoices module)', inv.status === 200, `status=${inv.status}`);

  // 6. Tax endpoint is mounted (probe with an invalid VAT → 400, NOT 404).
  if (c0) {
    const tax = await j('PATCH', `/admin/companies/${c0.id}/tax`, admin, { vatNumber: '123' });
    ok('PATCH /admin/companies/:id/tax mounted (invalid → 400, not 404)', tax.status === 400, `status=${tax.status} (404 = old build)`);
  }

  return done();
}

run().then((ok) => process.exit(ok ? 0 : 1)).catch((e) => { console.error(e); process.exit(2); });

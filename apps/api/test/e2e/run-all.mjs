// Run every e2e suite in order and report an aggregate pass/fail. Authenticates
// ONCE and shares the tokens, so admin login (rate-limited 5/30min) is hit once.
import { context } from './_helpers.mjs';
import { run as policies } from './policies.e2e.mjs';
import { run as heterogeneous } from './heterogeneous-orders.e2e.mjs';
import { run as perLegCarriers } from './per-leg-carriers.e2e.mjs';
import { run as perLegBidding } from './per-leg-bidding.e2e.mjs';

const suites = [
  ['Policies & modules', policies],
  ['Heterogeneous orders', heterogeneous],
  ['Per-leg carriers', perLegCarriers],
  ['Per-leg bidding', perLegBidding],
];

let ctx;
try {
  ctx = await context();
} catch (e) {
  console.error(`\n❌ Could not authenticate: ${e?.message ?? e}\n`);
  process.exit(2);
}

let allOk = true;
for (const [name, run] of suites) {
  try {
    const ok = await run(ctx);
    allOk = allOk && ok;
  } catch (e) {
    allOk = false;
    console.error(`\n❌ ${name} threw:`, e?.message ?? e);
  }
}
console.log(allOk ? '\n════ ✅ ALL SUITES PASSED ════\n' : '\n════ ❌ SOME SUITES FAILED ════\n');
process.exit(allOk ? 0 : 1);

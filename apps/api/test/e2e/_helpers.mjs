// Shared helpers for the manual end-to-end verification scripts.
//
// These are black-box checks that drive the running API over HTTP (and, for a
// couple of multi-carrier scenarios, read/write the DB directly via Prisma).
// They are NOT part of the Jest unit suite — see README.md for how to run them.
import { createRequire } from 'module';

export const BASE = process.env.E2E_BASE ?? 'http://localhost:4000/api';

/** Seeded demo accounts (see apps/api/prisma/seed.ts). */
export const ACCOUNTS = {
  admin: { email: 'admin@naqla.sa', password: 'Admin@1234' },
  client: { phoneOrEmail: 'client@naqla.sa', password: 'Client@1234' },
  carrier: { phoneOrEmail: 'carrier@naqla.sa', password: 'Carrier@1234' },
};

/** A tiny HTTP helper returning { status, data }. */
export async function j(method, path, token, body) {
  const r = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await r.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { status: r.status, data };
}

/** Unwrap the global `{ success, data }` envelope. */
export const unwrap = (d) => (d && d.data !== undefined ? d.data : d);
/** Pull an array out of a response (list or paginated `{ items }`). */
export const listOf = (d) => { const x = unwrap(d); return Array.isArray(x) ? x : (x?.items || []); };

/** Admin login (dedicated admin endpoint) → access token. */
export async function adminLogin() {
  return unwrap((await j('POST', '/admin/auth/login', null, ACCOUNTS.admin)).data).accessToken;
}
/** Client/carrier login → { token, user }. */
export async function login(creds) {
  const u = unwrap((await j('POST', '/auth/login', null, creds)).data);
  return { token: u.accessToken, user: u.user };
}

/**
 * Authenticate the three demo roles ONCE and share the result across suites.
 * Admin login is rate-limited (5/30min), so suites must not each log in — the
 * runner builds this once and passes it to every `run(ctx)`; a standalone script
 * builds its own. Throws a clear message if admin auth is throttled/locked.
 */
export async function context() {
  const admin = await adminLogin();
  if (!admin) throw new Error('admin login failed (rate-limited? wait 30 min or use a fresh admin) — see README');
  const [client, carrier] = await Promise.all([login(ACCOUNTS.client), login(ACCOUNTS.carrier)]);
  return { admin, client, carrier };
}

/** A running Prisma client against the same DB (portable, relative to apps/api). */
export function getPrisma() {
  const require = createRequire(import.meta.url);
  const { PrismaClient } = require('../../src/generated/prisma');
  return new PrismaClient();
}

/** A pass/fail checker that prints a report and exits with the right code. */
export function checker(title) {
  let pass = 0, fail = 0; const lines = [];
  const ok = (name, cond, detail = '') => {
    if (cond) { pass++; lines.push(`  ✓ ${name}`); }
    else { fail++; lines.push(`  ✗ FAIL: ${name}${detail ? ' — ' + detail : ''}`); }
  };
  const note = (msg) => lines.push(`  · ${msg}`);
  const done = () => {
    console.log(`\n${title}`);
    console.log(lines.join('\n'));
    console.log(`${fail === 0 ? '✅ PASS' : '❌ FAIL'} — ${pass} passed, ${fail} failed\n`);
    return fail === 0;
  };
  return { ok, note, done };
}

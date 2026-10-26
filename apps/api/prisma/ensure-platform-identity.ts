/**
 * Ensure the platform's legal tax-identity settings EXIST (the seller on every
 * commission tax invoice — see docs/INVOICES.md), so the invoice generator
 * always finds a row. WITHOUT any demo data.
 *
 * The identity is normally edited from the **admin panel**
 * (Settings → Financial → «الهوية الضريبية للمنصة»), which writes the same
 * setting keys. This script just guarantees the rows are present after a fresh
 * deploy, seeding safe placeholders when they are missing. Run:
 *
 *   node dist/prisma/ensure-platform-identity.js   # in the API container
 *   # or locally:  pnpm --filter @naqla/api db:ensure-platform-identity
 *
 * Optional env override (CI/bootstrap only; the admin panel is the usual path):
 *   PLATFORM_VAT_NUMBER / PLATFORM_CR_NUMBER / PLATFORM_NAME_AR / PLATFORM_ADDRESS
 * When a var is unset, any existing value is kept untouched.
 *
 * Idempotent: each key is upserted individually; other data is never touched.
 */
import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

// key → [env var, category]. Only keys whose env var is set are written, except
// when the setting does not exist yet (then a safe placeholder is created so the
// invoice code always finds a row).
const MAP: Array<{ key: string; env: string; fallback: string; category: string }> = [
  { key: 'platform_vat_number', env: 'PLATFORM_VAT_NUMBER', fallback: '', category: 'finance' },
  { key: 'platform_cr_number', env: 'PLATFORM_CR_NUMBER', fallback: '', category: 'finance' },
  { key: 'platform_address', env: 'PLATFORM_ADDRESS', fallback: 'الرياض، المملكة العربية السعودية', category: 'finance' },
  { key: 'platform_name_ar', env: 'PLATFORM_NAME_AR', fallback: 'نقلة لوجيستك', category: 'branding' },
];

async function main() {
  for (const m of MAP) {
    const envVal = process.env[m.env];
    const existing = await prisma.setting.findUnique({ where: { key: m.key } });
    if (envVal != null && envVal !== '') {
      await prisma.setting.upsert({
        where: { key: m.key },
        create: { key: m.key, value: envVal, category: m.category },
        update: { value: envVal },
      });
      console.log(`✅ ${m.key} = ${envVal}`);
    } else if (!existing) {
      await prisma.setting.create({ data: { key: m.key, value: m.fallback, category: m.category } });
      console.log(`• ${m.key} created with placeholder "${m.fallback || '(empty)'}" — set ${m.env} for production`);
    } else {
      console.log(`• ${m.key} kept (${existing.value || '(empty)'})`);
    }
  }

  const vat = await prisma.setting.findUnique({ where: { key: 'platform_vat_number' } });
  if (!vat?.value || vat.value === '300000000000003') {
    console.warn('⚠️  platform_vat_number is empty or a placeholder — set Naqla\'s real VAT number from the admin panel (Settings → Financial) before issuing production invoices.');
  }
  console.log('✅ Platform tax identity ready.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

/**
 * Ensure the baseline subscription plans EXIST — the priced module catalog, a
 * provider operating profile, and the Basic (free, default) + Professional plans.
 * WITHOUT any demo data, so it is safe to run in production on every deploy.
 *
 *   node dist/prisma/ensure-plans.js        # in the API container
 *   # or locally:  pnpm --filter @naqla/api db:ensure-plans
 *
 * Idempotent:
 *   • modules are upserted by their unique `key` (price/name refreshed, links kept);
 *   • the provider profile and the two plans are created only if missing, so any
 *     later admin edits (prices, modules, extra plans) are preserved.
 *
 * Edit prices/modules afterwards from the admin panel (محرك السياسات → الباقات).
 */
import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

const MODULES = [
  { key: 'driverManagement', name: 'التحكم بالسائقين', nameEn: 'Driver management', audience: 'CARRIER', price: 0, sortOrder: 1 },
  { key: 'fleetMaintenance', name: 'إدارة الصيانة الدورية للأسطول', nameEn: 'Periodic fleet maintenance', audience: 'CARRIER', price: 150, sortOrder: 2 },
  { key: 'contractedDrivers', name: 'السائقون المتعاقدون', nameEn: 'Contracted drivers', audience: 'CARRIER', price: 100, sortOrder: 3 },
  { key: 'advancedAnalytics', name: 'تحليلات متقدّمة', nameEn: 'Advanced analytics', audience: 'CARRIER', price: 80, sortOrder: 4 },
  { key: 'prioritySupport', name: 'دعم ذو أولوية', nameEn: 'Priority support', audience: 'BOTH', price: 60, sortOrder: 5 },
];

async function main() {
  // 1. Module catalog (upsert by key).
  const idByKey: Record<string, string> = {};
  for (const m of MODULES) {
    const row = await prisma.planModule.upsert({
      where: { key: m.key },
      create: m,
      update: { name: m.name, nameEn: m.nameEn, price: m.price, audience: m.audience, sortOrder: m.sortOrder },
    });
    idByKey[m.key] = row.id;
    console.log(`• module ${m.key} (${m.price} SAR)`);
  }

  // 2. A base operating profile the plans attach to (find-or-create).
  let profile = await prisma.policyGroup.findFirst({ where: { name: 'ملف المزوّد الأساسي' } });
  if (!profile) {
    profile = await prisma.policyGroup.create({
      data: {
        name: 'ملف المزوّد الأساسي', description: 'الملف التشغيلي الذي تبني عليه باقات المزوّدين',
        allowMarket: true, allowDirect: true, allowMarketPricing: true, allowFixedPricing: true,
        allowPrepaid: true, allowCOD: true, clientIds: [],
      },
    });
    console.log('• created provider profile «ملف المزوّد الأساسي»');
  }

  // 3. Basic (free, default) + Professional plans — created only if missing.
  const basic = await prisma.plan.findFirst({ where: { name: 'الباقة الأساسية', audience: 'CARRIER' } });
  if (!basic) {
    await prisma.plan.create({
      data: {
        name: 'الباقة الأساسية', nameEn: 'Basic', tier: 'BASIC', audience: 'CARRIER',
        policyGroupId: profile.id, isFree: true, isDefault: true, active: true,
        includedTruckLimit: 3, sortOrder: 1,
        modules: { create: [{ moduleId: idByKey.driverManagement }] },
      },
    });
    console.log('✅ created plan «الباقة الأساسية» (free, default)');
  } else {
    console.log('• plan «الباقة الأساسية» kept');
  }

  const pro = await prisma.plan.findFirst({ where: { name: 'الباقة الاحترافية', audience: 'CARRIER' } });
  if (!pro) {
    await prisma.plan.create({
      data: {
        name: 'الباقة الاحترافية', nameEn: 'Professional', tier: 'PRO', audience: 'CARRIER',
        policyGroupId: profile.id, isFree: false, basePrice: 300, yearlyDiscountPct: 15,
        includedTruckLimit: 15, trialDays: 14, sortOrder: 2,
        modules: { create: ['driverManagement', 'fleetMaintenance', 'contractedDrivers', 'advancedAnalytics', 'prioritySupport'].map((k) => ({ moduleId: idByKey[k] })) },
      },
    });
    console.log('✅ created plan «الباقة الاحترافية» (base 300 + modules)');
  } else {
    console.log('• plan «الباقة الاحترافية» kept');
  }

  // Safety: if no default carrier plan exists, make Basic the default.
  const anyDefault = await prisma.plan.findFirst({ where: { audience: { in: ['CARRIER', 'BOTH'] }, isDefault: true, active: true } });
  if (!anyDefault) {
    const b = await prisma.plan.findFirst({ where: { name: 'الباقة الأساسية', audience: 'CARRIER' } });
    if (b) { await prisma.plan.update({ where: { id: b.id }, data: { isDefault: true } }); console.log('• marked «الباقة الأساسية» as the default'); }
  }

  console.log('✅ Subscription plans ready.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

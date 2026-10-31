/**
 * Ensure the baseline subscription plans EXIST — the priced module catalog, a
 * provider operating profile, and the Basic (free, default) + Professional plans.
 * WITHOUT any demo data, so it is safe to run in production on every deploy.
 *
 *   node dist/prisma/ensure-plans.js        # in the API container
 *   # or locally:  pnpm --filter @naqla/api db:ensure-plans
 *
 * Idempotent AND non-destructive — it only ever FILLS IN what's missing, so later
 * admin edits (module prices, plan configs, extra plans) are never overwritten:
 *   • a module is created only if its unique `key` doesn't exist yet;
 *   • the provider profile and the two plans are created only if missing.
 *
 * This matters across environments: promoting code to production runs this on the
 * production DB, where it creates the baseline on the first deploy and then leaves
 * everything you've customised from the admin panel untouched on every deploy after.
 */
import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

const MODULES = [
  { key: 'driverManagement', name: 'التحكم بالسائقين', nameEn: 'Driver management', audience: 'CARRIER', price: 0, sortOrder: 1 },
  { key: 'fleetMaintenance', name: 'إدارة الصيانة الدورية للأسطول', nameEn: 'Periodic fleet maintenance', audience: 'CARRIER', price: 150, sortOrder: 2 },
  { key: 'contractedDrivers', name: 'السائقون المتعاقدون', nameEn: 'Contracted drivers', audience: 'CARRIER', price: 100, sortOrder: 3 },
  { key: 'advancedAnalytics', name: 'تحليلات متقدّمة', nameEn: 'Advanced analytics', audience: 'CARRIER', price: 80, sortOrder: 4 },
  { key: 'prioritySupport', name: 'دعم ذو أولوية', nameEn: 'Priority support', audience: 'BOTH', price: 60, sortOrder: 5 },
  // Opt-in module: the carrier's own «عملائي» (owned clients) workspace. Gated —
  // the «عملائي» section only appears for providers whose plan includes it.
  { key: 'ownedClients', name: 'إدارة عملائي', nameEn: 'My Clients', audience: 'CARRIER', price: 120, sortOrder: 6 },
];

async function main() {
  // 1. Module catalog — create a module only if its key is missing (never
  //    overwrite an existing one's admin-edited price/name).
  const idByKey: Record<string, string> = {};
  for (const m of MODULES) {
    let row = await prisma.planModule.findUnique({ where: { key: m.key } });
    if (!row) { row = await prisma.planModule.create({ data: m }); console.log(`• module ${m.key} created (${m.price} SAR)`); }
    else console.log(`• module ${m.key} kept`);
    idByKey[m.key] = row.id;
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
        modules: { create: ['driverManagement', 'fleetMaintenance', 'contractedDrivers', 'advancedAnalytics', 'prioritySupport', 'ownedClients'].map((k) => ({ moduleId: idByKey[k] })) },
      },
    });
    console.log('✅ created plan «الباقة الاحترافية» (base 300 + modules)');
  } else {
    console.log('• plan «الباقة الاحترافية» kept');
  }

  // Ensure the Professional plan includes the «عملائي» module even on an
  // already-created plan (idempotent — the module was added to the catalog after
  // the plan may have been seeded). The gated «عملائي» section depends on this.
  const proForModule = await prisma.plan.findFirst({ where: { name: 'الباقة الاحترافية', audience: 'CARRIER' } });
  if (proForModule && idByKey.ownedClients) {
    await prisma.planModuleLink.upsert({
      where: { planId_moduleId: { planId: proForModule.id, moduleId: idByKey.ownedClients } },
      create: { planId: proForModule.id, moduleId: idByKey.ownedClients },
      update: {},
    });
    console.log('• «عملائي» module linked to «الباقة الاحترافية»');
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

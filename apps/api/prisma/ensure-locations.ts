/**
 * Ensure the baseline geography EXISTS — Saudi Arabia with its 13 regions and
 * their main cities — so the country → region → city pickers always have data.
 * WITHOUT touching anything an admin has already edited, so it is safe to run in
 * production on every deploy.
 *
 *   node dist/prisma/ensure-locations.js        # in the API container
 *   # or locally:  pnpm --filter @naqla/api db:ensure-locations
 *
 * Idempotent AND non-destructive — it only ever FILLS IN what's missing:
 *   • the country is created only if its ISO code (SA) doesn't exist yet;
 *   • a region is created only if its (country, nameAr) pair is missing;
 *   • a city is created only if its (region, nameAr) pair is missing.
 * Existing rows — including admin-edited names, active flags, sort orders, and
 * any extra countries/regions/cities added from the admin panel — are left
 * untouched. The Saudi data is derived from the former hardcoded mobile list
 * (saudiRegions + _cityRegion in order_draft_controller.dart).
 */
import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

/** Saudi Arabia: each region (Ar/En) with its cities (Ar/En), in display order. */
const SA_REGIONS: { nameAr: string; nameEn: string; cities: { nameAr: string; nameEn: string }[] }[] = [
  { nameAr: 'الرياض', nameEn: 'Riyadh', cities: [
    { nameAr: 'الرياض', nameEn: 'Riyadh' }, { nameAr: 'الخرج', nameEn: 'Al-Kharj' }, { nameAr: 'الدوادمي', nameEn: 'Ad-Dawadmi' },
  ] },
  { nameAr: 'مكة المكرمة', nameEn: 'Makkah', cities: [
    { nameAr: 'جدة', nameEn: 'Jeddah' }, { nameAr: 'مكة المكرمة', nameEn: 'Makkah' }, { nameAr: 'الطائف', nameEn: 'Taif' },
  ] },
  { nameAr: 'المدينة المنورة', nameEn: 'Al Madinah', cities: [
    { nameAr: 'المدينة المنورة', nameEn: 'Al Madinah' }, { nameAr: 'ينبع', nameEn: 'Yanbu' },
  ] },
  { nameAr: 'القصيم', nameEn: 'Al-Qassim', cities: [
    { nameAr: 'بريدة', nameEn: 'Buraydah' }, { nameAr: 'عنيزة', nameEn: 'Unayzah' },
  ] },
  { nameAr: 'الشرقية', nameEn: 'Eastern Province', cities: [
    { nameAr: 'الدمام', nameEn: 'Dammam' }, { nameAr: 'الخبر', nameEn: 'Khobar' }, { nameAr: 'الظهران', nameEn: 'Dhahran' },
    { nameAr: 'الأحساء', nameEn: 'Al-Ahsa' }, { nameAr: 'الجبيل', nameEn: 'Jubail' }, { nameAr: 'القطيف', nameEn: 'Qatif' },
    { nameAr: 'حفر الباطن', nameEn: 'Hafar Al-Batin' },
  ] },
  { nameAr: 'عسير', nameEn: 'Asir', cities: [
    { nameAr: 'أبها', nameEn: 'Abha' }, { nameAr: 'خميس مشيط', nameEn: 'Khamis Mushait' },
  ] },
  { nameAr: 'تبوك', nameEn: 'Tabuk', cities: [{ nameAr: 'تبوك', nameEn: 'Tabuk' }] },
  { nameAr: 'حائل', nameEn: 'Hail', cities: [{ nameAr: 'حائل', nameEn: 'Hail' }] },
  { nameAr: 'الحدود الشمالية', nameEn: 'Northern Borders', cities: [{ nameAr: 'عرعر', nameEn: 'Arar' }] },
  { nameAr: 'جازان', nameEn: 'Jazan', cities: [{ nameAr: 'جازان', nameEn: 'Jazan' }] },
  { nameAr: 'نجران', nameEn: 'Najran', cities: [{ nameAr: 'نجران', nameEn: 'Najran' }] },
  { nameAr: 'الباحة', nameEn: 'Al-Bahah', cities: [{ nameAr: 'الباحة', nameEn: 'Al-Bahah' }] },
  { nameAr: 'الجوف', nameEn: 'Al-Jawf', cities: [{ nameAr: 'سكاكا', nameEn: 'Sakaka' }] },
];

async function main() {
  // 1. Country — created only if its ISO code is missing.
  let country = await prisma.country.findUnique({ where: { code: 'SA' } });
  if (!country) {
    country = await prisma.country.create({
      data: { code: 'SA', nameAr: 'المملكة العربية السعودية', nameEn: 'Saudi Arabia', dialCode: '+966', sortOrder: 1 },
    });
    console.log('• country SA created');
  } else {
    console.log('• country SA kept');
  }

  // 2. Regions + their cities — create only what's missing (match on nameAr).
  for (let ri = 0; ri < SA_REGIONS.length; ri++) {
    const r = SA_REGIONS[ri];
    let region = await prisma.region.findFirst({ where: { countryId: country.id, nameAr: r.nameAr } });
    if (!region) {
      region = await prisma.region.create({
        data: { countryId: country.id, nameAr: r.nameAr, nameEn: r.nameEn, sortOrder: ri + 1 },
      });
      console.log(`  • region ${r.nameEn} created`);
    }
    for (let ci = 0; ci < r.cities.length; ci++) {
      const c = r.cities[ci];
      const existing = await prisma.city.findFirst({ where: { regionId: region.id, nameAr: c.nameAr } });
      if (!existing) {
        await prisma.city.create({
          data: { regionId: region.id, nameAr: c.nameAr, nameEn: c.nameEn, sortOrder: ci + 1 },
        });
      }
    }
  }

  const regionCount = await prisma.region.count({ where: { countryId: country.id } });
  const cityCount = await prisma.city.count({ where: { region: { countryId: country.id } } });
  console.log(`✅ Locations ready — Saudi Arabia: ${regionCount} regions, ${cityCount} cities.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

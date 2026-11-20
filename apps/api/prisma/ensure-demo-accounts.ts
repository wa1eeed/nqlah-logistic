/**
 * Idempotent, PRODUCTION-SAFE demo/review accounts.
 *
 * The full `seed.ts` never runs in production (it would pollute a live DB with
 * fake orders/invoices). But App Store review AND hands-on testing need a few
 * real, loginable accounts with just enough data that screens aren't empty.
 *
 * This script creates exactly that — client, carrier (company), and an
 * INDIVIDUAL provider (ناقل فرد / owner-driver) — plus a published order and a
 * pending bid so the home "active shipments" and "offers awaiting you" surfaces
 * have something to show. Everything is upserted by a stable natural key, so
 * re-running changes nothing.
 *
 * GATED: runs only when SEED_DEMO_ACCOUNTS=true, so it can live in the deploy
 * entrypoint and stay dormant until a human opts in (Coolify variable), then be
 * turned off again — the rows persist.
 *
 *   SEED_DEMO_ACCOUNTS=true node dist/prisma/ensure-demo-accounts.js
 *
 * Demo logins (phone + OTP via the store-review bypass, OR email + password):
 *   🏢 Client (Apple review)  +966500000002  client@nqlah.online    Client@1234
 *   🚚 Carrier (company)      +966500000003  carrier@nqlah.online   Carrier@1234
 *   🧑 Provider (individual)  +966500000004  provider@nqlah.online  Provider@1234
 */
import { PrismaClient } from '../src/generated/prisma';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  if (process.env.SEED_DEMO_ACCOUNTS !== 'true') {
    console.log('• demo accounts skipped (set SEED_DEMO_ACCOUNTS=true to provision)');
    return;
  }
  console.log('▶ provisioning demo/review accounts…');

  const hash = (p: string) => bcrypt.hash(p, 12);

  // ─── 1. Client company + user (Apple review account) ─────────────
  const clientCo = await prisma.company.upsert({
    where: { crNumber: '1010000001' },
    update: { status: 'ACTIVE', kycStatus: 'APPROVED' },
    create: {
      type: 'CLIENT', entityType: 'COMPANY', status: 'ACTIVE', kycStatus: 'APPROVED',
      nameAr: 'شركة الجزيرة للطاقة', nameEn: 'Aljazeera Energy Co.',
      crNumber: '1010000001', vatNumber: '300000000000003',
      city: 'الرياض', region: 'الرياض',
      contactPhone: '+966112000001', contactEmail: 'ops@jazeera-energy.example',
    },
  });
  await prisma.user.upsert({
    where: { phone: '+966500000002' },
    update: {
      email: 'client@nqlah.online', passwordHash: await hash('Client@1234'),
      role: 'CLIENT_ADMIN', companyRole: 'OWNER', isActive: true,
      isEmailVerified: true, isPhoneVerified: true, companyId: clientCo.id,
    },
    create: {
      phone: '+966500000002', email: 'client@nqlah.online',
      passwordHash: await hash('Client@1234'), role: 'CLIENT_ADMIN', companyRole: 'OWNER',
      firstName: 'أحمد', lastName: 'العتيبي',
      isEmailVerified: true, isPhoneVerified: true, isActive: true, companyId: clientCo.id,
    },
  });

  // ─── 2. Carrier company (COMPANY) + user + fleet ─────────────────
  const carrierCo = await prisma.company.upsert({
    where: { crNumber: '1010000002' },
    update: { status: 'ACTIVE', kycStatus: 'APPROVED' },
    create: {
      type: 'CARRIER', entityType: 'COMPANY', status: 'ACTIVE', kycStatus: 'APPROVED',
      nameAr: 'شركة المسار السريع للنقل', nameEn: 'Fast Track Transport',
      crNumber: '1010000002', vatNumber: '300000000000004',
      city: 'الدمام', region: 'الشرقية',
      contactPhone: '+966138000001', contactEmail: 'ops@fasttrack.example',
    },
  });
  await prisma.user.upsert({
    where: { phone: '+966500000003' },
    update: {
      email: 'carrier@nqlah.online', passwordHash: await hash('Carrier@1234'),
      role: 'CARRIER_ADMIN', companyRole: 'OWNER', isActive: true,
      isEmailVerified: true, isPhoneVerified: true, companyId: carrierCo.id,
    },
    create: {
      phone: '+966500000003', email: 'carrier@nqlah.online',
      passwordHash: await hash('Carrier@1234'), role: 'CARRIER_ADMIN', companyRole: 'OWNER',
      firstName: 'سلطان', lastName: 'القحطاني',
      isEmailVerified: true, isPhoneVerified: true, isActive: true, companyId: carrierCo.id,
    },
  });

  // A driver + two trucks for the carrier so the fleet/market isn't empty.
  const driverUser = await prisma.user.upsert({
    where: { phone: '+966550001122' },
    update: {},
    create: {
      phone: '+966550001122', firstName: 'أحمد', lastName: 'الغامدي',
      role: 'DRIVER', companyId: carrierCo.id, nationalId: '1023456789', preferredLanguage: 'ar',
    },
  });
  const driverProfile = await prisma.driverProfile.upsert({
    where: { licenseNumber: 'DL-100201' },
    update: { ownership: 'OWNED', status: 'AVAILABLE' },
    create: {
      userId: driverUser.id, companyId: carrierCo.id,
      licenseNumber: 'DL-100201', licenseExpiry: new Date('2027-06-12'),
      licenseType: 'حمولة ثقيلة', ownership: 'OWNED', status: 'AVAILABLE',
    },
  });
  const truck1 = await prisma.truck.upsert({
    where: { plateNumber: 'أ ب ح 1234' },
    update: { status: 'AVAILABLE' },
    create: {
      plateNumber: 'أ ب ح 1234', type: 'LARGE_FLATBED', capacity: 25,
      make: 'Mercedes', model: 'Actros', year: 2023, hasGPS: true,
      ownership: 'OWNED', status: 'AVAILABLE', companyId: carrierCo.id,
      currentDriverId: driverProfile.id,
    },
  });
  const truck2 = await prisma.truck.upsert({
    where: { plateNumber: 'د هـ و 5678' },
    update: { status: 'AVAILABLE' },
    create: {
      plateNumber: 'د هـ و 5678', type: 'BOX_TRUCK', capacity: 8,
      make: 'Isuzu', model: 'FVR', year: 2024, hasGPS: true,
      ownership: 'OWNED', status: 'AVAILABLE', companyId: carrierCo.id,
    },
  });
  // Publish them to the trucks marketplace so the customer-facing market isn't
  // empty (and the city filter has data to match).
  await prisma.truckAvailability.upsert({
    where: { truckId: truck1.id },
    update: { active: true, originCity: 'الدمام', originRegion: 'الشرقية', destCity: 'الرياض', destRegion: 'الرياض' },
    create: {
      truckId: truck1.id, companyId: carrierCo.id, active: true,
      originCity: 'الدمام', originRegion: 'الشرقية', destCity: 'الرياض', destRegion: 'الرياض',
      pricePerTrip: 3200, notes: 'متاحة للتحميل الفوري',
    },
  });
  await prisma.truckAvailability.upsert({
    where: { truckId: truck2.id },
    update: { active: true, originCity: 'الرياض', originRegion: 'الرياض', destCity: 'جدة', destRegion: 'مكة المكرمة' },
    create: {
      truckId: truck2.id, companyId: carrierCo.id, active: true,
      originCity: 'الرياض', originRegion: 'الرياض', destCity: 'جدة', destRegion: 'مكة المكرمة',
      pricePerTrip: 2600,
    },
  });

  // ─── 3. Individual provider (ناقل فرد / owner-driver) ────────────
  const indivCo = await prisma.company.upsert({
    where: { crNumber: '1010000005' },
    update: { status: 'ACTIVE', kycStatus: 'APPROVED' },
    create: {
      type: 'CARRIER', entityType: 'INDIVIDUAL', status: 'ACTIVE', kycStatus: 'APPROVED',
      nameAr: 'ناقل فرد — عبدالله', nameEn: 'Independent Hauler — Abdullah',
      crNumber: '1010000005', vatRegistered: false,
      city: 'جدة', region: 'مكة المكرمة',
      contactPhone: '+966500000004', contactEmail: 'provider@nqlah.online',
    },
  });
  const indivUser = await prisma.user.upsert({
    where: { phone: '+966500000004' },
    update: {
      email: 'provider@nqlah.online', passwordHash: await hash('Provider@1234'),
      role: 'CARRIER_ADMIN', companyRole: 'OWNER', isActive: true,
      isEmailVerified: true, isPhoneVerified: true, companyId: indivCo.id,
    },
    create: {
      phone: '+966500000004', email: 'provider@nqlah.online',
      passwordHash: await hash('Provider@1234'), role: 'CARRIER_ADMIN', companyRole: 'OWNER',
      firstName: 'عبدالله', lastName: 'الحربي',
      isEmailVerified: true, isPhoneVerified: true, isActive: true, companyId: indivCo.id,
    },
  });
  // Owner-driver: the individual owner is also a driver of his single truck.
  const indivDriver = await prisma.driverProfile.upsert({
    where: { licenseNumber: 'DL-200001' },
    update: { ownership: 'OWNED', status: 'AVAILABLE' },
    create: {
      userId: indivUser.id, companyId: indivCo.id,
      licenseNumber: 'DL-200001', licenseExpiry: new Date('2028-01-01'),
      licenseType: 'حمولة ثقيلة', ownership: 'OWNED', status: 'AVAILABLE',
    },
  });
  const indivTruck = await prisma.truck.upsert({
    where: { plateNumber: 'س ع ف 2468' },
    update: { status: 'AVAILABLE' },
    create: {
      plateNumber: 'س ع ف 2468', type: 'MEDIUM_FLATBED', capacity: 18,
      make: 'Scania', model: 'R500', year: 2022, hasGPS: true,
      ownership: 'OWNED', status: 'AVAILABLE', companyId: indivCo.id,
      currentDriverId: indivDriver.id,
    },
  });
  await prisma.truckAvailability.upsert({
    where: { truckId: indivTruck.id },
    update: { active: true, originCity: 'جدة', originRegion: 'مكة المكرمة', destCity: 'المدينة المنورة', destRegion: 'المدينة المنورة' },
    create: {
      truckId: indivTruck.id, companyId: indivCo.id, active: true,
      originCity: 'جدة', originRegion: 'مكة المكرمة', destCity: 'المدينة المنورة', destRegion: 'المدينة المنورة',
      pricePerTrip: 1800, notes: 'ناقل فرد — متاح',
    },
  });

  // ─── 4. A published order from the client (home: active shipment,
  //        market: an available load) ─────────────────────────────
  const order = await prisma.order.upsert({
    where: { orderNumber: 'ORD-DEMO-0001' },
    update: { status: 'PUBLISHED' },
    create: {
      orderNumber: 'ORD-DEMO-0001', status: 'PUBLISHED', clientId: clientCo.id,
      cargoType: 'GENERAL', cargoDescription: 'معدات صناعية',
      weight: 18000,
      originCity: 'الرياض', originRegion: 'الرياض', originAddress: 'المنطقة الصناعية الثانية',
      destinationCity: 'جدة', destinationRegion: 'مكة المكرمة', destinationAddress: 'ميناء جدة الإسلامي',
      requiredTruckType: 'LARGE_FLATBED',
      pickupDate: new Date(Date.now() + 86400000 * 3),
      clientBudget: 9500,
    },
  });
  // A second active order so "active shipments" shows more than one.
  await prisma.order.upsert({
    where: { orderNumber: 'ORD-DEMO-0002' },
    update: { status: 'PUBLISHED' },
    create: {
      orderNumber: 'ORD-DEMO-0002', status: 'PUBLISHED', clientId: clientCo.id,
      cargoType: 'FOOD', cargoDescription: 'شحنة مبرّدة',
      weight: 12000,
      originCity: 'الدمام', originRegion: 'الشرقية', originAddress: 'ميناء الملك عبدالعزيز',
      destinationCity: 'الرياض', destinationRegion: 'الرياض', destinationAddress: 'سوق الجملة',
      requiredTruckType: 'REFRIGERATED',
      pickupDate: new Date(Date.now() + 86400000 * 4),
      clientBudget: 7000,
    },
  });

  // ─── 5. A pending bid from the carrier on the client's order
  //        ("offers awaiting your decision") ──────────────────────
  const existingBid = await prisma.bid.findFirst({
    where: { orderId: order.id, carrierId: carrierCo.id, orderLegId: null },
  });
  if (!existingBid) {
    await prisma.bid.create({
      data: {
        orderId: order.id, carrierId: carrierCo.id, amount: 8800, status: 'PENDING',
        proposedDeliveryDate: new Date(Date.now() + 86400000 * 5),
        notes: 'عرض تجريبي — شاحنة متاحة فوراً',
      },
    });
  }

  console.log('✅ demo accounts ready:');
  console.log('   🏢 client   +966500000002 / client@nqlah.online   / Client@1234');
  console.log('   🚚 carrier  +966500000003 / carrier@nqlah.online  / Carrier@1234');
  console.log('   🧑 provider +966500000004 / provider@nqlah.online / Provider@1234 (فرد)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

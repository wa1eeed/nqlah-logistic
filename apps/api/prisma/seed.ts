import { PrismaClient } from '../src/generated/prisma';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ─── Demo credentials (login via email OR phone) ─────────────────
// Run: cd apps/api && pnpm db:seed
const ACCOUNTS = {
  admin: {
    email: 'admin@naqla.sa',
    phone: '+966500000001',
    password: 'Admin@1234',
    firstName: 'وليد',
    lastName: 'الحربي',
    role: 'SUPER_ADMIN' as const,
  },
  client: {
    email: 'client@naqla.sa',
    phone: '+966500000002',
    password: 'Client@1234',
    firstName: 'أحمد',
    lastName: 'العتيبي',
    role: 'CLIENT_ADMIN' as const,
  },
  carrier: {
    email: 'carrier@naqla.sa',
    phone: '+966500000003',
    password: 'Carrier@1234',
    firstName: 'سلطان',
    lastName: 'القحطاني',
    role: 'CARRIER_ADMIN' as const,
  },
};

async function main() {
  console.log('🌱 Seeding Naqla database...');

  // ─── Settings ────────────────────────────────────────────────
  // Keys use snake_case; `category` lets the admin UI group them into sections.
  // White-label keys (`platform_*`) drive branding and are mutable from the
  // admin panel without redeployment.
  const defaultSettings = [
    // Finance
    { key: 'commission_default_rate', value: '0.08', category: 'finance' },
    { key: 'vat_rate', value: '0.15', category: 'finance' },

    // White-label / branding
    { key: 'platform_name_ar', value: 'نقلة لوجيستك', category: 'branding' },
    { key: 'platform_name_en', value: 'Naqla Logistics', category: 'branding' },
    { key: 'platform_logo', value: '', category: 'branding' }, // URL to logo (PNG/SVG)

    // Localization defaults
    { key: 'default_locale', value: 'ar', category: 'localization' },
    { key: 'default_direction', value: 'rtl', category: 'localization' },
    { key: 'default_currency', value: 'SAR', category: 'localization' },
    { key: 'default_timezone', value: 'Asia/Riyadh', category: 'localization' },
    { key: 'default_date_format', value: 'DD/MM/YYYY', category: 'localization' },

    // Contact
    { key: 'support_phone', value: '+966570009449', category: 'general' },
  ];
  for (const s of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      create: s,
      update: { value: s.value },
    });
  }

  // ─── Super admin ─────────────────────────────────────────────
  const adminPass = await bcrypt.hash(ACCOUNTS.admin.password, 12);
  await prisma.user.upsert({
    where: { phone: ACCOUNTS.admin.phone },
    create: {
      phone: ACCOUNTS.admin.phone,
      email: ACCOUNTS.admin.email,
      passwordHash: adminPass,
      role: ACCOUNTS.admin.role,
      firstName: ACCOUNTS.admin.firstName,
      lastName: ACCOUNTS.admin.lastName,
      isEmailVerified: true,
      isPhoneVerified: true,
      isActive: true,
    },
    update: {
      email: ACCOUNTS.admin.email,
      passwordHash: adminPass,
      role: ACCOUNTS.admin.role,
      isActive: true,
      isEmailVerified: true,
      isPhoneVerified: true,
    },
  });

  // ─── Demo client company ─────────────────────────────────────
  const clientCo = await prisma.company.upsert({
    where: { crNumber: '1010000001' },
    create: {
      type: 'CLIENT',
      status: 'ACTIVE',
      kycStatus: 'APPROVED',
      nameAr: 'شركة الجزيرة للطاقة',
      nameEn: 'Aljazeera Energy Co.',
      crNumber: '1010000001',
      vatNumber: '300000000000003',
      city: 'الرياض',
      region: 'الرياض',
      contactPhone: '+966112000001',
      contactEmail: 'ops@jazeera-energy.example',
      commissionRate: 0.08,
    },
    update: { status: 'ACTIVE', kycStatus: 'APPROVED' },
  });

  const clientPass = await bcrypt.hash(ACCOUNTS.client.password, 12);
  await prisma.user.upsert({
    where: { phone: ACCOUNTS.client.phone },
    create: {
      phone: ACCOUNTS.client.phone,
      email: ACCOUNTS.client.email,
      passwordHash: clientPass,
      role: ACCOUNTS.client.role,
      firstName: ACCOUNTS.client.firstName,
      lastName: ACCOUNTS.client.lastName,
      isEmailVerified: true,
      isPhoneVerified: true,
      isActive: true,
      companyId: clientCo.id,
    },
    update: {
      email: ACCOUNTS.client.email,
      passwordHash: clientPass,
      role: ACCOUNTS.client.role,
      isActive: true,
      isEmailVerified: true,
      isPhoneVerified: true,
      companyId: clientCo.id,
    },
  });

  // ─── Demo carrier company ────────────────────────────────────
  const carrierCo = await prisma.company.upsert({
    where: { crNumber: '1010000002' },
    create: {
      type: 'CARRIER',
      status: 'ACTIVE',
      kycStatus: 'APPROVED',
      nameAr: 'شركة المسار السريع للنقل',
      nameEn: 'Fast Track Transport',
      crNumber: '1010000002',
      vatNumber: '300000000000004',
      city: 'الدمام',
      region: 'الشرقية',
      contactPhone: '+966138000001',
      contactEmail: 'ops@fasttrack.example',
      commissionRate: 0.08,
    },
    update: { status: 'ACTIVE', kycStatus: 'APPROVED' },
  });

  const carrierPass = await bcrypt.hash(ACCOUNTS.carrier.password, 12);
  await prisma.user.upsert({
    where: { phone: ACCOUNTS.carrier.phone },
    create: {
      phone: ACCOUNTS.carrier.phone,
      email: ACCOUNTS.carrier.email,
      passwordHash: carrierPass,
      role: ACCOUNTS.carrier.role,
      firstName: ACCOUNTS.carrier.firstName,
      lastName: ACCOUNTS.carrier.lastName,
      isEmailVerified: true,
      isPhoneVerified: true,
      isActive: true,
      companyId: carrierCo.id,
    },
    update: {
      email: ACCOUNTS.carrier.email,
      passwordHash: carrierPass,
      role: ACCOUNTS.carrier.role,
      isActive: true,
      isEmailVerified: true,
      isPhoneVerified: true,
      companyId: carrierCo.id,
    },
  });

  // ─── Drivers + Trucks (owned vs freelancer) ──────────────────
  // Saudi-format plates ("letters numbers") so the plate component renders
  // correctly. Ownership is mixed to demo the provider-dispatcher feature.
  const DRIVERS_SEED = [
    { fullName: 'أحمد الغامدي',   phone: '+966550001122', nationalId: '1023456789', licenseNumber: 'DL-100201', licenseExpiry: '2027-06-12', licenseType: 'تركيب وقاطرة', ownership: 'OWNED' as const,      status: 'ON_TRIP' as const },
    { fullName: 'فهد الدوسري',    phone: '+966550004455', nationalId: '1077889900', licenseNumber: 'DL-100204', licenseExpiry: '2027-09-18', licenseType: 'حمولة ثقيلة',   ownership: 'OWNED' as const,      status: 'AVAILABLE' as const },
    { fullName: 'خالد العتيبي',   phone: '+966550002233', nationalId: '1029988776', licenseNumber: 'DL-100202', licenseExpiry: '2028-02-25', licenseType: 'حمولة ثقيلة',   ownership: 'OWNED' as const,      status: 'AVAILABLE' as const },
    { fullName: 'ماجد الشهري',    phone: '+966550005566', nationalId: '1055667788', licenseNumber: 'DL-100205', licenseExpiry: '2027-03-30', licenseType: 'حمولة ثقيلة',   ownership: 'FREELANCER' as const, status: 'OFF_DUTY' as const },
    { fullName: 'سلطان القحطاني', phone: '+966550003344', nationalId: '1011223344', licenseNumber: 'DL-100203', licenseExpiry: '2026-11-04', licenseType: 'حمولة استثنائية', ownership: 'FREELANCER' as const, status: 'AVAILABLE' as const },
  ];
  const driverIds: Record<string, string> = {};
  for (const d of DRIVERS_SEED) {
    const [firstName, ...rest] = d.fullName.split(' ');
    const u = await prisma.user.upsert({
      where: { phone: d.phone },
      update: {},
      create: {
        phone: d.phone, firstName, lastName: rest.join(' ') || '', role: 'DRIVER',
        companyId: carrierCo.id, nationalId: d.nationalId, preferredLanguage: 'ar',
      },
    });
    const p = await prisma.driverProfile.upsert({
      where: { licenseNumber: d.licenseNumber },
      update: { ownership: d.ownership, status: d.status },
      create: {
        userId: u.id, companyId: carrierCo.id,
        licenseNumber: d.licenseNumber, licenseExpiry: new Date(d.licenseExpiry),
        licenseType: d.licenseType, ownership: d.ownership, status: d.status,
      },
    });
    driverIds[d.licenseNumber] = p.id;
  }

  const TRUCKS_SEED = [
    { plateNumber: 'أ ب ح 1234', type: 'LARGE_FLATBED' as const, capacity: 25, make: 'Mercedes', model: 'Actros', year: 2023, hasGPS: true,  ownership: 'OWNED' as const,      status: 'ON_TRIP' as const,     driver: 'DL-100201' },
    { plateNumber: 'د هـ و 5678', type: 'BOX_TRUCK' as const,     capacity: 8,  make: 'Isuzu',    model: 'FVR',    year: 2024, hasGPS: true,  ownership: 'OWNED' as const,      status: 'AVAILABLE' as const,   driver: 'DL-100204' },
    { plateNumber: 'ر ح ط 9012', type: 'REFRIGERATED' as const,  capacity: 15, make: 'Volvo',    model: 'FH16',   year: 2022, hasGPS: true, hasRefrigeration: true, ownership: 'OWNED' as const, status: 'AVAILABLE' as const, driver: 'DL-100202' },
    { plateNumber: 'ي ك ل 3456', type: 'MEDIUM_FLATBED' as const, capacity: 18, make: 'Scania',   model: 'R500',   year: 2021, hasGPS: true,  ownership: 'FREELANCER' as const, status: 'MAINTENANCE' as const, driver: 'DL-100205' },
    { plateNumber: 'م ن س 7890', type: 'LOWBED' as const,        capacity: 50, make: 'MAN',      model: 'TGX',    year: 2023, hasGPS: true,  ownership: 'FREELANCER' as const, status: 'AVAILABLE' as const,   driver: 'DL-100203' },
  ];
  const truckIds: Record<string, string> = {}; // plateNumber -> id
  for (const t of TRUCKS_SEED) {
    const { driver, ...data } = t;
    const row = await prisma.truck.upsert({
      where: { plateNumber: t.plateNumber },
      update: { ownership: t.ownership, status: t.status, currentDriverId: driverIds[driver] },
      create: { ...data, companyId: carrierCo.id, currentDriverId: driverIds[driver] },
    });
    truckIds[t.plateNumber] = row.id;
  }

  // ─── Freelancer invoices (per-trip fees to freelance trucks/drivers) ──
  // Historical trips for the two freelancer trucks. orderRevenue snapshots the
  // client-side earning so the profitability page shows margins directly.
  const FREELANCER_INVOICES_SEED = [
    { orderNumber: 'ORD-2025-0170', plate: 'م ن س 7890', license: 'DL-100203', amount: 116000, orderRevenue: 162000, status: 'PAID' as const,  issuedAt: '2026-05-20T10:00:00Z', paidAt: '2026-05-23T09:00:00Z' },
    { orderNumber: 'ORD-2025-0158', plate: 'م ن س 7890', license: 'DL-100203', amount: 133000, orderRevenue: 184500, status: 'DUE' as const,   issuedAt: '2026-04-26T17:00:00Z' },
    { orderNumber: 'ORD-2025-0144', plate: 'م ن س 7890', license: 'DL-100203', amount: 100000, orderRevenue: 139800, status: 'PAID' as const,  issuedAt: '2026-04-03T16:00:00Z', paidAt: '2026-04-06T11:00:00Z' },
    { orderNumber: 'ORD-2025-0071', plate: 'ي ك ل 3456', license: 'DL-100205', amount: 43000,  orderRevenue: 59300,  status: 'DUE' as const,   issuedAt: '2026-02-03T13:00:00Z' },
    { orderNumber: 'ORD-2025-0063', plate: 'ي ك ل 3456', license: 'DL-100205', amount: 13000,  orderRevenue: 18400,  status: 'PAID' as const,  issuedAt: '2026-01-19T12:00:00Z', paidAt: '2026-01-21T10:00:00Z' },
  ];
  for (const inv of FREELANCER_INVOICES_SEED) {
    await prisma.freelancerInvoice.upsert({
      where: { carrierId_orderId_truckId: { carrierId: carrierCo.id, orderId: inv.orderNumber, truckId: truckIds[inv.plate] } },
      update: { amount: inv.amount, orderRevenue: inv.orderRevenue, status: inv.status, paidAt: inv.paidAt ? new Date(inv.paidAt) : null },
      create: {
        carrierId: carrierCo.id,
        orderId: inv.orderNumber,
        orderNumber: inv.orderNumber,
        truckId: truckIds[inv.plate],
        driverId: driverIds[inv.license],
        amount: inv.amount,
        orderRevenue: inv.orderRevenue,
        status: inv.status,
        issuedAt: new Date(inv.issuedAt),
        paidAt: inv.paidAt ? new Date(inv.paidAt) : null,
      },
    });
  }

  // ─── Demo Order ──────────────────────────────────────────────
  const existing = await prisma.order.findFirst({ where: { clientId: clientCo.id } });
  if (!existing) {
    await prisma.order.create({
      data: {
        orderNumber: 'ORD-2025-0150',
        status: 'PUBLISHED',
        clientId: clientCo.id,
        cargoType: 'GENERAL',
        cargoDescription: 'معدات صناعية',
        weight: 18000,
        originCity: 'الرياض',
        originRegion: 'الرياض',
        originAddress: 'المنطقة الصناعية الثانية',
        destinationCity: 'جدة',
        destinationRegion: 'مكة المكرمة',
        destinationAddress: 'ميناء جدة الإسلامي',
        requiredTruckType: 'LARGE_FLATBED',
        pickupDate: new Date(Date.now() + 86400000 * 3),
        clientBudget: 9500,
      },
    });
  }

  // ─── Consolidated order (multi-truck, same route) ────────────
  // 5 trucks along Riyadh -> Dammam; 2 legs pre-distributed to the carrier's
  // own trucks so the distribution board + status rollup have live data.
  const consolidated = await prisma.order.upsert({
    where: { orderNumber: 'ORD-2025-0180' },
    update: { orderType: 'CONSOLIDATED', truckCount: 5, carrierId: carrierCo.id },
    create: {
      orderNumber: 'ORD-2025-0180',
      status: 'ASSIGNED',
      orderType: 'CONSOLIDATED',
      truckCount: 5,
      clientId: clientCo.id,
      carrierId: carrierCo.id,
      mode: 'DIRECT',
      cargoType: 'CONSTRUCTION',
      cargoDescription: 'مواد بناء - شحنة مجمّعة',
      weight: 120000,
      originCity: 'الرياض',
      originRegion: 'الرياض',
      originAddress: 'مستودعات الصناعية',
      destinationCity: 'الدمام',
      destinationRegion: 'الشرقية',
      destinationAddress: 'ميناء الملك عبدالعزيز',
      requiredTruckType: 'LARGE_FLATBED',
      pickupDate: new Date(Date.now() + 86400000 * 2),
      agreedPrice: 190000,
      carrierAmount: 190000,
    },
  });
  const LEGS_SEED = [
    { sequence: 1, plate: 'أ ب ح 1234', license: 'DL-100201', status: 'IN_TRANSIT' },
    { sequence: 2, plate: 'ر ح ط 9012', license: 'DL-100202', status: 'ASSIGNED' },
  ];
  for (const leg of LEGS_SEED) {
    await prisma.orderTruck.upsert({
      where: { orderId_sequence: { orderId: consolidated.id, sequence: leg.sequence } },
      update: { truckId: truckIds[leg.plate], driverId: driverIds[leg.license], status: leg.status },
      create: {
        orderId: consolidated.id,
        sequence: leg.sequence,
        truckId: truckIds[leg.plate],
        driverId: driverIds[leg.license],
        status: leg.status,
      },
    });
  }

  console.log('');
  console.log('✅ Seed complete. Demo accounts (email or phone both work):');
  console.log('');
  console.log(`   👑 Admin   → ${ACCOUNTS.admin.email}   |  ${ACCOUNTS.admin.phone}  |  ${ACCOUNTS.admin.password}`);
  console.log(`   🏢 Client  → ${ACCOUNTS.client.email}  |  ${ACCOUNTS.client.phone}  |  ${ACCOUNTS.client.password}`);
  console.log(`   🚚 Carrier → ${ACCOUNTS.carrier.email} |  ${ACCOUNTS.carrier.phone}  |  ${ACCOUNTS.carrier.password}`);
  console.log('');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

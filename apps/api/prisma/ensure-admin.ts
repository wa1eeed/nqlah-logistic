/**
 * Create or update the super-admin from env — WITHOUT any demo data.
 *
 * Use this in production (where the demo seed is not wanted) and whenever the
 * admin credentials change: set SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD in the
 * environment (Coolify variables) and run:
 *
 *   node dist/prisma/ensure-admin.js      # in the API container
 *   # or locally:  pnpm --filter @naqla/api db:ensure-admin
 *
 * The admin record is keyed by a fixed internal phone, so changing the email
 * and/or password updates the same user in place.
 */
import { PrismaClient } from '../src/generated/prisma';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const ADMIN_PHONE = '+966500000001';
const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@naqla.sa';
const password = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@1234';

async function main() {
  if (process.env.NODE_ENV === 'production' && password === 'Admin@1234') {
    console.warn('⚠️  Using the default admin password in production — set SEED_ADMIN_PASSWORD.');
  }
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { phone: ADMIN_PHONE },
    create: {
      phone: ADMIN_PHONE,
      email,
      passwordHash,
      role: 'SUPER_ADMIN',
      firstName: 'مدير',
      lastName: 'المنصة',
      isEmailVerified: true,
      isPhoneVerified: true,
      isActive: true,
    },
    update: {
      email,
      passwordHash,
      role: 'SUPER_ADMIN',
      isActive: true,
      isEmailVerified: true,
      isPhoneVerified: true,
    },
  });
  console.log(`✅ Super-admin ready: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

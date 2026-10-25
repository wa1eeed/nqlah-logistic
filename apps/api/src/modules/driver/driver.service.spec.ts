import { NotFoundException } from '@nestjs/common';
import { DriverService } from './driver.service';

const driverActor = { id: 'user-d1', role: 'DRIVER', companyId: 'car-1' } as never;

function makeService(profile: Record<string, unknown> | null, orders: unknown[] = []) {
  const prisma = {
    driverProfile: { findUnique: jest.fn(async () => profile) },
    order: { findMany: jest.fn(async () => orders) },
  };
  return { svc: new DriverService(prisma as never), prisma };
}
const PROFILE = {
  id: 'drv-1', status: 'AVAILABLE', ownership: 'FREELANCER', rating: 5, totalTrips: 3,
  currentLat: null, currentLng: null,
  user: { firstName: 'Sami', lastName: 'A', phone: '+9665…' },
  company: { id: 'car-1', nameAr: 'ناقل', nameEn: 'Carrier' },
};

describe('DriverService', () => {
  it('allows any user with a driver profile, regardless of role', async () => {
    // An individual operator (role CARRIER_ADMIN) with a driver profile is a driver.
    const { svc } = makeService(PROFILE);
    await expect(svc.me({ id: 'u', role: 'CARRIER_ADMIN', companyId: 'c' } as never))
      .resolves.toMatchObject({ id: 'drv-1' });
  });

  it('404s when the user has no driver profile', async () => {
    const { svc } = makeService(null);
    await expect(svc.me(driverActor)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns the driver profile summary', async () => {
    const { svc } = makeService(PROFILE);
    await expect(svc.me(driverActor)).resolves.toMatchObject({ id: 'drv-1', name: 'Sami A', ownership: 'FREELANCER' });
  });

  it('queries active jobs by both single and consolidated assignment', async () => {
    const { svc, prisma } = makeService(PROFILE, [{ id: 'o1' }]);
    await svc.jobs(driverActor);
    const calls = prisma.order.findMany.mock.calls as unknown as Array<[{ where: { OR: unknown } }]>;
    const arg = calls[0][0];
    expect(arg.where.OR).toEqual([
      { orderDrivers: { some: { driverId: 'drv-1' } } },
      { orderTrucks: { some: { driverId: 'drv-1' } } },
    ]);
  });
});

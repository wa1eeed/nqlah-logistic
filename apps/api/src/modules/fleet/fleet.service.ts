import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { normalizeSaudiPhone } from '@naqla/shared-utils';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateDriverDto, CreateTruckDto, InviteDriverDto, LocationDto, UpdateTruckDto } from './dto/fleet.dto';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';
import type { AuthUser } from '../../common/decorators/current-user.decorator';

type TruckStatusValue = 'AVAILABLE' | 'ON_TRIP' | 'MAINTENANCE' | 'OFF_DUTY';
type DriverStatusValue = 'AVAILABLE' | 'ON_TRIP' | 'OFF_DUTY';

/** A readable temporary login password handed to a newly-invited driver. */
function genTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let s = '';
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `Nq${s}`; // ≥ 8 chars, mixed case + digits
}

/** Truck status → the status its linked driver should take. */
function truckStatusToDriver(status: TruckStatusValue): DriverStatusValue {
  if (status === 'ON_TRIP') return 'ON_TRIP';
  if (status === 'AVAILABLE') return 'AVAILABLE';
  return 'OFF_DUTY'; // MAINTENANCE | OFF_DUTY → driver off duty
}

/** Driver status → the status its linked truck should take (maintenance wins). */
function driverStatusToTruck(status: DriverStatusValue, current: TruckStatusValue): TruckStatusValue {
  if (current === 'MAINTENANCE') return 'MAINTENANCE';
  if (status === 'ON_TRIP') return 'ON_TRIP';
  if (status === 'AVAILABLE') return 'AVAILABLE';
  return 'OFF_DUTY';
}

@Injectable()
export class FleetService {
  constructor(private prisma: PrismaService) {}

  async listTrucks(query: PaginationDto, actor: AuthUser) {
    if (!actor.companyId) throw new BadRequestException({ code: 'NO_COMPANY', message: 'لا توجد شركة' });
    const { page = 1, limit = 20, sort = 'createdAt', order = 'desc', search } = query;
    const where = {
      companyId: actor.companyId,
      ...(search ? { plateNumber: { contains: search, mode: 'insensitive' as const } } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.truck.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { [sort]: order } }),
      this.prisma.truck.count({ where }),
    ]);
    return paginate(items, total, page, limit);
  }

  async createTruck(dto: CreateTruckDto, actor: AuthUser) {
    if (!actor.companyId) throw new BadRequestException({ code: 'NO_COMPANY', message: 'لا توجد شركة' });
    return this.prisma.truck.create({
      data: { ...dto, companyId: actor.companyId, photos: dto.photos ?? [], documents: dto.documents ?? [] },
    });
  }

  async getTruck(id: string, actor: AuthUser) {
    const truck = await this.prisma.truck.findUnique({ where: { id }, include: { currentDriver: true } });
    if (!truck) throw new NotFoundException({ code: 'TRUCK_NOT_FOUND', message: 'الشاحنة غير موجودة' });
    if (truck.companyId !== actor.companyId && !this.isAdmin(actor)) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'لا تملك صلاحية' });
    }
    return truck;
  }

  async updateTruck(id: string, dto: UpdateTruckDto, actor: AuthUser) {
    await this.getTruck(id, actor);
    return this.prisma.truck.update({
      where: { id },
      data: { ...dto, photos: dto.photos ?? undefined, documents: dto.documents ?? undefined },
    });
  }

  /** Link a driver to a truck. The driver is freed from any other truck, the
   *  truck's previous driver goes off-duty, and the new driver inherits the
   *  truck's status (same rules as the carrier fleet UI). */
  async assignDriverToTruck(truckId: string, driverId: string, actor: AuthUser) {
    const truck = await this.getTruck(truckId, actor);
    const driver = await this.getDriver(driverId, actor);
    return this.prisma.$transaction(async (tx) => {
      // Free the driver from any other truck of this company.
      await tx.truck.updateMany({
        where: { currentDriverId: driverId, companyId: truck.companyId, id: { not: truckId } },
        data: { currentDriverId: null },
      });
      // The truck's previous driver (if different) becomes free → off duty.
      if (truck.currentDriverId && truck.currentDriverId !== driverId) {
        await tx.driverProfile.update({ where: { id: truck.currentDriverId }, data: { status: 'OFF_DUTY' } });
      }
      await tx.driverProfile.update({
        where: { id: driverId },
        data: { status: truckStatusToDriver(truck.status) },
      });
      return tx.truck.update({
        where: { id: truckId },
        data: { currentDriverId: driverId },
        include: { currentDriver: { include: { user: true } } },
      });
    });
  }

  /** Unlink the truck's current driver (driver goes off-duty). */
  async unassignTruck(truckId: string, actor: AuthUser) {
    const truck = await this.getTruck(truckId, actor);
    return this.prisma.$transaction(async (tx) => {
      if (truck.currentDriverId) {
        await tx.driverProfile.update({ where: { id: truck.currentDriverId }, data: { status: 'OFF_DUTY' } });
      }
      return tx.truck.update({ where: { id: truckId }, data: { currentDriverId: null } });
    });
  }

  /** Set a truck's status and sync its linked driver. */
  async setTruckStatus(truckId: string, status: TruckStatusValue, actor: AuthUser) {
    const truck = await this.getTruck(truckId, actor);
    return this.prisma.$transaction(async (tx) => {
      if (truck.currentDriverId) {
        await tx.driverProfile.update({
          where: { id: truck.currentDriverId },
          data: { status: truckStatusToDriver(status) },
        });
      }
      return tx.truck.update({ where: { id: truckId }, data: { status } });
    });
  }

  /** Set a driver's status and sync its linked truck (maintenance wins). */
  async setDriverStatus(driverId: string, status: DriverStatusValue, actor: AuthUser) {
    await this.getDriver(driverId, actor);
    return this.prisma.$transaction(async (tx) => {
      const truck = await tx.truck.findFirst({ where: { currentDriverId: driverId } });
      if (truck) {
        await tx.truck.update({
          where: { id: truck.id },
          data: { status: driverStatusToTruck(status, truck.status) },
        });
      }
      return tx.driverProfile.update({ where: { id: driverId }, data: { status } });
    });
  }

  async listDrivers(query: PaginationDto, actor: AuthUser) {
    if (!actor.companyId) throw new BadRequestException({ code: 'NO_COMPANY', message: 'لا توجد شركة' });
    const { page = 1, limit = 20, sort = 'createdAt', order = 'desc' } = query;
    const where = { companyId: actor.companyId };
    const [items, total] = await Promise.all([
      this.prisma.driverProfile.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { [sort]: order },
        include: { user: { select: { firstName: true, lastName: true, phone: true, avatar: true } } },
      }),
      this.prisma.driverProfile.count({ where }),
    ]);
    return paginate(items, total, page, limit);
  }

  async createDriver(dto: CreateDriverDto, actor: AuthUser) {
    if (!actor.companyId) throw new BadRequestException({ code: 'NO_COMPANY', message: 'لا توجد شركة' });
    return this.prisma.driverProfile.create({
      data: {
        userId: dto.userId,
        companyId: actor.companyId,
        licenseNumber: dto.licenseNumber,
        licenseExpiry: new Date(dto.licenseExpiry),
        licenseType: dto.licenseType,
        photo: dto.photo,
        status: 'AVAILABLE',
      },
    });
  }

  async inviteDriver(dto: InviteDriverDto, actor: AuthUser) {
    if (!actor.companyId) throw new BadRequestException({ code: 'NO_COMPANY', message: 'لا توجد شركة' });
    // Normalize the phone exactly as login does, so the driver can sign in to
    // the driver portal afterwards.
    const phone = normalizeSaudiPhone(dto.phone);
    const existing = await this.prisma.user.findFirst({ where: { phone } });
    if (existing) {
      throw new BadRequestException({ code: 'PHONE_TAKEN', message: 'رقم الهاتف مستخدم بالفعل' });
    }
    // The carrier sets the driver's login password, or we generate a temporary
    // one to hand over. The phone is carrier-vouched, so it starts verified.
    const generated = !dto.password;
    const plainPassword = dto.password ?? genTempPassword();
    const passwordHash = await bcrypt.hash(plainPassword, Number(process.env.BCRYPT_ROUNDS ?? 12));

    const profile = await this.prisma.$transaction(async (tx) => {
      const [firstName, ...rest] = dto.fullName.trim().split(' ');
      const user = await tx.user.create({
        data: {
          phone,
          passwordHash,
          isPhoneVerified: true,
          firstName: firstName ?? dto.fullName,
          lastName: rest.join(' ') || '',
          role: 'DRIVER',
          companyId: actor.companyId!,
          nationalId: dto.nationalId,
          preferredLanguage: 'ar',
        },
      });
      return tx.driverProfile.create({
        data: {
          userId: user.id,
          companyId: actor.companyId!,
          licenseNumber: dto.licenseNumber,
          licenseExpiry: new Date(dto.licenseExpiry),
          licenseType: dto.licenseType,
          ownership: dto.ownership ?? 'OWNED',
          photo: dto.photo,
          status: 'AVAILABLE',
        },
        include: { user: { select: { id: true, firstName: true, lastName: true, phone: true } } },
      });
    });
    // Return the login details once so the carrier can hand them to the driver;
    // `tempPassword` is present only when the system generated it.
    return { ...profile, loginPhone: phone, ...(generated ? { tempPassword: plainPassword } : {}) };
  }

  async getAvailableDrivers(actor: AuthUser) {
    if (!actor.companyId) throw new BadRequestException({ code: 'NO_COMPANY', message: 'لا توجد شركة' });
    // Drivers currently assigned to an active order.
    const busy = await this.prisma.orderDriver.findMany({
      where: { order: { status: { in: ['ASSIGNED', 'CONFIRMED', 'IN_TRANSIT'] } } },
      select: { driverId: true },
    });
    const busyIds = busy.map((d) => d.driverId);
    return this.prisma.driverProfile.findMany({
      where: {
        companyId: actor.companyId,
        status: 'AVAILABLE',
        isActive: true,
        ...(busyIds.length > 0 ? { id: { notIn: busyIds } } : {}),
      },
      include: { user: { select: { firstName: true, lastName: true, phone: true, avatar: true } } },
      orderBy: { rating: 'desc' },
    });
  }

  async getDriver(id: string, actor: AuthUser) {
    const driver = await this.prisma.driverProfile.findUnique({
      where: { id }, include: { user: true },
    });
    if (!driver) throw new NotFoundException({ code: 'DRIVER_NOT_FOUND', message: 'السائق غير موجود' });
    if (driver.companyId !== actor.companyId && !this.isAdmin(actor)) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'لا تملك صلاحية' });
    }
    return driver;
  }

  async updateDriverLocation(id: string, dto: LocationDto, actor: AuthUser) {
    // The driver can update their own location; carrier admin can too.
    const driver = await this.prisma.driverProfile.findUnique({ where: { id } });
    if (!driver) throw new NotFoundException({ code: 'DRIVER_NOT_FOUND', message: 'السائق غير موجود' });
    if (driver.userId !== actor.id && driver.companyId !== actor.companyId && !this.isAdmin(actor)) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'لا تملك صلاحية' });
    }
    await this.prisma.locationHistory.create({
      data: { driverId: id, lat: dto.lat, lng: dto.lng, speed: dto.speed },
    });
    return this.prisma.driverProfile.update({
      where: { id },
      data: { currentLat: dto.lat, currentLng: dto.lng, lastLocationAt: new Date() },
    });
  }

  private isAdmin(actor: AuthUser): boolean {
    return actor.role === 'ADMIN' || actor.role === 'SUPER_ADMIN';
  }
}

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { AuthUser } from '../../common/decorators/current-user.decorator';

interface LocationDto { lat: number; lng: number; speed?: number }

const ACTIVE_STATUSES = ['ASSIGNED', 'CONFIRMED', 'IN_TRANSIT', 'DELIVERED'] as const;

/**
 * The driver-facing API surface consumed by the drivers portal and the unified
 * driver app: the acting driver's profile, the jobs assigned to them (single
 * orders via OrderDriver, or consolidated legs via OrderTruck.driverId) with
 * their route stops, and location reporting. Stop execution reuses
 * `PATCH /orders/:id/stops/:stopId` (which already permits the DRIVER role).
 */
@Injectable()
export class DriverService {
  constructor(private prisma: PrismaService) {}

  private async requireProfile(actor: AuthUser) {
    // A "driver" is anyone with a driver profile — a carrier-invited driver
    // (role DRIVER) or an individual operator who is their own carrier+driver
    // (role CARRIER_ADMIN). Access is by profile, not by role.
    const profile = await this.prisma.driverProfile.findUnique({
      where: { userId: actor.id },
      include: {
        user: { select: { firstName: true, lastName: true, phone: true } },
        company: { select: { id: true, nameAr: true, nameEn: true } },
      },
    });
    if (!profile) throw new NotFoundException({ code: 'DRIVER_NOT_FOUND', message: 'ملف السائق غير موجود' });
    return profile;
  }

  async me(actor: AuthUser) {
    const p = await this.requireProfile(actor);
    return {
      id: p.id,
      name: [p.user.firstName, p.user.lastName].filter(Boolean).join(' '),
      phone: p.user.phone,
      status: p.status,
      ownership: p.ownership,
      rating: p.rating,
      totalTrips: p.totalTrips,
      company: p.company,
      currentLat: p.currentLat,
      currentLng: p.currentLng,
    };
  }

  /** Active orders assigned to the acting driver, each with its route stops. */
  async jobs(actor: AuthUser) {
    const p = await this.requireProfile(actor);
    const orders = await this.prisma.order.findMany({
      where: {
        status: { in: [...ACTIVE_STATUSES] },
        OR: [
          { orderDrivers: { some: { driverId: p.id } } },
          { orderTrucks: { some: { driverId: p.id } } },
        ],
      },
      orderBy: { pickupDate: 'asc' },
      select: {
        id: true, orderNumber: true, status: true, cargoDescription: true,
        originCity: true, destinationCity: true, pickupDate: true, deliveryDate: true,
        client: { select: { nameAr: true, nameEn: true, contactPhone: true } },
        stops: { orderBy: { sequence: 'asc' } },
      },
    });
    return orders;
  }

  /**
   * The driver sets their own duty status — «متفرّغ لاستقبال الطلبات» (AVAILABLE)
   * or «أنهيت دوامي» (OFF_DUTY). This governs whether NEW orders are offered to
   * them; a driver who is OFF_DUTY but already has a live order keeps being
   * tracked (that is driven by the active order, not by duty). Can't be changed
   * mid-trip (ON_TRIP) — finish the trip first.
   */
  async setDuty(actor: AuthUser, status: 'AVAILABLE' | 'OFF_DUTY') {
    const p = await this.requireProfile(actor);
    if (p.status === 'ON_TRIP') {
      throw new BadRequestException({
        code: 'DRIVER_ON_TRIP',
        message: 'لا يمكن تغيير حالة الدوام أثناء رحلة جارية',
      });
    }
    const updated = await this.prisma.driverProfile.update({
      where: { id: p.id },
      data: { status },
      select: { status: true },
    });
    return { status: updated.status };
  }

  async updateLocation(actor: AuthUser, dto: LocationDto) {
    const p = await this.requireProfile(actor);
    await this.prisma.locationHistory.create({
      data: { driverId: p.id, lat: dto.lat, lng: dto.lng, speed: dto.speed },
    });
    return this.prisma.driverProfile.update({
      where: { id: p.id },
      data: { currentLat: dto.lat, currentLng: dto.lng, lastLocationAt: new Date() },
      select: { id: true, currentLat: true, currentLng: true, lastLocationAt: true },
    });
  }
}

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PublishAvailabilityDto } from './dto/availability.dto';
import type { AuthUser } from '../../common/decorators/current-user.decorator';

// Order statuses for which a truck is considered busy and must never appear in
// the customer marketplace.
const ACTIVE_ORDER_STATUSES = ['ASSIGNED', 'CONFIRMED', 'IN_TRANSIT'] as const;

@Injectable()
export class MarketplaceService {
  constructor(private prisma: PrismaService) {}

  private isAdmin(actor: AuthUser) {
    return actor.role === 'SUPER_ADMIN' || actor.role === 'ADMIN';
  }

  private async requireOwnTruck(truckId: string, actor: AuthUser) {
    const truck = await this.prisma.truck.findUnique({ where: { id: truckId } });
    if (!truck) throw new NotFoundException({ code: 'TRUCK_NOT_FOUND', message: 'الشاحنة غير موجودة' });
    if (truck.companyId !== actor.companyId && !this.isAdmin(actor)) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'لا تملك صلاحية' });
    }
    return truck;
  }

  /// Carrier publishes a truck to the marketplace (idempotent per truck).
  async publish(truckId: string, dto: PublishAvailabilityDto, actor: AuthUser) {
    if (!actor.companyId) throw new BadRequestException({ code: 'NO_COMPANY', message: 'لا توجد شركة' });
    await this.requireOwnTruck(truckId, actor);
    const data = {
      companyId: actor.companyId,
      originCity: dto.originCity,
      originRegion: dto.originRegion,
      destCity: dto.destCity ?? null,
      destRegion: dto.destRegion ?? null,
      availableFrom: dto.availableFrom ? new Date(dto.availableFrom) : new Date(),
      availableTo: dto.availableTo ? new Date(dto.availableTo) : null,
      pricePerTrip: dto.pricePerTrip ?? null,
      notes: dto.notes ?? null,
      active: true,
    };
    return this.prisma.truckAvailability.upsert({
      where: { truckId },
      create: { truckId, ...data },
      update: data,
    });
  }

  /// Carrier unpublishes a truck (keeps the record, flips it inactive).
  async unpublish(truckId: string, actor: AuthUser) {
    await this.requireOwnTruck(truckId, actor);
    await this.prisma.truckAvailability.updateMany({
      where: { truckId },
      data: { active: false },
    });
    return { ok: true };
  }

  /// The carrier's own published availabilities.
  async mine(actor: AuthUser) {
    if (!actor.companyId) throw new BadRequestException({ code: 'NO_COMPANY', message: 'لا توجد شركة' });
    return this.prisma.truckAvailability.findMany({
      where: { companyId: actor.companyId, active: true },
      include: { truck: { select: { id: true, plateNumber: true, type: true, capacity: true, status: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /// The customer-facing marketplace: active listings whose truck is idle
  /// (AVAILABLE, active, and not on an active order). Carrier contact is not
  /// exposed here — it is revealed only after a direct request is accepted.
  async listAvailable(city: string | undefined, _actor?: AuthUser) {
    const rows = await this.prisma.truckAvailability.findMany({
      where: {
        active: true,
        ...(city ? { originCity: city } : {}),
        truck: {
          isActive: true,
          status: 'AVAILABLE',
          orderTrucks: { none: { status: { in: [...ACTIVE_ORDER_STATUSES] } } },
        },
      },
      include: {
        truck: { select: { id: true, type: true, capacity: true, hasRefrigeration: true, make: true, model: true, year: true } },
        company: { select: { id: true, nameAr: true, logo: true, city: true, region: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    return rows;
  }
}

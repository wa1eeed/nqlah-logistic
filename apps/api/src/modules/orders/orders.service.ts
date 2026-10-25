import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { DriverStatus } from '../../generated/prisma';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { PoliciesService } from '../policies/policies.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';
import {
  AssignDriverDto,
  AssignOrderDto,
  CancelOrderDto,
  CreateOrderDto,
  CreateStopDto,
  CreateTrackingEventDto,
  UpdateOrderDto,
  UpdateStopDto,
} from './dto/create-order.dto';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { customAlphabet } from 'nanoid';
import type { OrderStatus, Prisma } from '../../generated/prisma';

const orderNumberGen = customAlphabet('0123456789', 6);

/// Stop types that count as "the cargo reached a customer" (vs. a logistics
/// stop like a warehouse transfer or returning an empty container).
const DELIVERY_STOP_TYPES = ['DELIVERY', 'DROPOFF'] as const;

type StopCreateRow = Prisma.OrderStopCreateWithoutOrderInput;
type RouteSummary = Pick<
  Prisma.OrderCreateInput,
  | 'originCity' | 'originRegion' | 'originAddress' | 'originLat' | 'originLng'
  | 'destinationCity' | 'destinationRegion' | 'destinationAddress'
  | 'destinationLat' | 'destinationLng'
>;

/**
 * Turn a create-order DTO into the ordered stop rows to persist plus the
 * denormalized origin/destination summary written onto the Order row.
 *
 * - 2+ stops supplied → persist them in order; summary = first PICKUP (else the
 *   first stop) and last DELIVERY/DROPOFF (else the last stop).
 * - otherwise → a classic 2-stop route (PICKUP at origin, DELIVERY at
 *   destination) built from the flat fields; summary = those same fields.
 */
function buildRoute(dto: CreateOrderDto): { stopRows: StopCreateRow[]; summary: RouteSummary } {
  const toRow = (s: CreateStopDto, i: number): StopCreateRow => ({
    sequence: i + 1,
    type: s.type,
    city: s.city,
    region: s.region,
    address: s.address,
    lat: s.lat,
    lng: s.lng,
    contactName: s.contactName,
    contactPhone: s.contactPhone,
    scheduledAt: s.scheduledAt ? new Date(s.scheduledAt) : undefined,
    windowStart: s.windowStart ? new Date(s.windowStart) : undefined,
    windowEnd: s.windowEnd ? new Date(s.windowEnd) : undefined,
    instructions: s.instructions,
    containerNo: s.containerNo,
    isEmptyReturn: s.isEmptyReturn ?? false,
  });

  if (dto.stops && dto.stops.length >= 2) {
    const stops = dto.stops;
    const first = stops.find((s) => s.type === 'PICKUP') ?? stops[0];
    const lastDelivery = [...stops].reverse().find((s) => DELIVERY_STOP_TYPES.includes(s.type as never));
    const last = lastDelivery ?? stops[stops.length - 1];
    return {
      stopRows: stops.map(toRow),
      summary: {
        originCity: first.city, originRegion: first.region, originAddress: first.address,
        originLat: first.lat, originLng: first.lng,
        destinationCity: last.city, destinationRegion: last.region, destinationAddress: last.address,
        destinationLat: last.lat, destinationLng: last.lng,
      },
    };
  }

  // Classic single origin → destination: a 2-stop route.
  return {
    stopRows: [
      { sequence: 1, type: 'PICKUP', city: dto.originCity, region: dto.originRegion, address: dto.originAddress, lat: dto.originLat, lng: dto.originLng },
      { sequence: 2, type: 'DELIVERY', city: dto.destinationCity, region: dto.destinationRegion, address: dto.destinationAddress, lat: dto.destinationLat, lng: dto.destinationLng },
    ],
    summary: {
      originCity: dto.originCity, originRegion: dto.originRegion, originAddress: dto.originAddress,
      originLat: dto.originLat, originLng: dto.originLng,
      destinationCity: dto.destinationCity, destinationRegion: dto.destinationRegion, destinationAddress: dto.destinationAddress,
      destinationLat: dto.destinationLat, destinationLng: dto.destinationLng,
    },
  };
}

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeGateway,
    private policies: PoliciesService,
  ) {}

  async list(query: PaginationDto & { status?: OrderStatus; mine?: boolean }, actor: AuthUser) {
    const { page = 1, limit = 20, sort = 'createdAt', order = 'desc', search, status, mine } = query;
    const where: Prisma.OrderWhereInput = {
      ...(status ? { status } : {}),
      ...(search ? {
        OR: [
          { orderNumber: { contains: search } },
          { cargoDescription: { contains: search, mode: 'insensitive' } },
          { originCity: { contains: search } },
          { destinationCity: { contains: search } },
        ],
      } : {}),
    };

    if (actor.role === 'CLIENT_ADMIN' || actor.role === 'CLIENT_USER') {
      where.clientId = actor.companyId ?? '__none__';
    } else if (actor.role === 'CARRIER_ADMIN' || actor.role === 'CARRIER_USER') {
      const myId = actor.companyId ?? '__none__';
      if (mine) {
        where.carrierId = myId;
      } else {
        // Carriers see three buckets simultaneously:
        //   1. OPEN marketplace orders (PUBLISHED/BIDDING + mode=OPEN)
        //   2. DIRECT orders targeted at them (any status pre-assignment)
        //   3. Orders already assigned to them (any status)
        where.OR = [
          { AND: [{ mode: 'OPEN' }, { status: { in: ['PUBLISHED', 'BIDDING'] } }] },
          { AND: [{ mode: 'DIRECT' }, { targetCarrierId: myId }] },
          { carrierId: myId },
        ];
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sort]: order },
        include: {
          client: { select: { id: true, nameAr: true, logo: true } },
          carrier: { select: { id: true, nameAr: true, logo: true } },
          _count: { select: { bids: true } },
          // Lean bid subset so the carrier list can answer "did I already bid
          // on this order?" without a second round-trip. We only need the
          // carrierId + status to drive the row CTA (تفاصيل / إعادة تقديم /
          // قدّم عرضاً) — full bid bodies are still fetched in the detail page.
          bids: { select: { id: true, carrierId: true, status: true, amount: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);
    return paginate(items, total, page, limit);
  }

  async findById(id: string, actor: AuthUser) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        client: true,
        carrier: true,
        bids: { include: { carrier: { select: { id: true, nameAr: true, nameEn: true, logo: true, city: true, region: true, contactPhone: true } } }, orderBy: { amount: 'asc' } },
        trackingEvents: { orderBy: { createdAt: 'desc' } },
        payment: true,
        invoice: true,
        orderDrivers: {
          orderBy: { assignedAt: 'desc' },
          include: {
            driver: {
              include: {
                user: { select: { firstName: true, lastName: true, phone: true } },
              },
            },
          },
        },
      },
    });
    if (!order) throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'الطلب غير موجود' });
    this.assertViewAccess(order, actor);
    return order;
  }

  async create(dto: CreateOrderDto, actor: AuthUser) {
    if (!actor.companyId) {
      throw new BadRequestException({ code: 'NO_COMPANY', message: 'يجب أن تكون ضمن شركة' });
    }
    const orderNumber = `ORD-${new Date().getFullYear()}-${orderNumberGen()}`;

    // Consolidated orders ship `truckCount` legs. Each leg carries a shipment
    // reference the client either typed (one per leg) or left to the system to
    // auto-generate as `<orderNumber>-L<n>`. Blank entries fall back to auto.
    const isConsolidated = dto.orderType === 'CONSOLIDATED';
    const truckCount = isConsolidated
      ? Math.min(20, Math.max(2, Math.trunc(dto.truckCount ?? 2)))
      : null;
    const legReferences = isConsolidated && truckCount
      ? Array.from({ length: truckCount }, (_, i) => {
          const typed = dto.legReferences?.[i]?.trim();
          return typed && typed.length > 0 ? typed : `${orderNumber}-L${i + 1}`;
        })
      : [];

    // Multi-stop route. When the client sends 2+ stops we persist them in order
    // and derive the denormalized origin/destination summary from them (first
    // PICKUP → origin, last delivery stop → destination). Otherwise we build the
    // classic 2-stop route from the flat origin/destination fields. Either way
    // the Order's origin*/destination* columns stay populated for old consumers.
    const { stopRows, summary } = buildRoute(dto);

    // Resolve the client's effective policy (its group's, else a permissive
    // default) and apply it to sourcing + pricing. Defaults allow everything,
    // so ungrouped clients are unaffected; a group can disable market/direct,
    // pin every order to one carrier, or forbid a pricing mode.
    const sourcing = await this.resolveSourcing(dto, actor.companyId);

    return this.prisma.order.create({
      data: {
        orderNumber,
        clientId: actor.companyId,
        orderType: isConsolidated ? 'CONSOLIDATED' : 'SINGLE',
        truckCount,
        legReferences,
        stops: { create: stopRows },
        // v0.6.0 workflow fields — resolved against the client's policy above.
        mode: sourcing.mode,
        targetCarrierId: sourcing.targetCarrierId,
        // Pre-seed agreed price for DIRECT orders with an allowed upfront price.
        ...(sourcing.fixedPrice != null ? {
          agreedPrice:      sourcing.fixedPrice,
          commissionAmount: +(sourcing.fixedPrice * 0.08).toFixed(2),
          carrierAmount:    +(sourcing.fixedPrice * 0.92).toFixed(2),
        } : {}),
        tripType: dto.tripType ?? (dto.originCity === dto.destinationCity ? 'SAME_CITY' : 'INTER_CITY'),
        pickupWindow: dto.pickupWindow ?? 'ALL_DAY',
        cargoType: dto.cargoType,
        cargoDescription: dto.cargoDescription,
        weight: dto.weight,
        pallets: dto.pallets,
        volume: dto.volume,
        ...summary,
        requiredTruckType: dto.requiredTruckType,
        requiresRefrigeration: dto.requiresRefrigeration ?? false,
        requiresInsurance: dto.requiresInsurance ?? false,
        specialInstructions: dto.specialInstructions,
        pickupDate: new Date(dto.pickupDate),
        deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : null,
        bidDeadline: dto.bidDeadline ? new Date(dto.bidDeadline) : null,
        clientBudget: dto.clientBudget,
        poNumber: dto.poNumber,
        notes: dto.notes,
        documents: dto.documents ?? [],
      },
    });
  }

  async update(id: string, dto: UpdateOrderDto, actor: AuthUser) {
    const order = await this.requireOrder(id);
    if (order.clientId !== actor.companyId && !this.isAdmin(actor)) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'لا تملك صلاحية' });
    }
    if (!['DRAFT', 'PUBLISHED'].includes(order.status)) {
      throw new BadRequestException({ code: 'ORDER_LOCKED', message: 'لا يمكن تعديل الطلب في هذه المرحلة' });
    }
    return this.prisma.order.update({
      where: { id },
      data: {
        ...dto,
        pickupDate: dto.pickupDate ? new Date(dto.pickupDate) : undefined,
      },
    });
  }

  async publish(id: string, actor: AuthUser) {
    const order = await this.requireOrder(id);
    if (order.clientId !== actor.companyId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'لا تملك صلاحية' });
    }
    if (order.status !== 'DRAFT') {
      throw new BadRequestException({ code: 'INVALID_TRANSITION', message: 'الطلب منشور بالفعل' });
    }
    // Re-check the policy at publish: a DRAFT may have been created before its
    // client's group tightened. Defaults allow everything → no change.
    const policy = await this.policies.effectiveForCompany(order.clientId);
    if (order.mode === 'OPEN' && !policy.allowMarket) {
      throw new ForbiddenException({ code: 'POLICY_MARKET_DISABLED', message: 'النشر في السوق غير مسموح لهذا العميل' });
    }
    if (order.mode === 'DIRECT' && !policy.allowDirect) {
      throw new ForbiddenException({ code: 'POLICY_DIRECT_DISABLED', message: 'الإسناد المباشر غير مسموح لهذا العميل' });
    }
    // DIRECT + pre-agreed price: skip negotiation, assign immediately.
    if (order.mode === 'DIRECT' && order.agreedPrice && order.targetCarrierId) {
      return this.prisma.order.update({
        where: { id },
        data: { status: 'ASSIGNED', carrierId: order.targetCarrierId },
      });
    }
    return this.prisma.order.update({
      where: { id },
      data: { status: 'PUBLISHED' },
    });
  }

  async assign(id: string, dto: AssignOrderDto, actor: AuthUser) {
    const order = await this.requireOrder(id);
    if (order.clientId !== actor.companyId && !this.isAdmin(actor)) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'لا تملك صلاحية' });
    }
    if (!['PUBLISHED', 'BIDDING'].includes(order.status)) {
      throw new BadRequestException({ code: 'INVALID_TRANSITION', message: 'حالة الطلب غير مناسبة' });
    }
    const commissionRate = 0.08;
    const commission = +(dto.agreedPrice * commissionRate).toFixed(2);
    return this.prisma.order.update({
      where: { id },
      data: {
        carrierId: dto.carrierId,
        agreedPrice: dto.agreedPrice,
        commissionAmount: commission,
        carrierAmount: dto.agreedPrice - commission,
        status: 'ASSIGNED',
      },
    });
  }

  async confirm(id: string, actor: AuthUser) {
    const order = await this.requireOrder(id);
    if (order.carrierId !== actor.companyId && !this.isAdmin(actor)) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'لا تملك صلاحية' });
    }
    if (order.status !== 'ASSIGNED') {
      throw new BadRequestException({ code: 'INVALID_TRANSITION', message: 'لا يمكن التأكيد' });
    }
    return this.prisma.order.update({ where: { id }, data: { status: 'CONFIRMED' } });
  }

  async cancel(id: string, dto: CancelOrderDto, actor: AuthUser) {
    const order = await this.requireOrder(id);
    const canCancel = order.clientId === actor.companyId || this.isAdmin(actor);
    if (!canCancel) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'لا تملك صلاحية' });
    if (['COMPLETED', 'CANCELLED'].includes(order.status)) {
      throw new BadRequestException({ code: 'INVALID_TRANSITION', message: 'لا يمكن إلغاء الطلب' });
    }
    return this.prisma.order.update({
      where: { id },
      data: { status: 'CANCELLED', cancelReason: dto.reason },
    });
  }

  /**
   * Carrier marks the order as delivered. Transition is allowed from
   * CONFIRMED or IN_TRANSIT — the latter being the typical path after the
   * carrier has been emitting tracking events. Sets `actualDeliveryAt` so the
   * 72-hour escrow auto-release clock starts ticking.
   */
  async deliver(id: string, actor: AuthUser) {
    const order = await this.requireOrder(id);
    if (order.carrierId !== actor.companyId && !this.isAdmin(actor)) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'لا تملك صلاحية' });
    }
    if (!['CONFIRMED', 'IN_TRANSIT'].includes(order.status)) {
      throw new BadRequestException({ code: 'INVALID_TRANSITION', message: 'لا يمكن وضع تم التسليم من هذه الحالة' });
    }
    return this.prisma.order.update({
      where: { id },
      data: { status: 'DELIVERED', actualDeliveryAt: new Date() },
    });
  }

  /**
   * Client confirms receipt (or the 72-hour auto-release fires from a cron).
   * Atomic: order → COMPLETED + Payment → RELEASED + releasedAt timestamped.
   * Wallet credit + invoice generation should listen on the `order.complete`
   * audit event (out of scope for this slice).
   */
  async complete(id: string, actor: AuthUser) {
    const order = await this.requireOrder(id);
    const isClient = order.clientId === actor.companyId;
    if (!isClient && !this.isAdmin(actor)) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'لا تملك صلاحية' });
    }
    if (order.status !== 'DELIVERED') {
      throw new BadRequestException({ code: 'INVALID_TRANSITION', message: 'الطلب لم يُسلَّم بعد' });
    }
    return this.prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id },
        data: { status: 'COMPLETED' },
      });
      await tx.payment.updateMany({
        where: { orderId: id, status: 'HELD' },
        data: { status: 'RELEASED', releasedAt: new Date() },
      });
      // Set assigned drivers back to AVAILABLE once order completes.
      const assigned = await tx.orderDriver.findMany({ where: { orderId: id }, select: { driverId: true } });
      if (assigned.length > 0) {
        await tx.driverProfile.updateMany({
          where: { id: { in: assigned.map((d) => d.driverId) } },
          data: { status: 'AVAILABLE' as DriverStatus },
        });
      }
      return updatedOrder;
    });
  }

  async assignDriver(orderId: string, dto: AssignDriverDto, actor: AuthUser) {
    const order = await this.requireOrder(orderId);
    if (order.carrierId !== actor.companyId && !this.isAdmin(actor)) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'لا تملك صلاحية' });
    }
    if (!['ASSIGNED', 'CONFIRMED', 'IN_TRANSIT'].includes(order.status)) {
      throw new BadRequestException({ code: 'INVALID_TRANSITION', message: 'لا يمكن إسناد سائق في هذه المرحلة' });
    }
    const driver = await this.prisma.driverProfile.findUnique({ where: { id: dto.driverId } });
    if (!driver) throw new NotFoundException({ code: 'DRIVER_NOT_FOUND', message: 'السائق غير موجود' });
    if (driver.companyId !== actor.companyId && !this.isAdmin(actor)) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'السائق لا ينتمي لشركتك' });
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.orderDriver.upsert({
        where: { orderId_driverId: { orderId, driverId: dto.driverId } },
        create: { orderId, driverId: dto.driverId },
        update: { assignedAt: new Date() },
      });
      await tx.driverProfile.update({
        where: { id: dto.driverId },
        data: { status: 'ON_TRIP' as DriverStatus },
      });
      return { ok: true, driverId: dto.driverId };
    });
  }

  async remove(id: string, actor: AuthUser) {
    const order = await this.requireOrder(id);
    if (order.clientId !== actor.companyId && !this.isAdmin(actor)) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'لا تملك صلاحية' });
    }
    if (order.status !== 'DRAFT') {
      throw new BadRequestException({ code: 'CANNOT_DELETE', message: 'يمكن حذف المسودات فقط' });
    }
    await this.prisma.order.delete({ where: { id } });
    return { ok: true };
  }

  async declineDirect(id: string, actor: AuthUser) {
    const order = await this.requireOrder(id);
    if (order.mode !== 'DIRECT') {
      throw new BadRequestException({ code: 'NOT_DIRECT', message: 'هذا الإجراء خاص بالطلبات المباشرة' });
    }
    if (order.targetCarrierId !== actor.companyId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'لست الناقل المستهدف' });
    }
    if (!['PUBLISHED', 'BIDDING'].includes(order.status)) {
      throw new BadRequestException({ code: 'INVALID_TRANSITION', message: 'الطلب لم يعد في مرحلة التفاوض' });
    }
    // Move order back to PUBLISHED so client can reassign or open to market.
    return this.prisma.order.update({
      where: { id },
      data: { status: 'PUBLISHED', targetCarrierId: null },
    });
  }

  async getTracking(id: string) {
    return this.prisma.trackingEvent.findMany({
      where: { orderId: id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addTrackingEvent(id: string, dto: CreateTrackingEventDto, actor: AuthUser) {
    const order = await this.requireOrder(id);
    const allowed =
      order.carrierId === actor.companyId ||
      actor.role === 'DRIVER' ||
      this.isAdmin(actor);
    if (!allowed) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'لا تملك صلاحية' });

    const event = await this.prisma.trackingEvent.create({
      data: { orderId: id, createdBy: actor.id, ...dto, photos: dto.photos ?? [] },
    });

    // Push the tracking event live to anyone watching this order.
    this.realtime.emitLocationUpdate(id, {
      status: dto.status, lat: dto.lat, lng: dto.lng, city: dto.city, at: Date.now(),
    });

    if (dto.status === 'PICKED_UP') {
      await this.prisma.order.update({
        where: { id },
        data: { status: 'IN_TRANSIT', actualPickupAt: new Date() },
      });
      this.realtime.emitOrderStatus(id, { status: 'IN_TRANSIT' });
    } else if (dto.status === 'DELIVERED') {
      await this.prisma.order.update({
        where: { id },
        data: { status: 'DELIVERED', actualDeliveryAt: new Date() },
      });
      this.realtime.emitOrderStatus(id, { status: 'DELIVERED' });
    }
    return event;
  }

  private async requireOrder(id: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'الطلب غير موجود' });
    return order;
  }

  private assertViewAccess(order: { clientId: string; carrierId: string | null; status: string }, actor: AuthUser) {
    if (this.isAdmin(actor)) return;
    if (order.clientId === actor.companyId) return;
    if (order.carrierId === actor.companyId) return;
    if (
      (actor.role === 'CARRIER_ADMIN' || actor.role === 'CARRIER_USER') &&
      ['PUBLISHED', 'BIDDING'].includes(order.status)
    ) {
      return;
    }
    throw new ForbiddenException({ code: 'FORBIDDEN', message: 'لا تملك صلاحية' });
  }

  private isAdmin(actor: AuthUser): boolean {
    return actor.role === 'ADMIN' || actor.role === 'SUPER_ADMIN';
  }

  /**
   * Resolve a new order's sourcing + pricing against the client's effective
   * policy. The default policy allows everything with no forced carrier, so an
   * ungrouped client behaves exactly as before. A group can:
   *  - pin every order to one provider (`forcedCarrierId` → forces DIRECT),
   *  - disable market posting (`allowMarket`) or direct assignment (`allowDirect`),
   *  - forbid fixed upfront pricing (`allowFixedPricing`) or market/bid pricing
   *    (`allowMarketPricing`).
   */
  private async resolveSourcing(dto: CreateOrderDto, companyId: string) {
    const policy = await this.policies.effectiveForCompany(companyId);
    let mode: 'OPEN' | 'DIRECT' = dto.mode === 'DIRECT' ? 'DIRECT' : 'OPEN';
    let targetCarrierId: string | null = mode === 'DIRECT' ? dto.targetCarrierId ?? null : null;
    if (policy.forcedCarrierId) {
      mode = 'DIRECT';
      targetCarrierId = policy.forcedCarrierId;
    }
    if (mode === 'OPEN' && !policy.allowMarket) {
      throw new ForbiddenException({ code: 'POLICY_MARKET_DISABLED', message: 'النشر في السوق غير مسموح لهذا العميل' });
    }
    if (mode === 'DIRECT' && !policy.allowDirect) {
      throw new ForbiddenException({ code: 'POLICY_DIRECT_DISABLED', message: 'الإسناد المباشر غير مسموح لهذا العميل' });
    }
    const fixedPrice = mode === 'DIRECT' && dto.agreedPriceUpfront != null ? dto.agreedPriceUpfront : null;
    if (fixedPrice != null && !policy.allowFixedPricing) {
      throw new ForbiddenException({ code: 'POLICY_FIXED_PRICING_DISABLED', message: 'التسعير الثابت غير مسموح لهذا العميل' });
    }
    if (mode === 'OPEN' && !policy.allowMarketPricing) {
      throw new ForbiddenException({ code: 'POLICY_MARKET_PRICING_DISABLED', message: 'تسعير السوق غير مسموح لهذا العميل' });
    }
    return { mode, targetCarrierId, fixedPrice };
  }

  // ─── Consolidated legs ───────────────────────────────────────

  private async carrierOrder(id: string, actor: AuthUser) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { orderTrucks: { orderBy: { sequence: 'asc' } } },
    });
    if (!order) throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'الطلب غير موجود' });
    if (order.carrierId !== actor.companyId && !this.isAdmin(actor)) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'لا تملك صلاحية' });
    }
    return order;
  }

  /**
   * The full leg list (1..truckCount); undistributed legs are PENDING. Readable
   * by the order's client, its carrier, or an admin. Each distributed leg is
   * enriched with the truck plate + driver name so viewers who can't query the
   * fleet (the client) can still render the breakdown.
   */
  async getLegs(id: string, actor: AuthUser) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        orderTrucks: {
          orderBy: { sequence: 'asc' },
          include: { truck: { select: { plateNumber: true } } },
        },
      },
    });
    if (!order) throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'الطلب غير موجود' });
    this.assertViewAccess(order, actor);

    const count = order.truckCount ?? order.orderTrucks.length;
    const driverIds = order.orderTrucks.map((l) => l.driverId).filter((d): d is string => !!d);
    const drivers = driverIds.length
      ? await this.prisma.driverProfile.findMany({
          where: { id: { in: driverIds } },
          include: { user: { select: { firstName: true, lastName: true } } },
        })
      : [];
    const driverName = (did?: string | null) => {
      const d = did ? drivers.find((x) => x.id === did) : undefined;
      return d ? [d.user.firstName, d.user.lastName].filter(Boolean).join(' ') : undefined;
    };

    const bySeq = new Map(order.orderTrucks.map((l) => [l.sequence, l]));
    const refFor = (index: number) => order.legReferences?.[index - 1] || undefined;
    const legs = Array.from({ length: count }, (_, i) => {
      const index = i + 1;
      const row = bySeq.get(index);
      return row
        ? {
            index,
            reference: refFor(index),
            truckId: row.truckId,
            driverId: row.driverId ?? undefined,
            status: row.status,
            plateNumber: row.truck?.plateNumber,
            driverName: driverName(row.driverId),
          }
        : { index, reference: refFor(index), status: 'PENDING' };
    });
    return { orderId: order.id, orderNumber: order.orderNumber, truckCount: count, status: order.status, legs };
  }

  async distributeLeg(id: string, index: number, truckId: string, driverId: string | undefined, actor: AuthUser) {
    const order = await this.carrierOrder(id, actor);
    // A truck serves at most one leg of the order — free it from any other leg.
    await this.prisma.orderTruck.deleteMany({ where: { orderId: order.id, truckId, sequence: { not: index } } });
    await this.prisma.orderTruck.upsert({
      where: { orderId_sequence: { orderId: order.id, sequence: index } },
      update: { truckId, driverId: driverId ?? null, status: 'ASSIGNED' },
      create: { orderId: order.id, sequence: index, truckId, driverId: driverId ?? null, status: 'ASSIGNED' },
    });
    await this.rollup(order.id);
    return this.getLegs(id, actor);
  }

  async clearLeg(id: string, index: number, actor: AuthUser) {
    const order = await this.carrierOrder(id, actor);
    await this.prisma.orderTruck.deleteMany({ where: { orderId: order.id, sequence: index } });
    await this.rollup(order.id);
    return this.getLegs(id, actor);
  }

  async setLegStatus(id: string, index: number, status: string, actor: AuthUser) {
    const order = await this.carrierOrder(id, actor);
    await this.prisma.orderTruck.updateMany({ where: { orderId: order.id, sequence: index }, data: { status } });
    await this.rollup(order.id);
    return this.getLegs(id, actor);
  }

  /** Derive a consolidated order's status from its legs (forward-only). */
  private async rollup(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: { orderTrucks: true } });
    if (!order || order.orderType !== 'CONSOLIDATED') return;
    const legs = order.orderTrucks;
    const n = order.truckCount ?? legs.length;
    let status = order.status;
    if (legs.length > 0 && legs.every((l) => l.status === 'DELIVERED')) status = 'DELIVERED';
    else if (legs.some((l) => l.status === 'IN_TRANSIT')) status = 'IN_TRANSIT';
    else if (n > 0 && legs.length >= n) status = 'ASSIGNED';
    if (status !== order.status) {
      await this.prisma.order.update({ where: { id: orderId }, data: { status } });
      this.realtime.emitOrderStatus(orderId, { status });
    }
  }

  // ─── Multi-stop route ────────────────────────────────────────

  /**
   * The ordered stops of an order's route. Old orders created before the
   * multi-stop feature have no OrderStop rows, so we synthesize a 2-stop route
   * (PICKUP at origin, DELIVERY at destination) from the summary columns. The
   * synthesized stops carry string ids `virtual-1/2` and cannot be executed —
   * they exist only so legacy orders still render a route.
   */
  async getStops(id: string, actor: AuthUser) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { stops: { orderBy: { sequence: 'asc' } } },
    });
    if (!order) throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'الطلب غير موجود' });
    this.assertViewAccess(order, actor);

    if (order.stops.length > 0) {
      return { orderId: order.id, orderNumber: order.orderNumber, status: order.status, virtual: false, stops: order.stops };
    }
    const virtual = [
      { id: 'virtual-1', sequence: 1, type: 'PICKUP', status: order.actualPickupAt ? 'COMPLETED' : 'PENDING',
        city: order.originCity, region: order.originRegion, address: order.originAddress, lat: order.originLat, lng: order.originLng,
        isEmptyReturn: false, arrivedAt: null, completedAt: order.actualPickupAt, proofPhotos: [] as string[], proofNote: null,
        contactName: null, contactPhone: null, scheduledAt: order.pickupDate, windowStart: null, windowEnd: null, instructions: null, containerNo: null },
      { id: 'virtual-2', sequence: 2, type: 'DELIVERY', status: order.actualDeliveryAt ? 'COMPLETED' : 'PENDING',
        city: order.destinationCity, region: order.destinationRegion, address: order.destinationAddress, lat: order.destinationLat, lng: order.destinationLng,
        isEmptyReturn: false, arrivedAt: null, completedAt: order.actualDeliveryAt, proofPhotos: [] as string[], proofNote: null,
        contactName: null, contactPhone: null, scheduledAt: order.deliveryDate, windowStart: null, windowEnd: null, instructions: null, containerNo: null },
    ];
    return { orderId: order.id, orderNumber: order.orderNumber, status: order.status, virtual: true, stops: virtual };
  }

  /**
   * Carrier / driver (or admin override) advancing one stop. Admins may set any
   * state (including SKIPPED) as an override; non-admins move a stop forward
   * through its execution states. Completing a stop stamps `completedAt`,
   * arriving stamps `arrivedAt`, then the order status is re-derived.
   */
  async setStopStatus(id: string, stopId: string, dto: UpdateStopDto, actor: AuthUser) {
    const order = await this.requireOrder(id);
    const allowed =
      order.carrierId === actor.companyId ||
      actor.role === 'DRIVER' ||
      this.isAdmin(actor);
    if (!allowed) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'لا تملك صلاحية' });

    const stop = await this.prisma.orderStop.findFirst({ where: { id: stopId, orderId: id } });
    if (!stop) throw new NotFoundException({ code: 'STOP_NOT_FOUND', message: 'المحطة غير موجودة' });

    const now = new Date();
    await this.prisma.orderStop.update({
      where: { id: stopId },
      data: {
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.status === 'ARRIVED' && !stop.arrivedAt ? { arrivedAt: now } : {}),
        ...(dto.status === 'COMPLETED' ? { completedAt: now, ...(stop.arrivedAt ? {} : { arrivedAt: now }) } : {}),
        ...(dto.lat !== undefined ? { lat: dto.lat } : {}),
        ...(dto.lng !== undefined ? { lng: dto.lng } : {}),
        ...(dto.proofPhotos ? { proofPhotos: dto.proofPhotos } : {}),
        ...(dto.proofNote !== undefined ? { proofNote: dto.proofNote } : {}),
      },
    });
    await this.rollupStops(id);
    return this.getStops(id, actor);
  }

  /**
   * Derive an order's status from its stop progress (forward-only), keeping the
   * cargo-delivery vs. trip-completion split: the order becomes DELIVERED once
   * every cargo stop (DELIVERY/DROPOFF) is done even if an empty-container
   * return is still pending; IN_TRANSIT once the first stop is completed. The
   * final COMPLETED/escrow-release transition stays with `complete()`.
   */
  private async rollupStops(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { stops: true },
    });
    if (!order || order.stops.length === 0) return;
    const stops = order.stops;
    const done = (s: { status: string }) => s.status === 'COMPLETED' || s.status === 'SKIPPED';
    const cargoStops = stops.filter((s) => DELIVERY_STOP_TYPES.includes(s.type as never));
    const anyStarted = stops.some((s) => s.status !== 'PENDING');

    let status = order.status;
    const data: Prisma.OrderUpdateInput = {};
    if (cargoStops.length > 0 && cargoStops.every(done)) {
      if (!['DELIVERED', 'COMPLETED', 'CANCELLED', 'DISPUTED'].includes(order.status)) status = 'DELIVERED';
      const lastDelivery = cargoStops.filter((s) => s.completedAt).sort((a, b) => +a.completedAt! - +b.completedAt!).pop();
      if (!order.actualDeliveryAt && lastDelivery?.completedAt) data.actualDeliveryAt = lastDelivery.completedAt;
    } else if (anyStarted && ['ASSIGNED', 'CONFIRMED'].includes(order.status)) {
      status = 'IN_TRANSIT';
      const firstPickup = stops.find((s) => s.type === 'PICKUP' && s.completedAt);
      if (!order.actualPickupAt && firstPickup?.completedAt) data.actualPickupAt = firstPickup.completedAt;
    }

    if (status !== order.status) data.status = status as OrderStatus;
    if (Object.keys(data).length > 0) {
      await this.prisma.order.update({ where: { id: orderId }, data });
      if (data.status) this.realtime.emitOrderStatus(orderId, { status });
    }
  }
}

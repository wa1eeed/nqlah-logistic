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
import { CollectionService } from '../payments/collection/collection.service';
import { InvoicesService } from '../invoices/invoices.service';
import { NotificationsService } from '../notifications/notifications.service';
import { money, round2 } from '../../common/money/money';
import { computeOrderFinancials, type OrderFinancials } from '../../common/pricing/pricing';
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
import { nextPublicId, PublicIdPrefix } from '../../common/public-id';
import type { OrderStatus, Prisma } from '../../generated/prisma';

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
  const toRow = (s: CreateStopDto, i: number, legSequence?: number): StopCreateRow => ({
    legSequence: legSequence ?? null,
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

  // Heterogeneous consolidated: each leg with intermediate stops gets its own
  // route (shared pickup → the leg's stops → the leg's destination), tagged with
  // `legSequence`. Legs without stops keep their implied pickup→destination route
  // (no OrderStop rows). The order summary = origin + the first leg's destination.
  const legs = dto.orderType === 'CONSOLIDATED' && Array.isArray(dto.legs) && dto.legs.length >= 2 ? dto.legs : null;
  if (legs) {
    const stopRows: StopCreateRow[] = [];
    legs.forEach((leg, li) => {
      const legStops = leg.stops ?? [];
      if (legStops.length === 0) return;
      const seq = li + 1;
      let n = 0;
      stopRows.push(toRow({ type: 'PICKUP', city: dto.originCity, region: dto.originRegion, address: dto.originAddress, lat: dto.originLat, lng: dto.originLng } as CreateStopDto, n++, seq));
      for (const s of legStops) stopRows.push(toRow(s, n++, seq));
      stopRows.push(toRow({ type: 'DELIVERY', city: leg.destinationCity, region: leg.destinationRegion, address: leg.destinationAddress, lat: leg.destinationLat, lng: leg.destinationLng } as CreateStopDto, n++, seq));
    });
    const firstLeg = legs[0];
    return {
      stopRows,
      summary: {
        originCity: dto.originCity, originRegion: dto.originRegion, originAddress: dto.originAddress,
        originLat: dto.originLat, originLng: dto.originLng,
        destinationCity: firstLeg.destinationCity, destinationRegion: firstLeg.destinationRegion, destinationAddress: firstLeg.destinationAddress,
        destinationLat: firstLeg.destinationLat, destinationLng: firstLeg.destinationLng,
      },
    };
  }

  if (dto.stops && dto.stops.length >= 2) {
    const stops = dto.stops;
    const first = stops.find((s) => s.type === 'PICKUP') ?? stops[0];
    const lastDelivery = [...stops].reverse().find((s) => DELIVERY_STOP_TYPES.includes(s.type as never));
    const last = lastDelivery ?? stops[stops.length - 1];
    return {
      stopRows: stops.map((s, i) => toRow(s, i)),
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
    private collection: CollectionService,
    private invoices: InvoicesService,
    private notifications: NotificationsService,
  ) {}

  async list(query: PaginationDto & { status?: OrderStatus; mine?: boolean }, actor: AuthUser) {
    const { page = 1, limit = 20, sort = 'createdAt', order = 'desc', search, status, mine } = query;
    // `mine` arrives as a query string; with `enableImplicitConversion` a literal
    // "false" coerces to the truthy boolean `true`, so coerce it explicitly here.
    // Without this a carrier's marketplace (`mine=false`) silently returns their
    // own assigned work instead of OPEN/DIRECT-targeted orders.
    const wantMine =
      mine === true || (mine as unknown) === 'true' || (mine as unknown) === 1 || (mine as unknown) === '1';
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
      if (wantMine) {
        // "My work": orders assigned to me as the order carrier, or any order
        // where I serve one of the legs (phase 2 per-leg carriers).
        where.OR = [{ carrierId: myId }, { orderLegs: { some: { carrierId: myId } } }];
      } else {
        // Carriers see three buckets simultaneously:
        //   1. OPEN marketplace orders (PUBLISHED/BIDDING + mode=OPEN), minus any
        //      whose client's policy restricts this carrier out of its market.
        //   2. DIRECT orders targeted at them (any status pre-assignment)
        //   3. Orders already assigned to them (any status)
        const restricted = await this.policies.restrictedClientIdsForCarrier(myId);
        where.OR = [
          { AND: [
            { mode: 'OPEN' },
            { status: { in: ['PUBLISHED', 'BIDDING'] } },
            ...(restricted.length ? [{ clientId: { notIn: restricted } }] : []),
          ] },
          { AND: [{ mode: 'DIRECT' }, { targetCarrierId: myId }] },
          { carrierId: myId },
          // Orders where I serve one of the legs (phase 2 per-leg carriers).
          { orderLegs: { some: { carrierId: myId } } },
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
        invoices: true,
        orderLegs: { select: { carrierId: true } },
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
    // Compact public reference, e.g. ORD26A001 — atomic, unique, per-year.
    const orderNumber = await nextPublicId(this.prisma, PublicIdPrefix.ORDER);

    // Consolidated orders ship `truckCount` legs. A HETEROGENEOUS order sends a
    // `legs` spec (each leg its own truck type / destination / price); a
    // homogeneous one just sends `truckCount` and every leg shares the order's
    // truck type, destination and price. Each leg carries a shipment reference
    // the client typed or the system auto-generates as `<orderNumber>-L<n>`.
    const isConsolidated = dto.orderType === 'CONSOLIDATED';
    // Policy Engine capability gate: the client's plan must grant consolidated orders.
    if (isConsolidated && !(await this.policies.hasFeature(actor.companyId, 'consolidatedOrders'))) {
      throw new ForbiddenException({ code: 'FEATURE_CONSOLIDATED_DISABLED', message: 'الطلبات المجمّعة غير متاحة في باقتك' });
    }
    const hasLegSpecs = isConsolidated && Array.isArray(dto.legs) && dto.legs.length >= 2;
    const truckCount = isConsolidated
      ? (hasLegSpecs
          ? Math.min(20, dto.legs!.length)
          : Math.min(20, Math.max(2, Math.trunc(dto.truckCount ?? 2))))
      : null;
    const legReferences = isConsolidated && truckCount
      ? Array.from({ length: truckCount }, (_, i) => {
          const typed = (hasLegSpecs ? dto.legs![i]?.reference : dto.legReferences?.[i])?.trim();
          return typed && typed.length > 0 ? typed : `${orderNumber}-L${i + 1}`;
        })
      : [];

    // Per-leg spec rows + the order total derived from the legs' prices (only
    // when every leg is priced; otherwise the total is left to the bidding flow).
    const legRows = hasLegSpecs
      ? dto.legs!.slice(0, 20).map((leg, i) => ({
          sequence: i + 1,
          reference: legReferences[i],
          requiredTruckType: leg.requiredTruckType,
          destinationCity: leg.destinationCity,
          destinationRegion: leg.destinationRegion,
          destinationAddress: leg.destinationAddress,
          destinationLat: leg.destinationLat ?? null,
          destinationLng: leg.destinationLng ?? null,
          price: leg.price != null ? leg.price : null,
        }))
      : [];
    const pricedLegs = legRows.filter((l) => l.price != null);
    const legTotal = hasLegSpecs && legRows.length > 0 && pricedLegs.length === legRows.length
      ? +pricedLegs.reduce((sum, l) => sum + (l.price as number), 0).toFixed(2)
      : null;

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
    const sourcing = await this.resolveSourcing(dto, actor.companyId, legTotal);
    // Pre-seed the carrier split (commission + VAT) only when the carrier is
    // already known — a DIRECT fixed-price order. An OPEN fixed-price order
    // stores its agreed price now but resolves the split when a carrier is
    // chosen (bid accepted), since the carrier's VAT status is unknown yet.
    const fixedFin = (sourcing.fixedPrice != null && sourcing.targetCarrierId)
      ? await this.resolveFinancials(sourcing.fixedPrice, actor.companyId, sourcing.targetCarrierId)
      : null;

    return this.prisma.order.create({
      data: {
        orderNumber,
        clientId: actor.companyId,
        orderType: isConsolidated ? 'CONSOLIDATED' : 'SINGLE',
        truckCount,
        legReferences,
        ...(legRows.length ? { orderLegs: { create: legRows } } : {}),
        stops: { create: stopRows },
        // v0.6.0 workflow fields — resolved against the client's policy above.
        mode: sourcing.mode,
        priceMode: sourcing.priceMode,
        targetCarrierId: sourcing.targetCarrierId,
        collectionMethod: sourcing.collectionMethod,
        // A fixed price is stored up front (OPEN or DIRECT). The carrier split is
        // pre-seeded only when the carrier is known (DIRECT); otherwise it is
        // resolved at bid-accept.
        ...(sourcing.fixedPrice != null ? { agreedPrice: sourcing.fixedPrice } : {}),
        ...(fixedFin ? {
          commissionAmount:    fixedFin.commission,
          carrierAmount:       fixedFin.carrierAmount,
          serviceVatAmount:    fixedFin.serviceVat,
          commissionVatAmount: fixedFin.commissionVat,
          clientTotalDue:      fixedFin.clientTotalDue,
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
        clientBudget: dto.clientBudget ?? legTotal ?? undefined,
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
    // DIRECT + pre-agreed price: skip negotiation, assign immediately — and
    // open the collection (escrow/prepaid/COD) just like assign()/bid-accept do.
    if (order.mode === 'DIRECT' && order.agreedPrice && order.targetCarrierId) {
      return this.prisma.$transaction(async (tx) => {
        const assigned = await tx.order.update({
          where: { id },
          data: { status: 'ASSIGNED', carrierId: order.targetCarrierId },
        });
        await this.collection.initiate(tx, assigned);
        return assigned;
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
    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.order.update({
        where: { id },
        data: {
          carrierId: dto.carrierId,
          agreedPrice: dto.agreedPrice,
          commissionAmount: commission,
          carrierAmount: +(dto.agreedPrice - commission).toFixed(2),
          status: 'ASSIGNED',
        },
      });
      // Open the collection per the order's method (escrow hold / prepaid / COD).
      await this.collection.initiate(tx, u);
      return u;
    });
    // Tell the chosen carrier they've been assigned the order.
    void this.notifications.notifyCompany(dto.carrierId, {
      type: 'ORDER_ASSIGNED',
      titleAr: 'تم إسناد طلب لك',
      bodyAr: `${order.orderNumber} — ${order.originCity} ← ${order.destinationCity}`,
      data: { orderId: id, kind: 'order' },
    });
    return updated;
  }

  async confirm(id: string, actor: AuthUser) {
    const order = await this.requireOrder(id);
    if (order.carrierId !== actor.companyId && !this.isAdmin(actor)) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'لا تملك صلاحية' });
    }
    if (order.status !== 'ASSIGNED') {
      throw new BadRequestException({ code: 'INVALID_TRANSITION', message: 'لا يمكن التأكيد' });
    }
    const confirmed = await this.prisma.order.update({ where: { id }, data: { status: 'CONFIRMED' } });
    void this.notifications.notifyCompany(order.clientId, {
      type: 'ORDER_CONFIRMED',
      titleAr: 'أكّد الناقل طلبك',
      bodyAr: `${order.orderNumber} — يجري التجهيز للاستلام`,
      data: { orderId: id, kind: 'order' },
    });
    return confirmed;
  }

  async cancel(id: string, dto: CancelOrderDto, actor: AuthUser) {
    const order = await this.requireOrder(id);
    const canCancel = order.clientId === actor.companyId || this.isAdmin(actor);
    if (!canCancel) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'لا تملك صلاحية' });
    if (['COMPLETED', 'CANCELLED'].includes(order.status)) {
      throw new BadRequestException({ code: 'INVALID_TRANSITION', message: 'لا يمكن إلغاء الطلب' });
    }
    const cancelled = await this.prisma.$transaction(async (tx) => {
      // Refund any prepaid collection before cancelling.
      const payment = await tx.payment.findFirst({ where: { orderId: id } });
      if (payment) await this.collection.refund(tx, payment.id);
      return tx.order.update({
        where: { id },
        data: { status: 'CANCELLED', cancelReason: dto.reason },
      });
    });
    // Tell the assigned carrier (and its drivers) the order is off.
    if (order.carrierId) {
      void this.notifications.notifyCompany(order.carrierId, {
        type: 'SYSTEM',
        titleAr: 'أُلغي الطلب',
        bodyAr: `${order.orderNumber} — أُلغي من قِبل العميل`,
        data: { orderId: id, kind: 'order' },
      });
    }
    return cancelled;
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
    const delivered = await this.prisma.order.update({
      where: { id },
      data: { status: 'DELIVERED', actualDeliveryAt: new Date() },
    });
    void this.notifications.notifyCompany(order.clientId, {
      type: 'SHIPMENT_DELIVERED',
      titleAr: 'تم تسليم الشحنة',
      bodyAr: `${order.orderNumber} — بانتظار تأكيد الاستلام`,
      data: { orderId: id, kind: 'order' },
    });
    return delivered;
  }

  /** Client attaches a bank-transfer proof (object-store key) on a COD order. */
  async attachCodProof(id: string, key: string | undefined, actor: AuthUser) {
    if (!key || typeof key !== 'string') {
      throw new BadRequestException({ code: 'PROOF_REQUIRED', message: 'مرفق الإثبات مطلوب' });
    }
    const order = await this.requireOrder(id);
    if (order.clientId !== actor.companyId && !this.isAdmin(actor)) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'لا تملك صلاحية' });
    }
    if (order.collectionMethod !== 'COD') {
      throw new BadRequestException({ code: 'NOT_COD', message: 'هذا الطلب ليس دفعاً عند التسليم' });
    }
    const res = await this.prisma.payment.updateMany({
      where: { orderId: id },
      data: { codProofUrl: key },
    });
    if (res.count === 0) {
      throw new BadRequestException({ code: 'PAYMENT_NOT_READY', message: 'لم تُجهَّز الدفعة بعد' });
    }
    // Let the carrier know a transfer proof is waiting for review.
    if (order.carrierId) {
      void this.notifications.notifyCompany(order.carrierId, {
        type: 'SYSTEM',
        titleAr: 'تم إرفاق إثبات تحويل',
        bodyAr: `${order.orderNumber} — راجع إثبات الدفع المرفق`,
        data: { orderId: id, kind: 'payment' },
      });
    }
    return { ok: true };
  }

  /**
   * Client confirms receipt (or the 72-hour auto-release fires from a cron).
   * Atomic: order → COMPLETED + Payment → RELEASED + releasedAt timestamped +
   * VAT-compliant tax invoices generated (carrier service + platform commission).
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
      // Settle the collection first (credit carrier / debit COD commission); for
      // COD this throws if the cash was not recorded as collected.
      const payment = await tx.payment.findFirst({ where: { orderId: id } });
      if (payment && payment.status !== 'RELEASED') await this.collection.settle(tx, payment.id);
      const updatedOrder = await tx.order.update({
        where: { id },
        data: { status: 'COMPLETED' },
      });
      // Generate the VAT-compliant tax invoices (idempotent). Price the order
      // from its agreed price against the same policy used for settlement.
      if (order.carrierId && order.agreedPrice != null) {
        const fin = await this.resolveFinancials(Number(order.agreedPrice), order.clientId, order.carrierId);
        await this.invoices.generateForOrder(tx, id, fin);
      }
      // Set assigned drivers back to AVAILABLE once order completes.
      const assigned = await tx.orderDriver.findMany({ where: { orderId: id }, select: { driverId: true } });
      if (assigned.length > 0) {
        await tx.driverProfile.updateMany({
          where: { id: { in: assigned.map((d) => d.driverId) } },
          data: { status: 'AVAILABLE' as DriverStatus },
        });
      }
      return updatedOrder;
    }).then((updatedOrder) => {
      // Tell the carrier their payment has been released.
      void this.notifications.notifyCompany(order.carrierId, {
        type: 'PAYMENT_RELEASED',
        titleAr: 'تم تحرير دفعتك',
        bodyAr: `${order.orderNumber} — أُضيفت مستحقاتك إلى رصيدك`,
        data: { orderId: id, kind: 'payment' },
      });
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
    const result = await this.prisma.$transaction(async (tx) => {
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
    // Tell the driver directly — they now have a trip to execute.
    void this.notifications.notifyUser(driver.userId, {
      type: 'ORDER_ASSIGNED',
      titleAr: 'تم إسنادك لرحلة جديدة',
      bodyAr: `${order.orderNumber} — ${order.originCity} ← ${order.destinationCity}`,
      data: { orderId, kind: 'trip' },
    });
    return result;
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
      void this.notifications.notifyCompany(order.clientId, {
        type: 'SHIPMENT_STARTED',
        titleAr: 'الشحنة في الطريق',
        bodyAr: `${order.orderNumber} — انطلقت شحنتك`,
        data: { orderId: id, kind: 'order' },
      });
    } else if (dto.status === 'DELIVERED') {
      await this.prisma.order.update({
        where: { id },
        data: { status: 'DELIVERED', actualDeliveryAt: new Date() },
      });
      this.realtime.emitOrderStatus(id, { status: 'DELIVERED' });
      void this.notifications.notifyCompany(order.clientId, {
        type: 'SHIPMENT_DELIVERED',
        titleAr: 'تم تسليم الشحنة',
        bodyAr: `${order.orderNumber} — بانتظار تأكيد الاستلام`,
        data: { orderId: id, kind: 'order' },
      });
    }
    return event;
  }

  private async requireOrder(id: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'الطلب غير موجود' });
    return order;
  }

  private assertViewAccess(
    order: { clientId: string; carrierId: string | null; status: string; orderLegs?: { carrierId: string | null }[] },
    actor: AuthUser,
  ) {
    if (this.isAdmin(actor)) return;
    if (order.clientId === actor.companyId) return;
    if (order.carrierId === actor.companyId) return;
    // A carrier serving one of the order's legs (phase 2) may view it.
    if (order.orderLegs?.some((l) => l.carrierId && l.carrierId === actor.companyId)) return;
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
  private async resolveSourcing(dto: CreateOrderDto, companyId: string, legTotal?: number | null) {
    const policy = await this.policies.effectiveForCompany(companyId);
    // When the client doesn't pick a sourcing module, fall back to the group's
    // admin-set default (`defaultAssignment`). If no default is set, derive a
    // sensible one from the allow toggles — preferring the open market, but
    // falling back to direct when the market is disabled — so an unspecified
    // mode never lands on a disabled module and errors.
    const toggleFallback: 'OPEN' | 'DIRECT' =
      policy.allowMarket ? 'OPEN' : (policy.allowDirect ? 'DIRECT' : 'OPEN');
    const defaultMode: 'OPEN' | 'DIRECT' =
      policy.defaultAssignment === 'DIRECT' ? 'DIRECT'
      : policy.defaultAssignment === 'MARKET' ? 'OPEN'
      : toggleFallback;
    const resolvedMode = dto.mode ?? defaultMode;
    let mode: 'OPEN' | 'DIRECT' = resolvedMode === 'DIRECT' ? 'DIRECT' : 'OPEN';
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
    // A direct target must be a provider this client is allowed to see. A forced
    // carrier is always allowed; otherwise it must fall within the visible set.
    if (mode === 'DIRECT' && targetCarrierId && targetCarrierId !== policy.forcedCarrierId) {
      const visible = await this.policies.visibleCarrierIds(companyId);
      if (visible !== null && !visible.includes(targetCarrierId)) {
        throw new ForbiddenException({ code: 'POLICY_CARRIER_NOT_VISIBLE', message: 'المزوّد غير متاح لهذا العميل' });
      }
    }
    // PRICING is independent of ASSIGNMENT. FIXED = the client set the price;
    // BIDDING (مناقصة) = carriers propose it. FIXED works with the market too:
    // an OPEN+FIXED order is published at a set price and carriers accept it.
    //   • an explicit `agreedPriceUpfront` ⇒ FIXED (any mode — this is what makes
    //     OPEN+FIXED possible).
    //   • a heterogeneous order's summed leg prices ⇒ FIXED only when DIRECT
    //     (auto-assign); an OPEN heterogeneous order keeps per-leg BIDDING so
    //     carriers can bid on individual legs.
    const explicitFixed = dto.agreedPriceUpfront != null;
    const legFixed = !explicitFixed && legTotal != null && mode === 'DIRECT';
    const priceMode: 'FIXED' | 'BIDDING' = (explicitFixed || legFixed) ? 'FIXED' : 'BIDDING';
    const fixedPrice = explicitFixed ? dto.agreedPriceUpfront! : (legFixed ? legTotal! : null);
    if (priceMode === 'FIXED' && !policy.allowFixedPricing) {
      throw new ForbiddenException({ code: 'POLICY_FIXED_PRICING_DISABLED', message: 'التسعير الثابت غير مسموح لهذا العميل' });
    }
    if (priceMode === 'BIDDING' && !policy.allowMarketPricing) {
      throw new ForbiddenException({ code: 'POLICY_BIDDING_DISABLED', message: 'التسعير بالمناقصة غير مسموح لهذا العميل' });
    }
    // Collection method is validated against the same policy (allowPrepaid/allowCOD).
    const collectionMethod = this.collection.resolveMethod(dto.collectionMethod, policy);
    return { mode, targetCarrierId, fixedPrice, priceMode, collectionMethod };
  }

  /**
   * Resolve an order's/leg's commission + VAT breakdown from the client's
   * effective policy (rate / who bears it / price VAT-inclusive) and the
   * carrier's VAT-registration status. The single pricing source of truth.
   */
  async resolveFinancials(price: number, clientId: string, carrierId: string | null): Promise<OrderFinancials> {
    const policy = await this.policies.effectiveForCompany(clientId);
    const carrier = carrierId
      ? await this.prisma.company.findUnique({ where: { id: carrierId }, select: { vatRegistered: true, commissionRate: true } })
      : null;
    // Precedence for the rate: plan/profile commission > the carrier's own rate > default.
    const commissionRate = policy.commissionRate ?? (carrier?.commissionRate != null ? Number(carrier.commissionRate) : undefined);
    return computeOrderFinancials({
      price,
      priceVatInclusive: policy.priceVatInclusive,
      commissionRate,
      commissionAppliesTo: policy.commissionAppliesTo as OrderFinancials['commissionAppliesTo'] | undefined,
      carrierVatRegistered: carrier?.vatRegistered,
    });
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
        orderLegs: { orderBy: { sequence: 'asc' } },
        stops: { where: { legSequence: { not: null } }, orderBy: [{ legSequence: 'asc' }, { sequence: 'asc' }] },
      },
    });
    if (!order) throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'الطلب غير موجود' });
    this.assertViewAccess(order, actor);

    // Per-leg intermediate stops (waypoints), grouped by the leg they belong to.
    // Each leg's route is PICKUP(origin) → waypoints → DELIVERY(destination); the
    // first and last rows are those synthesized endpoints, so only the middle rows
    // are the client's added waypoints.
    const stopsByLeg = new Map<number, Array<{ type: string; city: string; region: string; address: string; instructions: string | null; status: string }>>();
    {
      const grouped = new Map<number, typeof order.stops>();
      for (const s of order.stops) {
        if (s.legSequence == null) continue;
        const arr = grouped.get(s.legSequence) ?? [];
        arr.push(s);
        grouped.set(s.legSequence, arr);
      }
      for (const [seq, rows] of grouped) {
        const sorted = [...rows].sort((a, b) => a.sequence - b.sequence);
        const middle = sorted.slice(1, Math.max(1, sorted.length - 1)); // drop synthesized pickup + delivery
        stopsByLeg.set(seq, middle.map((s) => ({ type: s.type, city: s.city, region: s.region, address: s.address, instructions: s.instructions, status: s.status })));
      }
    }

    const count = order.truckCount ?? order.orderTrucks.length;
    const heterogeneous = order.orderLegs.length > 0;
    // Per-leg heterogeneous spec (truck type / destination / price / carrier), if
    // any. Legs with no spec row fall back to the order's own values (homogeneous).
    const specBySeq = new Map(order.orderLegs.map((l) => [l.sequence, l]));
    const legCarrierIds = order.orderLegs.map((l) => l.carrierId).filter((c): c is string => !!c);
    const legCarriers = legCarrierIds.length
      ? await this.prisma.company.findMany({ where: { id: { in: legCarrierIds } }, select: { id: true, nameAr: true } })
      : [];
    const carrierName = (cid?: string | null) => (cid ? legCarriers.find((c) => c.id === cid)?.nameAr : undefined);
    // Per-leg bids: a count per leg (for the client/admin), and — when the actor
    // is a carrier — that carrier's own bid on each leg (for the carrier UI).
    const legIds = order.orderLegs.map((l) => l.id);
    const legBids = (heterogeneous && legIds.length)
      ? await this.prisma.bid.findMany({
          where: { orderLegId: { in: legIds }, status: { in: ['PENDING', 'ACCEPTED'] } },
          select: { orderLegId: true, carrierId: true, amount: true, status: true },
        })
      : [];
    const bidsForSeq = (legId?: string) => legBids.filter((b) => b.orderLegId === legId);
    const myBidFor = (legId?: string) => (actor.companyId ? legBids.find((b) => b.orderLegId === legId && b.carrierId === actor.companyId) : undefined);
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
    // Each leg's spec: its own values when heterogeneous, else the order's.
    const specFor = (index: number) => {
      const s = specBySeq.get(index);
      const myBid = myBidFor(s?.id);
      return {
        requiredTruckType: s?.requiredTruckType ?? order.requiredTruckType,
        destinationCity: s?.destinationCity ?? order.destinationCity,
        destinationRegion: s?.destinationRegion ?? order.destinationRegion,
        destinationAddress: s?.destinationAddress ?? order.destinationAddress,
        price: s?.price != null ? Number(s.price) : undefined,
        carrierId: s?.carrierId ?? undefined,
        carrierName: carrierName(s?.carrierId),
        carrierAmount: s?.carrierAmount != null ? Number(s.carrierAmount) : undefined,
        bidCount: bidsForSeq(s?.id).length,
        myBidAmount: myBid ? Number(myBid.amount) : undefined,
        myBidStatus: myBid?.status,
        stops: stopsByLeg.get(index) ?? [],
      };
    };
    // Authoritative leg status: OrderLeg.status for heterogeneous orders, the
    // distributed OrderTruck's status otherwise.
    const statusFor = (index: number, row?: { status: string }) =>
      heterogeneous ? (specBySeq.get(index)?.status ?? 'PENDING') : (row ? row.status : 'PENDING');
    const legs = Array.from({ length: count }, (_, i) => {
      const index = i + 1;
      const row = bySeq.get(index);
      const spec = specFor(index);
      return row
        ? {
            index,
            reference: refFor(index),
            ...spec,
            truckId: row.truckId,
            driverId: row.driverId ?? undefined,
            status: statusFor(index, row),
            plateNumber: row.truck?.plateNumber,
            driverName: driverName(row.driverId),
          }
        : { index, reference: refFor(index), ...spec, status: statusFor(index) };
    });
    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      truckCount: count,
      heterogeneous: order.orderLegs.length > 0,
      status: order.status,
      legs,
    };
  }

  // ─── Per-leg carriers (phase 2) ──────────────────────────────

  /**
   * Authorize an action on one leg and return the order + its (optional) spec
   * row. Allowed for an admin, the leg's own carrier, or the order's carrier
   * (homogeneous orders). Used by distribute / clear / status.
   */
  private async legActor(id: string, index: number, actor: AuthUser) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      select: { id: true, carrierId: true, clientId: true, requiredTruckType: true, orderType: true },
    });
    if (!order) throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'الطلب غير موجود' });
    const leg = await this.prisma.orderLeg.findUnique({
      where: { orderId_sequence: { orderId: id, sequence: index } },
    });
    if (this.isAdmin(actor)) return { order, leg };
    if (leg?.carrierId && leg.carrierId === actor.companyId) return { order, leg };
    if (order.carrierId && order.carrierId === actor.companyId) return { order, leg };
    throw new ForbiddenException({ code: 'FORBIDDEN', message: 'لا تملك صلاحية' });
  }

  /**
   * Assign (or re-assign) a carrier to one leg of a heterogeneous order, with
   * its own price + financial split. The client or an admin does this; the
   * carrier must be visible to the client. Each leg can go to a different carrier.
   */
  async assignLegCarrier(id: string, index: number, carrierId: string, price: number | undefined, actor: AuthUser) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      select: { id: true, clientId: true, orderType: true },
    });
    if (!order) throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'الطلب غير موجود' });
    if (order.clientId !== actor.companyId && !this.isAdmin(actor)) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'لا تملك صلاحية' });
    }
    // Policy Engine capability gate: per-leg carriers must be granted by the plan.
    if (!(await this.policies.hasFeature(order.clientId, 'perLegCarriers'))) {
      throw new ForbiddenException({ code: 'FEATURE_PER_LEG_CARRIERS_DISABLED', message: 'ناقل لكل ساق غير متاح في باقتك' });
    }
    const leg = await this.prisma.orderLeg.findUnique({
      where: { orderId_sequence: { orderId: id, sequence: index } },
    });
    if (!leg) throw new NotFoundException({ code: 'LEG_NOT_FOUND', message: 'الساق غير موجودة أو الطلب ليس بسيقان متغايرة' });
    if (leg.status === 'IN_TRANSIT' || leg.status === 'DELIVERED') {
      throw new BadRequestException({ code: 'LEG_IN_PROGRESS', message: 'لا يمكن تغيير ناقل ساق قيد التنفيذ' });
    }
    const carrier = await this.prisma.company.findUnique({ where: { id: carrierId }, select: { type: true, status: true } });
    if (!carrier || carrier.type !== 'CARRIER') {
      throw new BadRequestException({ code: 'NOT_A_CARRIER', message: 'الشركة المختارة ليست ناقلًا' });
    }
    if (!(await this.policies.canCarrierServeClient(carrierId, order.clientId))) {
      throw new ForbiddenException({ code: 'POLICY_CARRIER_NOT_VISIBLE', message: 'المزوّد غير متاح لهذا العميل' });
    }
    const legPrice = price != null ? price : (leg.price != null ? Number(leg.price) : null);
    if (legPrice == null) {
      throw new BadRequestException({ code: 'NO_LEG_PRICE', message: 'لا يوجد سعر للساق' });
    }
    const fin = await this.resolveFinancials(legPrice, order.clientId, carrierId);
    await this.prisma.orderLeg.update({
      where: { id: leg.id },
      data: {
        carrierId, price: legPrice, status: 'ASSIGNED',
        commissionAmount: fin.commission, carrierAmount: fin.carrierAmount,
        serviceVatAmount: fin.serviceVat, commissionVatAmount: fin.commissionVat,
      },
    });
    await this.rollup(id);
    return this.getLegs(id, actor);
  }

  /** Remove a leg's carrier (and any distributed truck) while it is not in transit. */
  async unassignLegCarrier(id: string, index: number, actor: AuthUser) {
    const order = await this.prisma.order.findUnique({ where: { id }, select: { id: true, clientId: true } });
    if (!order) throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'الطلب غير موجود' });
    if (order.clientId !== actor.companyId && !this.isAdmin(actor)) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'لا تملك صلاحية' });
    }
    const leg = await this.prisma.orderLeg.findUnique({ where: { orderId_sequence: { orderId: id, sequence: index } } });
    if (!leg) throw new NotFoundException({ code: 'LEG_NOT_FOUND', message: 'الساق غير موجودة' });
    if (leg.status === 'IN_TRANSIT' || leg.status === 'DELIVERED') {
      throw new BadRequestException({ code: 'LEG_IN_PROGRESS', message: 'لا يمكن إلغاء ناقل ساق قيد التنفيذ' });
    }
    await this.prisma.$transaction([
      this.prisma.orderTruck.deleteMany({ where: { orderId: id, sequence: index } }),
      this.prisma.orderLeg.update({
        where: { id: leg.id },
        data: { carrierId: null, commissionAmount: null, carrierAmount: null, status: 'PENDING' },
      }),
    ]);
    await this.rollup(id);
    return this.getLegs(id, actor);
  }

  /** Release a leg's payout to its carrier (on leg delivery). Idempotent. */
  private async settleLeg(
    tx: Prisma.TransactionClient,
    leg: { id: string; carrierId: string | null; carrierAmount: Prisma.Decimal | null; settledAt: Date | null; orderId: string; sequence: number },
  ) {
    if (!leg.carrierId || leg.settledAt || leg.carrierAmount == null) return;
    const amount = money(leg.carrierAmount);
    const updated = await tx.company.update({
      where: { id: leg.carrierId },
      data: { walletBalance: { increment: amount } },
    });
    await tx.transaction.create({
      data: {
        companyId: leg.carrierId,
        type: 'credit',
        amount: round2(amount),
        balance: round2(money(updated.walletBalance)),
        description: `Leg payout · order leg #${leg.sequence}`,
        orderId: leg.orderId,
      },
    });
    await tx.orderLeg.update({ where: { id: leg.id }, data: { settledAt: new Date() } });
  }

  async distributeLeg(id: string, index: number, truckId: string, driverId: string | undefined, actor: AuthUser) {
    const { order } = await this.legActor(id, index, actor);
    // The truck must match the leg's required type (the leg's own type for a
    // heterogeneous order, else the order's) and belong to the acting carrier.
    const [truck, legSpec] = await Promise.all([
      this.prisma.truck.findUnique({ where: { id: truckId }, select: { type: true, companyId: true } }),
      this.prisma.orderLeg.findUnique({ where: { orderId_sequence: { orderId: order.id, sequence: index } }, select: { requiredTruckType: true } }),
    ]);
    if (truck && !this.isAdmin(actor) && truck.companyId !== actor.companyId) {
      throw new ForbiddenException({ code: 'TRUCK_NOT_YOURS', message: 'الشاحنة ليست ضمن أسطولك' });
    }
    const requiredType = legSpec?.requiredTruckType ?? order.requiredTruckType;
    if (truck && truck.type !== requiredType) {
      throw new BadRequestException({ code: 'LEG_TRUCK_TYPE_MISMATCH', message: 'نوع الشاحنة لا يطابق نوع الساق المطلوب' });
    }
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
    const { order } = await this.legActor(id, index, actor);
    await this.prisma.orderTruck.deleteMany({ where: { orderId: order.id, sequence: index } });
    await this.rollup(order.id);
    return this.getLegs(id, actor);
  }

  async setLegStatus(id: string, index: number, status: string, actor: AuthUser) {
    const { order, leg } = await this.legActor(id, index, actor);
    if (!['ASSIGNED', 'IN_TRANSIT', 'DELIVERED'].includes(status)) {
      throw new BadRequestException({ code: 'INVALID_LEG_STATUS', message: 'حالة ساق غير صحيحة' });
    }
    if (leg) {
      // Heterogeneous: OrderLeg.status is authoritative; settle the leg payout on delivery.
      await this.prisma.$transaction(async (tx) => {
        await tx.orderLeg.update({ where: { id: leg.id }, data: { status } });
        await tx.orderTruck.updateMany({ where: { orderId: id, sequence: index }, data: { status } });
        if (status === 'DELIVERED') {
          await this.settleLeg(tx, {
            id: leg.id, carrierId: leg.carrierId, carrierAmount: leg.carrierAmount,
            settledAt: leg.settledAt, orderId: leg.orderId, sequence: leg.sequence,
          });
        }
      });
    } else {
      await this.prisma.orderTruck.updateMany({ where: { orderId: order.id, sequence: index }, data: { status } });
    }
    await this.rollup(order.id);
    return this.getLegs(id, actor);
  }

  /** Derive a consolidated order's status from its legs (forward-only). */
  private async rollup(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { orderTrucks: true, orderLegs: true },
    });
    if (!order || order.orderType !== 'CONSOLIDATED') return;
    const n = order.truckCount ?? 0;
    // Heterogeneous orders track status per OrderLeg (one per leg, with its own
    // carrier); homogeneous orders track it on the distributed OrderTruck rows.
    const heterogeneous = order.orderLegs.length > 0;
    const legStatuses = heterogeneous
      ? order.orderLegs.map((l) => l.status)
      : order.orderTrucks.map((l) => l.status);
    const assignedCount = heterogeneous
      ? order.orderLegs.filter((l) => l.carrierId).length
      : order.orderTrucks.length;
    let status = order.status;
    if (legStatuses.length > 0 && legStatuses.every((s) => s === 'DELIVERED')) status = 'DELIVERED';
    // Any leg moving or already delivered (but not all) means the order is in progress.
    else if (legStatuses.some((s) => s === 'IN_TRANSIT' || s === 'DELIVERED')) status = 'IN_TRANSIT';
    else if (n > 0 && assignedCount >= n) status = 'ASSIGNED';
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
      include: { stops: { orderBy: [{ legSequence: 'asc' }, { sequence: 'asc' }] } },
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

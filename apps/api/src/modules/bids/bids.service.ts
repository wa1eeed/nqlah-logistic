import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { money, round2 } from '../../common/money/money';
import { CollectionService } from '../payments/collection/collection.service';
import { PoliciesService } from '../policies/policies.service';
import { CreateBidDto, UpdateBidDto } from './dto/bid.dto';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import type { Prisma } from '../../generated/prisma';

@Injectable()
export class BidsService {
  constructor(
    private prisma: PrismaService,
    private collection: CollectionService,
    private policies: PoliciesService,
  ) {}

  async list(orderId: string, legIndex?: number) {
    // When a leg is given, return that leg's bids; otherwise the order-level bids.
    let orderLegId: string | null | undefined = undefined;
    if (legIndex != null) {
      const leg = await this.prisma.orderLeg.findUnique({
        where: { orderId_sequence: { orderId, sequence: legIndex } },
        select: { id: true },
      });
      orderLegId = leg?.id ?? '__none__';
    }
    return this.prisma.bid.findMany({
      where: { orderId, ...(orderLegId !== undefined ? { orderLegId } : { orderLegId: null }) },
      include: { carrier: { select: { id: true, nameAr: true, logo: true, status: true } } },
      orderBy: { amount: 'asc' },
    });
  }

  async create(orderId: string, dto: CreateBidDto, actor: AuthUser) {
    if (!actor.companyId) {
      throw new BadRequestException({ code: 'NO_COMPANY', message: 'يجب أن تكون شركة ناقلة' });
    }
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'الطلب غير موجود' });
    if (!['PUBLISHED', 'BIDDING'].includes(order.status)) {
      throw new BadRequestException({ code: 'BIDDING_CLOSED', message: 'باب العروض مغلق' });
    }
    // Provider visibility: the order's client may restrict its market to a set
    // of providers. A carrier outside that set cannot bid.
    if (!(await this.policies.canCarrierServeClient(actor.companyId, order.clientId))) {
      throw new ForbiddenException({ code: 'POLICY_CARRIER_NOT_VISIBLE', message: 'هذا الطلب غير متاح لك' });
    }

    // Phase 2b — a per-leg bid targets a specific leg of a heterogeneous order.
    // The leg must still be open (no carrier yet), and the carrier's truck type
    // must be able to serve it.
    let orderLegId: string | null = null;
    if (dto.legIndex != null) {
      const leg = await this.prisma.orderLeg.findUnique({
        where: { orderId_sequence: { orderId, sequence: dto.legIndex } },
      });
      if (!leg) throw new NotFoundException({ code: 'LEG_NOT_FOUND', message: 'الساق غير موجودة' });
      if (leg.carrierId) throw new BadRequestException({ code: 'LEG_ALREADY_ASSIGNED', message: 'الساق مُسنَدة بالفعل' });
      const serves = await this.prisma.truck.findFirst({
        where: { companyId: actor.companyId, type: leg.requiredTruckType },
        select: { id: true },
      });
      if (!serves) throw new BadRequestException({ code: 'NO_MATCHING_TRUCK', message: 'لا تملك شاحنة تطابق نوع الساق' });
      orderLegId = leg.id;
    }

    // Idempotent per (order, carrier) for order-level bids, or (leg, carrier) for
    // leg bids. PENDING → edit in place; REJECTED/WITHDRAWN/EXPIRED → re-bid;
    // ACCEPTED → locked.
    const existing = await this.prisma.bid.findFirst({
      where: { orderId, carrierId: actor.companyId, orderLegId },
    });
    if (existing && existing.status === 'ACCEPTED') {
      throw new BadRequestException({ code: 'BID_LOCKED', message: 'العرض مقبول بالفعل' });
    }
    const data = {
      amount: dto.amount,
      estimatedDays: dto.estimatedDays ?? 0,
      estimatedHours: dto.estimatedHours,
      proposedPickupDate: dto.proposedPickupDate ? new Date(dto.proposedPickupDate) : null,
      proposedDeliveryDate: dto.proposedDeliveryDate ? new Date(dto.proposedDeliveryDate) : null,
      notes: dto.notes,
    };
    const bid = existing
      ? await this.prisma.bid.update({ where: { id: existing.id }, data: { ...data, status: 'PENDING' } })
      : await this.prisma.bid.create({ data: { orderId, carrierId: actor.companyId, orderLegId, ...data } });

    if (order.status === 'PUBLISHED') {
      await this.prisma.order.update({ where: { id: orderId }, data: { status: 'BIDDING' } });
    }
    return bid;
  }

  async update(orderId: string, id: string, dto: UpdateBidDto, actor: AuthUser) {
    const bid = await this.requireBid(id);
    if (bid.carrierId !== actor.companyId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'هذا ليس عرضك' });
    }
    if (bid.status !== 'PENDING') {
      throw new BadRequestException({ code: 'BID_LOCKED', message: 'لا يمكن تعديل العرض' });
    }
    return this.prisma.bid.update({ where: { id }, data: dto });
  }

  async accept(orderId: string, id: string, actor: AuthUser) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'الطلب غير موجود' });
    if (order.clientId !== actor.companyId && actor.role !== 'ADMIN' && actor.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'لا تملك صلاحية' });
    }
    const bid = await this.requireBid(id);
    const commission = round2(money(bid.amount).mul(0.08));
    const carrierAmount = round2(money(bid.amount).sub(commission));

    // ── Per-leg bid (phase 2b): award the leg to this carrier ──
    if (bid.orderLegId) {
      return this.prisma.$transaction(async (tx) => {
        const updated = await tx.bid.update({ where: { id }, data: { status: 'ACCEPTED' } });
        // Reject the other pending bids on the SAME leg only.
        await tx.bid.updateMany({
          where: { orderLegId: bid.orderLegId, NOT: { id }, status: 'PENDING' },
          data: { status: 'REJECTED' },
        });
        await tx.orderLeg.update({
          where: { id: bid.orderLegId! },
          data: {
            carrierId: bid.carrierId,
            price: bid.amount,
            commissionAmount: commission,
            carrierAmount,
            status: 'ASSIGNED',
          },
        });
        await this.rollupOrder(tx, orderId);
        return updated;
      });
    }

    // ── Classic order-level bid ──
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.bid.update({ where: { id }, data: { status: 'ACCEPTED' } });
      await tx.bid.updateMany({
        where: { orderId, orderLegId: null, NOT: { id }, status: 'PENDING' },
        data: { status: 'REJECTED' },
      });
      const assignedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          carrierId: bid.carrierId,
          agreedPrice: bid.amount,
          commissionAmount: commission,
          carrierAmount,
          status: 'ASSIGNED',
        },
      });
      // Open the collection per the order's method (escrow hold by default, or
      // prepaid-wallet/gateway/COD). Idempotent — one payment per order.
      await this.collection.initiate(tx, assignedOrder);
      return updated;
    });
  }

  /** Recompute a consolidated order's status from its legs after a leg award. */
  private async rollupOrder(tx: Prisma.TransactionClient, orderId: string) {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      select: { status: true, orderType: true, truckCount: true, orderLegs: { select: { status: true, carrierId: true } } },
    });
    if (!order || order.orderType !== 'CONSOLIDATED' || order.orderLegs.length === 0) return;
    const statuses = order.orderLegs.map((l) => l.status);
    const assignedCount = order.orderLegs.filter((l) => l.carrierId).length;
    const n = order.truckCount ?? order.orderLegs.length;
    let status = order.status;
    if (statuses.every((s) => s === 'DELIVERED')) status = 'DELIVERED';
    else if (statuses.some((s) => s === 'IN_TRANSIT' || s === 'DELIVERED')) status = 'IN_TRANSIT';
    else if (n > 0 && assignedCount >= n) status = 'ASSIGNED';
    if (status !== order.status) await tx.order.update({ where: { id: orderId }, data: { status } });
  }

  async reject(orderId: string, id: string, actor: AuthUser) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'الطلب غير موجود' });
    if (order.clientId !== actor.companyId && actor.role !== 'ADMIN' && actor.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'لا تملك صلاحية' });
    }
    return this.prisma.bid.update({ where: { id }, data: { status: 'REJECTED' } });
  }

  async withdraw(orderId: string, id: string, actor: AuthUser) {
    const bid = await this.requireBid(id);
    if (bid.carrierId !== actor.companyId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'هذا ليس عرضك' });
    }
    if (bid.status !== 'PENDING') {
      throw new BadRequestException({ code: 'BID_LOCKED', message: 'لا يمكن سحب عرض غير معلّق' });
    }
    return this.prisma.bid.update({ where: { id }, data: { status: 'WITHDRAWN' } });
  }

  private async requireBid(id: string) {
    const bid = await this.prisma.bid.findUnique({ where: { id } });
    if (!bid) throw new NotFoundException({ code: 'BID_NOT_FOUND', message: 'العرض غير موجود' });
    return bid;
  }
}

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { money, round2, toNum } from '../../../common/money/money';
import type { AuthUser } from '../../../common/decorators/current-user.decorator';
import type { Prisma } from '../../../generated/prisma';
import { PaymentGateway } from './gateway';

export const COLLECTION_METHODS = ['ESCROW', 'PREPAID_WALLET', 'PREPAID_GATEWAY', 'COD'] as const;
export type CollectionMethod = (typeof COLLECTION_METHODS)[number];

/** The slice of policy this service consults. */
interface CollectionPolicy {
  allowPrepaid: boolean;
  allowCOD: boolean;
  /** The group's admin-set default collection method (null → ESCROW). */
  defaultCollectionMethod?: string | null;
  /** When true, the admin's default is forced and the client cannot override it. */
  enforceCollectionMethod?: boolean;
}

/** The order fields the collection flow needs. */
interface SettleableOrder {
  id: string;
  orderNumber: string;
  clientId: string;
  carrierId: string | null;
  collectionMethod: string;
  agreedPrice: Prisma.Decimal | null;
  commissionAmount: Prisma.Decimal | null;
  carrierAmount: Prisma.Decimal | null;
}

/**
 * Collection (payment) modules. Each method is a settlement strategy selected by
 * the client's policy and carried on the order:
 *
 * - ESCROW          — platform holds (logical) until completion; carrier is paid
 *                     on release. Today's default; behavior unchanged.
 * - PREPAID_WALLET  — the client's wallet is debited now; carrier paid on release.
 * - PREPAID_GATEWAY — charged online now (stub gateway); carrier paid on release.
 * - COD             — nothing upfront; the carrier collects cash on delivery and
 *                     then owes the platform its commission (debited on release).
 *
 * Tx-taking methods run inside the caller's `$transaction`.
 */
@Injectable()
export class CollectionService {
  constructor(private prisma: PrismaService, private gateway: PaymentGateway) {}

  /**
   * Resolve the collection method for a new order. The admin configures this
   * per group: when `enforceCollectionMethod` is set the client's choice is
   * ignored and the group's `defaultCollectionMethod` is forced; otherwise the
   * client's request wins, falling back to the group default, then ESCROW.
   * The result is always validated against the group's allow toggles.
   */
  resolveMethod(requested: string | undefined, policy: CollectionPolicy): CollectionMethod {
    const groupDefault = (policy.defaultCollectionMethod || 'ESCROW') as CollectionMethod;
    const method = (policy.enforceCollectionMethod
      ? groupDefault
      : ((requested as CollectionMethod) ?? groupDefault));
    if (!COLLECTION_METHODS.includes(method)) {
      throw new BadRequestException({ code: 'BAD_COLLECTION_METHOD', message: 'طريقة دفع غير معروفة' });
    }
    if ((method === 'PREPAID_WALLET' || method === 'PREPAID_GATEWAY') && !policy.allowPrepaid) {
      throw new ForbiddenException({ code: 'POLICY_PREPAID_DISABLED', message: 'الدفع المسبق غير مسموح لهذا العميل' });
    }
    if (method === 'COD' && !policy.allowCOD) {
      throw new ForbiddenException({ code: 'POLICY_COD_DISABLED', message: 'الدفع عند التسليم غير مسموح لهذا العميل' });
    }
    return method;
  }

  /**
   * Create (or refresh) the order's Payment and perform the upfront money move
   * for the method. Idempotent on the order (Payment.orderId is unique).
   */
  async initiate(tx: Prisma.TransactionClient, order: SettleableOrder) {
    if (order.agreedPrice == null) {
      throw new BadRequestException({ code: 'NO_PRICE', message: 'لا يوجد سعر متفق عليه' });
    }
    const method = (order.collectionMethod || 'ESCROW') as CollectionMethod;
    const total = money(order.agreedPrice);
    const base = {
      orderId: order.id,
      totalAmount: total,
      commissionAmount: money(order.commissionAmount),
      carrierAmount: money(order.carrierAmount),
      collectionMethod: method,
    };

    let data: Prisma.PaymentUncheckedCreateInput;
    if (method === 'PREPAID_WALLET') {
      await this.debitClient(tx, order.clientId, total, order.orderNumber, order.id);
      data = { ...base, status: 'HELD', heldAt: new Date(), dueOnDelivery: 0 };
    } else if (method === 'PREPAID_GATEWAY') {
      const res = await this.gateway.charge({
        orderId: order.id, companyId: order.clientId, amount: toNum(total),
        description: `Prepay order ${order.orderNumber}`,
      });
      if (!res.ok) throw new BadRequestException({ code: 'PAYMENT_FAILED', message: 'تعذّر إتمام الدفع' });
      data = { ...base, status: 'HELD', paidAt: new Date(), transactionRef: res.reference, dueOnDelivery: 0 };
    } else if (method === 'COD') {
      data = { ...base, status: 'PENDING', dueOnDelivery: total };
    } else {
      // ESCROW (default): logical hold, no money movement.
      data = { ...base, status: 'HELD', heldAt: new Date(), dueOnDelivery: 0 };
    }

    return tx.payment.upsert({
      where: { orderId: order.id },
      create: data,
      update: data,
    });
  }

  /**
   * Settle a payment when its order completes. Prepaid/escrow → credit the
   * carrier its payout. COD → the carrier already holds the cash, so it owes the
   * platform the commission (debited from its wallet); collection must have been
   * recorded first. Called from order completion and admin release.
   */
  async settle(tx: Prisma.TransactionClient, paymentId: string) {
    const payment = await tx.payment.findUnique({ where: { id: paymentId }, include: { order: true } });
    if (!payment) throw new NotFoundException({ code: 'PAYMENT_NOT_FOUND', message: 'الدفعة غير موجودة' });
    if (payment.status === 'RELEASED') return payment;
    const carrierId = payment.order.carrierId;

    if (payment.collectionMethod === 'COD') {
      if (!payment.collectedAt) {
        throw new BadRequestException({ code: 'COD_NOT_COLLECTED', message: 'لم يُسجَّل تحصيل الدفع عند التسليم' });
      }
      if (carrierId) {
        await this.moveWallet(tx, carrierId, money(payment.commissionAmount).negated(),
          `Commission on COD order ${payment.order.orderNumber}`, payment.orderId, 'COMMISSION_DUE');
      }
    } else if (carrierId) {
      await this.moveWallet(tx, carrierId, money(payment.carrierAmount),
        `Payout for order ${payment.order.orderNumber}`, payment.orderId, 'credit');
    }

    return tx.payment.update({
      where: { id: payment.id },
      data: { status: 'RELEASED', releasedAt: new Date() },
    });
  }

  /** Reverse a payment when its order is cancelled (refund prepaid money). */
  async refund(tx: Prisma.TransactionClient, paymentId: string) {
    const payment = await tx.payment.findUnique({ where: { id: paymentId }, include: { order: true } });
    if (!payment || payment.status === 'RELEASED' || payment.status === 'REFUNDED') return payment ?? null;

    if (payment.collectionMethod === 'PREPAID_WALLET' && payment.status === 'HELD') {
      await this.moveWallet(tx, payment.order.clientId, money(payment.totalAmount),
        `Refund for cancelled order ${payment.order.orderNumber}`, payment.orderId, 'refund');
    } else if (payment.collectionMethod === 'PREPAID_GATEWAY' && payment.transactionRef) {
      await this.gateway.refund(payment.transactionRef, toNum(payment.totalAmount));
    }
    return tx.payment.update({ where: { id: payment.id }, data: { status: 'REFUNDED' } });
  }

  /** Record that the on-delivery (COD) amount was collected. Carrier or admin. */
  async recordCollection(paymentId: string, actor: AuthUser) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId }, include: { order: true } });
    if (!payment) throw new NotFoundException({ code: 'PAYMENT_NOT_FOUND', message: 'الدفعة غير موجودة' });
    const isAdmin = actor.role === 'ADMIN' || actor.role === 'SUPER_ADMIN';
    if (!isAdmin && payment.order.carrierId !== actor.companyId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'لا تملك صلاحية' });
    }
    if (payment.collectionMethod !== 'COD') {
      throw new BadRequestException({ code: 'NOT_COD', message: 'الدفعة ليست دفعًا عند التسليم' });
    }
    if (payment.collectedAt) return payment;
    return this.prisma.payment.update({ where: { id: paymentId }, data: { collectedAt: new Date() } });
  }

  // ─── internals ───────────────────────────────────────────────

  /** Debit a client wallet for a prepaid order (no credit line — must cover). */
  private async debitClient(
    tx: Prisma.TransactionClient, companyId: string, amount: Prisma.Decimal, orderNumber: string, orderId: string,
  ) {
    const company = await tx.company.findUnique({ where: { id: companyId } });
    if (!company) throw new NotFoundException({ code: 'COMPANY_NOT_FOUND', message: 'الشركة غير موجودة' });
    if (money(company.walletBalance).lessThan(amount)) {
      throw new BadRequestException({ code: 'INSUFFICIENT_WALLET', message: 'رصيد المحفظة غير كافٍ للدفع المسبق' });
    }
    await this.moveWallet(tx, companyId, amount.negated(), `Prepay order ${orderNumber}`, orderId, 'debit');
  }

  /** Apply a signed delta to a company wallet and append a ledger Transaction. */
  private async moveWallet(
    tx: Prisma.TransactionClient, companyId: string, delta: Prisma.Decimal,
    description: string, orderId: string, type: string,
  ) {
    const updated = await tx.company.update({
      where: { id: companyId },
      data: { walletBalance: { increment: delta } },
    });
    await tx.transaction.create({
      data: {
        companyId,
        type,
        amount: round2(delta),
        balance: round2(money(updated.walletBalance)),
        description,
        orderId,
      },
    });
  }
}

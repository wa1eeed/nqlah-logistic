import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { InvoiceStatus, OrderStatus } from '../../generated/prisma';

/** Days between a deletion request and the actual purge (grace period). */
const GRACE_DAYS = 30;

/** Order statuses that count as "in progress" and block account deletion. */
const ACTIVE_ORDER_STATUSES: OrderStatus[] = [
  'PUBLISHED', 'BIDDING', 'ASSIGNED', 'CONFIRMED', 'IN_TRANSIT', 'DELIVERED', 'DISPUTED',
];

/** Invoice statuses that count as an outstanding financial due. */
const UNPAID_INVOICE_STATUSES: InvoiceStatus[] = ['ISSUED', 'OVERDUE'];

export interface DeletionBlocker {
  orders: Array<{ orderNumber: string; status: string; route: string }>;
  dues: Array<{ invoiceNumber: string; status: string; totalAmount: string }>;
}

export interface DeletionStatus {
  status: 'none' | 'scheduled';
  requestedAt: string | null;
  scheduledAt: string | null;
}

/**
 * Account self-service deletion (Apple App Review 5.1.1(v)). A real deletion:
 * requesting it freezes the account immediately and schedules a purge
 * `GRACE_DAYS` later; the user can cancel before then. The purge (see the
 * scheduled job) anonymizes personal data and keeps only legally-required
 * (anonymized) financial records.
 */
@Injectable()
export class AccountService {
  constructor(private prisma: PrismaService) {}

  /** Orders + unpaid invoices that must be resolved before deletion is allowed. */
  async deletionBlockers(companyId: string | null): Promise<DeletionBlocker> {
    if (!companyId) return { orders: [], dues: [] };

    const [orders, dues] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          OR: [{ clientId: companyId }, { carrierId: companyId }],
          status: { in: ACTIVE_ORDER_STATUSES },
        },
        select: { orderNumber: true, status: true, originCity: true, destinationCity: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.invoice.findMany({
        where: { receiverId: companyId, status: { in: UNPAID_INVOICE_STATUSES } },
        select: { invoiceNumber: true, status: true, totalAmount: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    return {
      orders: orders.map((o) => ({
        orderNumber: o.orderNumber,
        status: o.status,
        route: `${o.originCity} → ${o.destinationCity}`,
      })),
      dues: dues.map((d) => ({
        invoiceNumber: d.invoiceNumber,
        status: d.status,
        totalAmount: d.totalAmount.toString(),
      })),
    };
  }

  private toStatus(u: { deletionRequestedAt: Date | null; deletionScheduledAt: Date | null }): DeletionStatus {
    return {
      status: u.deletionScheduledAt ? 'scheduled' : 'none',
      requestedAt: u.deletionRequestedAt?.toISOString() ?? null,
      scheduledAt: u.deletionScheduledAt?.toISOString() ?? null,
    };
  }

  /** Current deletion status + blockers, so the app can render the right screen. */
  async deletionOverview(userId: string, companyId: string | null) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { deletionRequestedAt: true, deletionScheduledAt: true },
    });
    if (!user) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'المستخدم غير موجود' });
    const blockers = await this.deletionBlockers(companyId);
    return {
      ...this.toStatus(user),
      graceDays: GRACE_DAYS,
      canDelete: blockers.orders.length === 0 && blockers.dues.length === 0,
      blockers,
    };
  }

  /** Request deletion. Blocks with the pending items if any remain. */
  async requestDeletion(userId: string, companyId: string | null): Promise<DeletionStatus> {
    const blockers = await this.deletionBlockers(companyId);
    if (blockers.orders.length > 0 || blockers.dues.length > 0) {
      throw new BadRequestException({
        code: 'DELETION_BLOCKED',
        message: 'لا يمكن طلب حذف الحساب قبل إنهاء الطلبات الجارية والمستحقات المالية.',
        blockers,
      });
    }
    const now = new Date();
    const scheduled = new Date(now.getTime() + GRACE_DAYS * 24 * 60 * 60 * 1000);
    const user = await this.prisma.user.update({
      where: { id: userId },
      // Freeze immediately + schedule the real purge.
      data: { deletionRequestedAt: now, deletionScheduledAt: scheduled, isActive: false },
      select: { deletionRequestedAt: true, deletionScheduledAt: true },
    });
    return this.toStatus(user);
  }

  /** Cancel a pending deletion (only during the grace window) and reactivate. */
  async cancelDeletion(userId: string): Promise<DeletionStatus> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { deletionRequestedAt: null, deletionScheduledAt: null, isActive: true },
      select: { deletionRequestedAt: true, deletionScheduledAt: true },
    });
    return this.toStatus(user);
  }
}

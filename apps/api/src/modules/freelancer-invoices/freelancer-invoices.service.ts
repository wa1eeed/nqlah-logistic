import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { AuthUser } from '../../common/decorators/current-user.decorator';
import { CreateFreelancerInvoiceDto } from './dto/freelancer-invoice.dto';

@Injectable()
export class FreelancerInvoicesService {
  constructor(private prisma: PrismaService) {}

  private carrierId(actor: AuthUser): string {
    if (!actor.companyId) throw new BadRequestException({ code: 'NO_COMPANY', message: 'لا توجد شركة' });
    return actor.companyId;
  }

  /** All freelancer invoices for the acting carrier, newest first. */
  async list(actor: AuthUser) {
    return this.prisma.freelancerInvoice.findMany({
      where: { carrierId: this.carrierId(actor) },
      orderBy: { issuedAt: 'desc' },
    });
  }

  /** Issue a per-trip invoice. Idempotent per (carrier, order, truck): a repeat
   *  assignment refreshes the amount/revenue instead of creating a duplicate. */
  async create(dto: CreateFreelancerInvoiceDto, actor: AuthUser) {
    const carrierId = this.carrierId(actor);
    return this.prisma.freelancerInvoice.upsert({
      where: { carrierId_orderId_truckId: { carrierId, orderId: dto.orderId, truckId: dto.truckId } },
      update: { amount: dto.amount, orderRevenue: dto.orderRevenue, driverId: dto.driverId, orderNumber: dto.orderNumber },
      create: {
        carrierId,
        orderId: dto.orderId,
        orderNumber: dto.orderNumber,
        truckId: dto.truckId,
        driverId: dto.driverId,
        amount: dto.amount,
        orderRevenue: dto.orderRevenue,
      },
    });
  }

  private async owned(id: string, actor: AuthUser) {
    const inv = await this.prisma.freelancerInvoice.findUnique({ where: { id } });
    if (!inv) throw new NotFoundException({ code: 'INVOICE_NOT_FOUND', message: 'الفاتورة غير موجودة' });
    if (inv.carrierId !== this.carrierId(actor)) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'لا تملك صلاحية' });
    }
    return inv;
  }

  async markPaid(id: string, actor: AuthUser) {
    await this.owned(id, actor);
    return this.prisma.freelancerInvoice.update({
      where: { id },
      data: { status: 'PAID', paidAt: new Date() },
    });
  }

  async reopen(id: string, actor: AuthUser) {
    await this.owned(id, actor);
    return this.prisma.freelancerInvoice.update({
      where: { id },
      data: { status: 'DUE', paidAt: null },
    });
  }
}

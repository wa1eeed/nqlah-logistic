import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';
import { toNum } from '../../common/money/money';
import { SubmitKycDto, UpdateCompanyDto } from './dto/update-company.dto';
import type { KYCStatus, Prisma } from '../../generated/prisma';

@Injectable()
export class CompaniesService {
  constructor(private prisma: PrismaService) {}

  async list(query: PaginationDto, type?: 'CLIENT' | 'CARRIER', status?: string) {
    const { page = 1, limit = 20, sort = 'createdAt', order = 'desc', search } = query;
    const where: Prisma.CompanyWhereInput = {
      ...(type ? { type } : {}),
      ...(status ? { status: status as Prisma.CompanyWhereInput['status'] } : {}),
      ...(search
        ? {
            OR: [
              { nameAr: { contains: search, mode: 'insensitive' } },
              { nameEn: { contains: search, mode: 'insensitive' } },
              { crNumber: { contains: search } },
              { contactPhone: { contains: search } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sort]: order },
      }),
      this.prisma.company.count({ where }),
    ]);
    return paginate(items, total, page, limit);
  }

  async findById(id: string) {
    const company = await this.prisma.company.findUnique({
      where: { id },
      include: { kycDocuments: true, _count: { select: { users: true, trucks: true } } },
    });
    if (!company) throw new NotFoundException({ code: 'COMPANY_NOT_FOUND', message: 'الشركة غير موجودة' });
    return company;
  }

  async update(id: string, dto: UpdateCompanyDto, actor: { companyId: string | null; role: string }) {
    this.assertAccess(id, actor);
    return this.prisma.company.update({ where: { id }, data: dto });
  }

  async submitKyc(id: string, dto: SubmitKycDto, actor: { companyId: string | null; role: string }) {
    this.assertAccess(id, actor);
    const doc = await this.prisma.kYCDocument.create({
      data: { companyId: id, type: dto.type, fileUrl: dto.fileUrl, notes: dto.notes },
    });
    await this.prisma.company.update({ where: { id }, data: { kycStatus: 'PENDING' } });
    return doc;
  }

  async listKyc(id: string) {
    return this.prisma.kYCDocument.findMany({
      where: { companyId: id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async reviewKyc(docId: string, status: KYCStatus, notes: string | undefined, reviewerId: string) {
    const doc = await this.prisma.kYCDocument.update({
      where: { id: docId },
      data: { status, notes, reviewedBy: reviewerId, reviewedAt: new Date() },
    });
    // If all docs approved → company kycStatus = APPROVED
    const allDocs = await this.prisma.kYCDocument.findMany({ where: { companyId: doc.companyId } });
    const allApproved = allDocs.length > 0 && allDocs.every((d) => d.status === 'APPROVED');
    const anyRejected = allDocs.some((d) => d.status === 'REJECTED');
    await this.prisma.company.update({
      where: { id: doc.companyId },
      data: {
        kycStatus: anyRejected ? 'REJECTED' : allApproved ? 'APPROVED' : 'PENDING',
        ...(allApproved ? { status: 'ACTIVE' } : {}),
      },
    });
    return doc;
  }

  /**
   * A 360° stats payload for one company (admin provider/client view). Scoped
   * to the company's role: a CARRIER's orders are the ones it carries, a
   * CLIENT's are the ones it places. Returns a superset so either UI can read
   * what it needs. Backward-compatible keys `totalRevenue` / `activeBids` kept.
   */
  async stats(id: string) {
    const company = await this.prisma.company.findUnique({ where: { id }, select: { type: true } });
    const isCarrier = company?.type === 'CARRIER';
    const own: Prisma.OrderWhereInput = isCarrier ? { carrierId: id } : { clientId: id };

    const since = new Date();
    since.setMonth(since.getMonth() - 5);
    since.setDate(1);
    since.setHours(0, 0, 0, 0);

    const [
      totalOrders, byStatus, finishedAgg, activeBids, totalBids, wonBids,
      ratingAgg, counts, freelancerByStatus, recentOrders,
    ] = await Promise.all([
      this.prisma.order.count({ where: own }),
      this.prisma.order.groupBy({ by: ['status'], where: own, _count: true }),
      this.prisma.order.aggregate({
        where: { ...own, status: { in: ['DELIVERED', 'COMPLETED'] } },
        _sum: { agreedPrice: true, carrierAmount: true, commissionAmount: true },
      }),
      this.prisma.bid.count({ where: { carrierId: id, status: 'PENDING' } }),
      this.prisma.bid.count({ where: { carrierId: id } }),
      this.prisma.bid.count({ where: { carrierId: id, status: 'ACCEPTED' } }),
      this.prisma.review.aggregate({ where: { reviewedId: id }, _avg: { rating: true }, _count: true }),
      this.prisma.company.findUnique({
        where: { id },
        select: { _count: { select: { trucks: true, users: true, drivers: true } } },
      }),
      isCarrier
        ? this.prisma.freelancerInvoice.groupBy({ by: ['status'], where: { carrierId: id }, _sum: { amount: true }, _count: true })
        : Promise.resolve([] as { status: string; _sum: { amount: number | null }; _count: number }[]),
      this.prisma.order.findMany({
        where: { ...own, createdAt: { gte: since } },
        select: { createdAt: true, status: true, agreedPrice: true },
      }),
    ]);

    const statusBreakdown: Record<string, number> = {};
    for (const g of byStatus) statusBreakdown[g.status] = (g as { _count: number })._count;
    const countOf = (...s: string[]) => s.reduce((n, k) => n + (statusBreakdown[k] ?? 0), 0);
    const completedOrders = countOf('DELIVERED', 'COMPLETED');
    const cancelledOrders = countOf('CANCELLED');
    const disputedOrders = countOf('DISPUTED');

    const gmv = toNum(finishedAgg._sum.agreedPrice);
    const carrierRevenue = toNum(finishedAgg._sum.carrierAmount);
    const commission = toNum(finishedAgg._sum.commissionAmount);

    // 6-month trend (orders + GMV), bucketed by YYYY-MM.
    const months: { key: string; label: string; orders: number; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const dt = new Date();
      dt.setMonth(dt.getMonth() - i);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      months.push({ key, label: key, orders: 0, revenue: 0 });
    }
    const idxByKey = new Map(months.map((m, i) => [m.key, i]));
    for (const o of recentOrders) {
      const k = `${o.createdAt.getFullYear()}-${String(o.createdAt.getMonth() + 1).padStart(2, '0')}`;
      const i = idxByKey.get(k);
      if (i == null) continue;
      months[i].orders += 1;
      if (o.status === 'DELIVERED' || o.status === 'COMPLETED') months[i].revenue += toNum(o.agreedPrice);
    }

    const freelancerDue = toNum(freelancerByStatus.find((f) => f.status === 'DUE')?._sum.amount);
    const freelancerPaid = toNum(freelancerByStatus.find((f) => f.status === 'PAID')?._sum.amount);
    const freelancerCount = freelancerByStatus.reduce((n, f) => n + f._count, 0);

    return {
      type: isCarrier ? 'CARRIER' : 'CLIENT',
      totalOrders,
      statusBreakdown,
      completedOrders,
      cancelledOrders,
      disputedOrders,
      completionRate: totalOrders > 0 ? completedOrders / totalOrders : 0,
      gmv,
      revenue: isCarrier ? carrierRevenue : gmv,
      commission,
      avgOrderValue: completedOrders > 0 ? gmv / completedOrders : 0,
      activeBids,
      totalBids,
      wonBids,
      winRate: totalBids > 0 ? wonBids / totalBids : 0,
      rating: ratingAgg._avg.rating ?? null,
      reviewsCount: ratingAgg._count,
      fleetSize: counts?._count.trucks ?? 0,
      driversCount: counts?._count.drivers ?? 0,
      teamSize: counts?._count.users ?? 0,
      freelancerDue,
      freelancerPaid,
      freelancerCount,
      trend: months.map((m) => ({ month: m.label, orders: m.orders, revenue: m.revenue })),
      // Backward-compatible keys.
      totalRevenue: gmv,
    };
  }

  private assertAccess(companyId: string, actor: { companyId: string | null; role: string }) {
    if (actor.role === 'SUPER_ADMIN' || actor.role === 'ADMIN') return;
    if (actor.companyId !== companyId) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'لا تملك صلاحية على هذه الشركة' });
    }
  }
}

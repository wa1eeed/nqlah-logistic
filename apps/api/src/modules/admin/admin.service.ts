import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';
import type { CompanyStatus, DisputeStatus, Prisma } from '../../generated/prisma';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async dashboardStats() {
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(); startOfWeek.setDate(startOfWeek.getDate() - 7);
    const startOfMonth = new Date(); startOfMonth.setDate(startOfMonth.getDate() - 30);

    const [
      ordersToday, ordersWeek, ordersMonth,
      revenueAgg, activeCompanies, processingOrders, openDisputes,
      activeDrivers,
      recentOrders,
    ] = await Promise.all([
      this.prisma.order.count({ where: { createdAt: { gte: startOfDay } } }),
      this.prisma.order.count({ where: { createdAt: { gte: startOfWeek } } }),
      this.prisma.order.count({ where: { createdAt: { gte: startOfMonth } } }),
      this.prisma.order.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { agreedPrice: true, commissionAmount: true },
      }),
      this.prisma.company.count({ where: { status: 'ACTIVE' } }),
      this.prisma.order.count({ where: { status: { in: ['PUBLISHED', 'BIDDING', 'ASSIGNED', 'CONFIRMED', 'IN_TRANSIT'] } } }),
      this.prisma.dispute.count({ where: { status: { in: ['OPEN', 'UNDER_REVIEW'] } } }),
      this.prisma.driverProfile.count({ where: { status: 'ON_TRIP' } }),
      this.prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { nameAr: true } },
          carrier: { select: { nameAr: true } },
        },
      }),
    ]);

    return {
      orders: { today: ordersToday, week: ordersWeek, month: ordersMonth },
      revenue: {
        gmv: revenueAgg._sum.agreedPrice ?? 0,
        commission: revenueAgg._sum.commissionAmount ?? 0,
      },
      activeCompanies,
      processingOrders,
      openDisputes,
      activeDrivers,
      recentOrders,
    };
  }

  async listDrivers(query: PaginationDto) {
    const { page = 1, limit = 20, search } = query;
    const where = search
      ? {
          OR: [
            { user: { firstName: { contains: search, mode: 'insensitive' as const } } },
            { user: { lastName:  { contains: search, mode: 'insensitive' as const } } },
            { user: { phone:     { contains: search } } },
            { company: { nameAr: { contains: search, mode: 'insensitive' as const } } },
          ],
        }
      : {};
    const [items, total] = await Promise.all([
      this.prisma.driverProfile.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { firstName: true, lastName: true, phone: true, nationalId: true } },
          company: { select: { id: true, nameAr: true } },
          orderDrivers: {
            where: { order: { status: { in: ['ASSIGNED', 'CONFIRMED', 'IN_TRANSIT'] } } },
            orderBy: { assignedAt: 'desc' },
            take: 1,
            include: {
              order: { select: { id: true, orderNumber: true, status: true, originCity: true, destinationCity: true } },
            },
          },
        },
      }),
      this.prisma.driverProfile.count({ where }),
    ]);
    return paginate(items, total, page, limit);
  }

  async listCompanies(query: PaginationDto, type?: string, status?: string) {
    const { page = 1, limit = 20, sort = 'createdAt', order = 'desc', search } = query;
    const where: Prisma.CompanyWhereInput = {
      ...(type ? { type: type as 'CLIENT' | 'CARRIER' } : {}),
      ...(status ? { status: status as CompanyStatus } : {}),
      ...(search ? {
        OR: [
          { nameAr: { contains: search, mode: 'insensitive' as const } },
          { nameEn: { contains: search, mode: 'insensitive' as const } },
          { crNumber: { contains: search } },
        ],
      } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.company.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { [sort]: order },
      }),
      this.prisma.company.count({ where }),
    ]);
    return paginate(items, total, page, limit);
  }

  async updateCompanyStatus(id: string, status: CompanyStatus) {
    return this.prisma.company.update({ where: { id }, data: { status } });
  }

  async listOrders(query: PaginationDto, status?: string) {
    const { page = 1, limit = 20, sort = 'createdAt', order = 'desc', search } = query;
    const where: Prisma.OrderWhereInput = {
      ...(status ? { status: status as Prisma.OrderWhereInput['status'] } : {}),
      ...(search ? {
        OR: [
          { orderNumber: { contains: search } },
          { originCity: { contains: search } },
          { destinationCity: { contains: search } },
        ],
      } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { [sort]: order },
        include: {
          client: { select: { nameAr: true } },
          carrier: { select: { nameAr: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);
    return paginate(items, total, page, limit);
  }

  async listDisputes(query: PaginationDto, status?: string) {
    const { page = 1, limit = 20 } = query;
    const where: Prisma.DisputeWhereInput = status ? { status: status as DisputeStatus } : {};
    const [items, total] = await Promise.all([
      this.prisma.dispute.findMany({
        where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' },
        include: { order: { select: { orderNumber: true, clientId: true, carrierId: true } } },
      }),
      this.prisma.dispute.count({ where }),
    ]);
    return paginate(items, total, page, limit);
  }

  async updateDispute(id: string, data: { status?: DisputeStatus; resolution?: string; assignedTo?: string }) {
    const dispute = await this.prisma.dispute.findUnique({ where: { id } });
    if (!dispute) throw new NotFoundException({ code: 'DISPUTE_NOT_FOUND', message: 'النزاع غير موجود' });
    return this.prisma.dispute.update({
      where: { id },
      data: {
        ...data,
        resolvedAt: data.status === 'RESOLVED' || data.status === 'CLOSED' ? new Date() : undefined,
      },
    });
  }

  async transactions(query: PaginationDto) {
    const { page = 1, limit = 20 } = query;
    const [items, total] = await Promise.all([
      this.prisma.transaction.findMany({
        skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' },
        include: { company: { select: { nameAr: true } } },
      }),
      this.prisma.transaction.count(),
    ]);
    return paginate(items, total, page, limit);
  }

  async manualWalletTransaction(
    companyId: string,
    dto: { kind: 'CREDIT' | 'DEBIT' | 'ADJUSTMENT'; amount: number; description: string; note?: string },
  ) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!company) throw new Error('شركة غير موجودة');
    const delta = dto.kind === 'DEBIT' ? -dto.amount : dto.amount;
    const newBalance = company.walletBalance + delta;
    return this.prisma.$transaction(async (tx) => {
      await tx.company.update({ where: { id: companyId }, data: { walletBalance: newBalance } });
      return tx.transaction.create({
        data: {
          companyId,
          type: `ADMIN_${dto.kind}`,
          amount: delta,
          balance: newBalance,
          description: dto.note ? `${dto.description} — ${dto.note}` : dto.description,
        },
      });
    });
  }

  async getSettings() {
    return this.prisma.setting.findMany({ orderBy: { category: 'asc' } });
  }

  async updateSettings(updates: { key: string; value: string }[]) {
    await Promise.all(
      updates.map((u) =>
        this.prisma.setting.upsert({
          where: { key: u.key },
          create: { key: u.key, value: u.value },
          update: { value: u.value },
        }),
      ),
    );
    return this.getSettings();
  }
}

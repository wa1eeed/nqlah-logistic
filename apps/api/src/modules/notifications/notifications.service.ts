import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';
import { Prisma, type NotificationType } from '../../generated/prisma';
import {
  NOTIFICATION_CONNECTOR,
  type NotificationConnector,
} from '../../integrations/notifications/notification.connector';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    @Inject(NOTIFICATION_CONNECTOR) private push: NotificationConnector,
  ) {}

  /// Register (upsert) a device push token for the user.
  async registerDevice(userId: string, token: string, platform: string) {
    await this.prisma.pushToken.upsert({
      where: { token },
      create: { userId, token, platform },
      update: { userId, platform },
    });
    return { ok: true };
  }

  async unregisterDevice(userId: string, token: string) {
    await this.prisma.pushToken.deleteMany({ where: { userId, token } });
    return { ok: true };
  }

  /// Fan a notification out to the user's registered devices, pruning any the
  /// provider reports as invalid.
  private async pushToUser(userId: string, title: string, body: string, data?: Record<string, unknown>) {
    const tokens = await this.prisma.pushToken.findMany({ where: { userId } });
    if (tokens.length === 0) return;
    const flatData: Record<string, string> = {};
    if (data) for (const [k, v] of Object.entries(data)) flatData[k] = String(v);
    const { invalidTokens } = await this.push
      .send(tokens.map((t) => ({ token: t.token, platform: t.platform })), { title, body, data: flatData })
      .catch(() => ({ invalidTokens: [] as string[] }));
    if (invalidTokens.length) {
      await this.prisma.pushToken.deleteMany({ where: { token: { in: invalidTokens } } });
    }
  }

  async list(userId: string, query: PaginationDto) {
    const { page = 1, limit = 20 } = query;
    const where = { userId };
    const [items, total, unread] = await Promise.all([
      this.prisma.notification.findMany({
        where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { ...where, isRead: false } }),
    ]);
    // Nest `unread` inside meta so it survives the list-flattening interceptor
    // (which keeps only `data` + `meta`).
    const paged = paginate(items, total, page, limit);
    return { ...paged, meta: { ...paged.meta, unread } };
  }

  async markRead(userId: string, id: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async create(payload: {
    userId: string;
    type: NotificationType;
    titleAr: string;
    bodyAr: string;
    titleEn?: string;
    bodyEn?: string;
    data?: Record<string, unknown>;
  }) {
    const { data, ...rest } = payload;
    const notification = await this.prisma.notification.create({
      data: {
        ...rest,
        data: data ? (data as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });
    // Also deliver as a device push (best-effort; never blocks creation).
    void this.pushToUser(payload.userId, payload.titleAr, payload.bodyAr, data);
    return notification;
  }

  /// Fan a notification out to every active user of a company (in-app + push).
  /// Best-effort — failures never block the business action that triggered it.
  async notifyCompany(
    companyId: string | null | undefined,
    payload: {
      type: NotificationType;
      titleAr: string;
      bodyAr: string;
      titleEn?: string;
      bodyEn?: string;
      data?: Record<string, unknown>;
    },
  ) {
    if (!companyId) return;
    const users = await this.prisma.user.findMany({
      where: { companyId, isActive: true },
      select: { id: true },
    });
    await Promise.all(
      users.map((u) => this.create({ userId: u.id, ...payload })),
    );
  }
}

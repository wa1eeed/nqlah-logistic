import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import {
  STORAGE_CONNECTOR,
  type StorageConnector,
} from '../../integrations/storage/storage.connector';
import { SendMessageDto } from './dto/send-message.dto';
import type { AuthUser } from '../../common/decorators/current-user.decorator';

type MessageRow = {
  id: string;
  orderId: string;
  senderId: string;
  senderCompanyId: string | null;
  kind: string;
  body: string;
  mediaKey: string | null;
  mediaName: string | null;
  mediaMime: string | null;
  mediaSize: number | null;
  durationMs: number | null;
  createdAt: Date;
};

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private realtime: RealtimeGateway,
    private notifications: NotificationsService,
    @Inject(STORAGE_CONNECTOR) private storage: StorageConnector,
  ) {}

  /// Notify the counterpart company's users of a new message (in-app + push).
  private async notifyRecipient(
    order: { clientId: string; carrierId: string | null; targetCarrierId: string | null },
    actor: AuthUser,
    orderId: string,
    preview: string,
  ) {
    const recipientCompanyId =
      actor.companyId === order.clientId
        ? order.carrierId ?? order.targetCarrierId
        : order.clientId;
    if (!recipientCompanyId) return;
    const users = await this.prisma.user.findMany({
      where: { companyId: recipientCompanyId, isActive: true },
      select: { id: true },
    });
    await Promise.all(
      users.map((u) =>
        this.notifications.create({
          userId: u.id,
          type: 'SYSTEM',
          titleAr: 'رسالة جديدة',
          bodyAr: preview,
          data: { kind: 'chat', orderId },
        }),
      ),
    );
  }

  private isAdmin(a: AuthUser) {
    return a.role === 'SUPER_ADMIN' || a.role === 'ADMIN';
  }

  /// A thread is visible to the order's client, its (target) carrier, or an admin.
  private async requireAccess(orderId: string, actor: AuthUser) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, clientId: true, carrierId: true, targetCarrierId: true },
    });
    if (!order) throw new NotFoundException({ code: 'ORDER_NOT_FOUND', message: 'الطلب غير موجود' });
    const cid = actor.companyId;
    const ok =
      this.isAdmin(actor) ||
      (cid != null &&
        (order.clientId === cid || order.carrierId === cid || order.targetCarrierId === cid));
    if (!ok) throw new ForbiddenException({ code: 'FORBIDDEN', message: 'لا تملك صلاحية' });
    return order;
  }

  /// Attaches a short-lived pre-signed GET URL for any media (direct store →
  /// client; the bytes never touch our server).
  private async present(m: MessageRow) {
    const mediaUrl = m.mediaKey
      ? await this.storage.presignedGet(m.mediaKey, 60 * 60).catch(() => null)
      : null;
    return {
      id: m.id,
      orderId: m.orderId,
      senderId: m.senderId,
      senderCompanyId: m.senderCompanyId,
      kind: m.kind,
      body: m.body,
      mediaUrl,
      mediaName: m.mediaName,
      mediaMime: m.mediaMime,
      mediaSize: m.mediaSize,
      durationMs: m.durationMs,
      createdAt: m.createdAt,
    };
  }

  async list(orderId: string, actor: AuthUser) {
    await this.requireAccess(orderId, actor);
    const rows = await this.prisma.message.findMany({
      where: { orderId },
      orderBy: { createdAt: 'asc' },
    });
    return Promise.all(rows.map((r) => this.present(r as MessageRow)));
  }

  async send(orderId: string, dto: SendMessageDto, actor: AuthUser) {
    const order = await this.requireAccess(orderId, actor);
    const kind = dto.kind ?? 'TEXT';
    const msg = await this.prisma.message.create({
      data: {
        orderId,
        senderId: actor.id,
        senderCompanyId: actor.companyId ?? null,
        kind,
        body: (dto.body ?? '').trim(),
        mediaKey: kind === 'TEXT' ? null : dto.mediaKey ?? null,
        mediaName: dto.mediaName ?? null,
        mediaMime: dto.mediaMime ?? null,
        mediaSize: dto.mediaSize ?? null,
        durationMs: dto.durationMs ?? null,
      },
    });
    const presented = await this.present(msg as MessageRow);
    this.realtime.emitChatMessage(orderId, presented);
    const preview = kind === 'TEXT'
        ? (dto.body ?? '').trim().slice(0, 80)
        : (kind === 'IMAGE' ? '📷 صورة' : kind === 'VIDEO' ? '🎥 فيديو' : kind === 'AUDIO' ? '🎤 رسالة صوتية' : '📎 ملف');
    void this.notifyRecipient(order, actor, orderId, preview);
    return presented;
  }
}

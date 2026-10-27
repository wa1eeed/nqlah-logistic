import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
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
    @Inject(STORAGE_CONNECTOR) private storage: StorageConnector,
  ) {}

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
    await this.requireAccess(orderId, actor);
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
    return presented;
  }
}

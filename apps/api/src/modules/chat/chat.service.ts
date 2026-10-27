import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { SendMessageDto } from './dto/send-message.dto';
import type { AuthUser } from '../../common/decorators/current-user.decorator';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService, private realtime: RealtimeGateway) {}

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

  async list(orderId: string, actor: AuthUser) {
    await this.requireAccess(orderId, actor);
    return this.prisma.message.findMany({
      where: { orderId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async send(orderId: string, dto: SendMessageDto, actor: AuthUser) {
    await this.requireAccess(orderId, actor);
    const msg = await this.prisma.message.create({
      data: {
        orderId,
        senderId: actor.id,
        senderCompanyId: actor.companyId ?? null,
        body: dto.body.trim(),
      },
    });
    this.realtime.emitChatMessage(orderId, msg);
    return msg;
  }
}

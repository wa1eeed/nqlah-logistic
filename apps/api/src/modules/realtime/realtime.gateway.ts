import { Logger } from '@nestjs/common';
import {
  ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect,
  SubscribeMessage, WebSocketGateway, WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma/prisma.service';

/** Per-order live-tracking state for the server-side GPS ping stream. */
interface OrderTrack {
  progress: number;
  subscribers: number;
  timer?: NodeJS.Timeout;
}

const PING_MS = 4000;
const PING_STEP = 0.02;
const PING_CAP = 0.97;

const clamp = (n: number) => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0.1));

@WebSocketGateway({
  cors: {
    origin: (process.env.CORS_ORIGINS ?? '').split(',').map((o) => o.trim()).filter(Boolean),
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(RealtimeGateway.name);
  /** orderId → live tracking state (ping stream is ref-counted by subscribers). */
  private readonly tracks = new Map<string, OrderTrack>();

  constructor(private jwt: JwtService, private prisma: PrismaService) {}

  handleConnection(client: Socket) {
    const token =
      (client.handshake.auth?.['token'] as string | undefined) ??
      (client.handshake.headers.authorization?.replace(/^Bearer\s+/i, ''));
    if (!token) {
      client.disconnect();
      return;
    }
    try {
      const payload = this.jwt.verify<{ sub: string; companyId: string | null; role: string }>(
        token,
        { secret: process.env.JWT_SECRET },
      );
      client.data.userId = payload.sub;
      client.data.companyId = payload.companyId;
      client.data.role = payload.role;
      client.data.orders = new Set<string>();
      client.join(`user:${payload.sub}`);
      if (payload.companyId) client.join(`company:${payload.companyId}`);
      this.logger.log(`socket connected: ${payload.sub} (${payload.role})`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const orders = client.data?.orders as Set<string> | undefined;
    if (orders) for (const orderId of orders) this.releaseTrack(orderId);
    this.logger.log(`socket disconnected: ${client.data?.['userId'] ?? 'unknown'}`);
  }

  @SubscribeMessage('order:subscribe')
  async subscribeOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string; startProgress?: number },
  ) {
    if (!data?.orderId) return;
    const { orderId } = data;
    client.join(`order:${orderId}`);
    (client.data.orders as Set<string>)?.add(orderId);

    let track = this.tracks.get(orderId);
    if (!track) {
      track = { progress: clamp(data.startProgress ?? 0.1), subscribers: 0 };
      this.tracks.set(orderId, track);
    }
    track.subscribers += 1;

    // Start the GPS ping stream once per order, only while it is IN_TRANSIT.
    if (!track.timer) {
      const order = await this.prisma.order.findUnique({ where: { id: orderId }, select: { status: true } });
      if (order?.status === 'IN_TRANSIT') this.startPingStream(orderId);
    }
  }

  @SubscribeMessage('order:unsubscribe')
  unsubscribeOrder(@ConnectedSocket() client: Socket, @MessageBody() data: { orderId: string }) {
    if (!data?.orderId) return;
    client.leave(`order:${data.orderId}`);
    (client.data.orders as Set<string>)?.delete(data.orderId);
    this.releaseTrack(data.orderId);
  }

  /** Emit discrete GPS fixes to an order's room, advancing progress each tick. */
  private startPingStream(orderId: string) {
    const track = this.tracks.get(orderId);
    if (!track || track.timer) return;
    const emit = () => {
      const t = this.tracks.get(orderId);
      if (!t) return;
      this.server.to(`order:${orderId}`).emit('tracking:location_update', {
        progress: t.progress,
        speedKmh: Math.max(0, Math.round(80 + (Math.random() - 0.5) * 16)),
        at: Date.now(),
      });
    };
    emit(); // immediate first fix on subscribe
    track.timer = setInterval(() => {
      const t = this.tracks.get(orderId);
      if (!t) return;
      t.progress = Math.min(PING_CAP, t.progress + PING_STEP);
      emit();
      if (t.progress >= PING_CAP && t.timer) { clearInterval(t.timer); t.timer = undefined; }
    }, PING_MS);
  }

  private releaseTrack(orderId: string) {
    const track = this.tracks.get(orderId);
    if (!track) return;
    track.subscribers = Math.max(0, track.subscribers - 1);
    if (track.subscribers === 0) {
      if (track.timer) clearInterval(track.timer);
      this.tracks.delete(orderId);
    }
  }

  emitOrderStatus(orderId: string, payload: unknown) {
    this.server.to(`order:${orderId}`).emit('order:status_changed', payload);
  }
  emitNewBid(orderId: string, payload: unknown) {
    this.server.to(`order:${orderId}`).emit('order:new_bid', payload);
  }
  emitLocationUpdate(orderId: string, payload: unknown) {
    this.server.to(`order:${orderId}`).emit('tracking:location_update', payload);
  }
  emitNotification(userId: string, payload: unknown) {
    this.server.to(`user:${userId}`).emit('notification:new', payload);
  }
}

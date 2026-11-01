import { Logger } from '@nestjs/common';
import {
  ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect,
  SubscribeMessage, WebSocketGateway, WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * A driver GPS fix is considered "live" (actively tracking) only if it arrived
 * within this window. Older than this, the truck's last-known position is shown
 * as stale. Matches the driver app's beacon cadence (≈30s + 50m) with headroom.
 */
export const LOCATION_FRESH_MS = 90_000;

@WebSocketGateway({
  cors: {
    origin: (process.env.CORS_ORIGINS ?? '').split(',').map((o) => o.trim()).filter(Boolean),
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(RealtimeGateway.name);

  /**
   * Driver presence: driverId → set of connected socket ids. A driver is
   * "online" while they hold at least one live socket connection. This is the
   * source of truth for online/offline — real connection state, not a guess.
   */
  private readonly presence = new Map<string, Set<string>>();

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
      // Platform admins join a global room: every tenant's `data:changed`
      // invalidation, driver-location fixes and presence changes (admin map).
      if (payload.role === 'ADMIN' || payload.role === 'SUPER_ADMIN') client.join('admin');
      // Register driver presence (online) — resolves the driver profile async.
      void this.registerPresence(client);
      this.logger.log(`socket connected: ${payload.sub} (${payload.role})`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const driverId = client.data?.driverId as string | undefined;
    if (driverId) {
      const set = this.presence.get(driverId);
      if (set) {
        set.delete(client.id);
        if (set.size === 0) {
          this.presence.delete(driverId);
          this.emitPresence(driverId, client.data?.driverCompanyId as string | null, false);
        }
      }
    }
    this.logger.log(`socket disconnected: ${client.data?.['userId'] ?? 'unknown'}`);
  }

  /** Mark the connecting user online if they are a driver, and broadcast it. */
  private async registerPresence(client: Socket) {
    const userId = client.data?.userId as string | undefined;
    if (!userId) return;
    const profile = await this.prisma.driverProfile
      .findUnique({ where: { userId }, select: { id: true, companyId: true } })
      .catch(() => null);
    if (!profile) return; // not a driver — no tracking presence
    client.data.driverId = profile.id;
    client.data.driverCompanyId = profile.companyId;
    let set = this.presence.get(profile.id);
    const wasOffline = !set || set.size === 0;
    if (!set) {
      set = new Set<string>();
      this.presence.set(profile.id, set);
    }
    set.add(client.id);
    if (wasOffline) this.emitPresence(profile.id, profile.companyId, true);
  }

  /** True while the driver holds at least one live socket connection. */
  isDriverOnline(driverId: string): boolean {
    const set = this.presence.get(driverId);
    return !!set && set.size > 0;
  }

  /** The set of driver ids currently online (for REST snapshots). */
  onlineDriverIds(): string[] {
    return [...this.presence.keys()];
  }

  private emitPresence(driverId: string, companyId: string | null | undefined, online: boolean) {
    const payload = { driverId, online, at: Date.now() };
    this.server.to('admin').emit('driver:presence', payload);
    if (companyId) this.server.to(`company:${companyId}`).emit('driver:presence', payload);
  }

  @SubscribeMessage('order:subscribe')
  subscribeOrder(@ConnectedSocket() client: Socket, @MessageBody() data: { orderId: string }) {
    if (!data?.orderId) return;
    client.join(`order:${data.orderId}`);
    (client.data.orders as Set<string>)?.add(data.orderId);
  }

  @SubscribeMessage('order:unsubscribe')
  unsubscribeOrder(@ConnectedSocket() client: Socket, @MessageBody() data: { orderId: string }) {
    if (!data?.orderId) return;
    client.leave(`order:${data.orderId}`);
    (client.data.orders as Set<string>)?.delete(data.orderId);
  }

  /**
   * Real driver GPS fix from the phone. Authorizes the sender against the
   * order's assigned drivers, persists it (LocationHistory + the driver's
   * current location), and broadcasts the REAL coordinates to the order room
   * and the admin map. There is no simulation: the truck only ever moves to a
   * position the driver's device actually reported. The driver app throttles
   * these (≈30s / ≥50m) to conserve map/API cost.
   */
  @SubscribeMessage('driver:location')
  async driverLocation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string; lat: number; lng: number; speedKmh?: number },
  ) {
    const userId = client.data?.userId as string | undefined;
    if (!userId || !data?.orderId) return;
    if (typeof data.lat !== 'number' || typeof data.lng !== 'number') return;
    if (Math.abs(data.lat) > 90 || Math.abs(data.lng) > 180) return;

    const profile = await this.prisma.driverProfile
      .findUnique({ where: { userId }, select: { id: true, companyId: true } })
      .catch(() => null);
    if (!profile) return;

    // Authorization: the sender must be a driver assigned to this order.
    const assigned = await this.prisma.orderDriver
      .findFirst({ where: { orderId: data.orderId, driverId: profile.id }, select: { id: true } })
      .catch(() => null);
    if (!assigned) return;

    const at = new Date();
    await Promise.all([
      this.prisma.locationHistory
        .create({ data: { driverId: profile.id, lat: data.lat, lng: data.lng, speed: data.speedKmh ?? null } })
        .catch(() => undefined),
      this.prisma.driverProfile
        .update({ where: { id: profile.id }, data: { currentLat: data.lat, currentLng: data.lng, lastLocationAt: at } })
        .catch(() => undefined),
    ]);

    const fix = {
      orderId: data.orderId,
      driverId: profile.id,
      lat: data.lat,
      lng: data.lng,
      speedKmh: data.speedKmh ?? null,
      at: at.getTime(),
      live: true,
    };
    // Everyone watching this order (customer + carrier) gets the real fix…
    this.server.to(`order:${data.orderId}`).emit('tracking:location_update', fix);
    // …and the admin live map, keyed by driver (+ provider).
    this.server.to('admin').emit('tracking:driver_location', { ...fix, companyId: profile.companyId });
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
  emitChatMessage(orderId: string, payload: unknown) {
    this.server.to(`order:${orderId}`).emit('chat:message', payload);
  }

  /**
   * Coarse "something changed" signal that tells dashboards to revalidate their
   * data, so every portal updates live without a page refresh. Fired after each
   * successful mutating request by [RealtimeInvalidateInterceptor]. Scoped to the
   * actor's company + user rooms; platform admins get every tenant's signal.
   */
  emitDataChanged(opts: { companyId?: string | null; userId?: string | null; entity?: string | null }) {
    const payload = { entity: opts.entity ?? null, at: Date.now() };
    if (opts.companyId) this.server.to(`company:${opts.companyId}`).emit('data:changed', payload);
    if (opts.userId) this.server.to(`user:${opts.userId}`).emit('data:changed', payload);
    this.server.to('admin').emit('data:changed', payload);
  }
}

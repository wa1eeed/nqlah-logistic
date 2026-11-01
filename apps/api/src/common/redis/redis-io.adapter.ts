import { INestApplicationContext, Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import type { Server, ServerOptions } from 'socket.io';
import { RedisService } from './redis.service';

/**
 * Socket.IO adapter backed by Redis pub/sub. Without it, a room broadcast only
 * reaches clients connected to the SAME API process — so with more than one
 * instance behind a load balancer, dashboards would miss events from drivers
 * (and vice-versa). With it, rooms, broadcasts and `fetchSockets()` span every
 * instance, so the realtime layer (live updates, driver presence, tracking)
 * scales horizontally.
 *
 * If Redis is unreachable the server still starts, falling back to the default
 * in-memory adapter (correct for a single instance).
 */
export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor?: ReturnType<typeof createAdapter>;

  constructor(private readonly appContext: INestApplicationContext) {
    super(appContext);
  }

  async connectToRedis(): Promise<void> {
    try {
      const redis = this.appContext.get(RedisService);
      const pubClient = redis.client.duplicate();
      const subClient = redis.client.duplicate();
      // ioredis clients are created lazily (lazyConnect) — open them now.
      await Promise.all([
        pubClient.status === 'ready' ? Promise.resolve() : pubClient.connect().catch(() => undefined),
        subClient.status === 'ready' ? Promise.resolve() : subClient.connect().catch(() => undefined),
      ]);
      this.adapterConstructor = createAdapter(pubClient, subClient);
      this.logger.log('✅ Socket.IO Redis adapter ready (horizontally scalable)');
    } catch {
      this.logger.warn('Socket.IO Redis adapter unavailable — single-instance in-memory fallback');
    }
  }

  override createIOServer(port: number, options?: ServerOptions): Server {
    const server = super.createIOServer(port, options) as Server;
    if (this.adapterConstructor) server.adapter(this.adapterConstructor);
    return server;
  }
}

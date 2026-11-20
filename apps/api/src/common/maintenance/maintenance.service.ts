import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Reads the platform maintenance flag (the `app.maintenance` setting) with a
 * short in-memory cache, so the per-request guard never hits the DB on every
 * call. Fails **open** (treats maintenance as off) on a read error, so a DB
 * blip can never lock everyone out.
 */
@Injectable()
export class MaintenanceService {
  constructor(private readonly prisma: PrismaService) {}

  private static readonly KEY = 'app.maintenance';
  private static readonly TTL_MS = 10_000;

  private cached = false;
  private readAt = 0;

  async isEnabled(): Promise<boolean> {
    const now = Date.now();
    if (now - this.readAt < MaintenanceService.TTL_MS) return this.cached;
    let enabled = false;
    try {
      const row = await this.prisma.setting.findUnique({
        where: { key: MaintenanceService.KEY },
      });
      if (row?.value) {
        const v = JSON.parse(row.value) as { enabled?: boolean };
        enabled = v?.enabled === true;
      }
    } catch {
      enabled = false; // fail open
    }
    this.cached = enabled;
    this.readAt = now;
    return enabled;
  }

  /** Force the next read to hit the DB (call after an admin toggles the flag). */
  invalidate(): void {
    this.readAt = 0;
  }
}

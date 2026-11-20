import {
  CanActivate, ExecutionContext, Injectable, ServiceUnavailableException,
} from '@nestjs/common';
import { MaintenanceService } from '../maintenance/maintenance.service';

/**
 * Platform maintenance gate. When maintenance is on, every request is answered
 * with 503 `MAINTENANCE` **except**:
 *
 * - admins (`ADMIN` / `SUPER_ADMIN`) — so they can manage the platform and turn
 *   maintenance back off;
 * - a small allow-list of public reads + admin sign-in, so clients can detect
 *   maintenance (and render the screen with the right branding) and an admin can
 *   get in.
 *
 * Runs after `JwtAuthGuard`, so `req.user.role` is populated for authed routes.
 */
@Injectable()
export class MaintenanceGuard implements CanActivate {
  constructor(private readonly maintenance: MaintenanceService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (!(await this.maintenance.isEnabled())) return true;

    const req = ctx.switchToHttp().getRequest();
    const role = req.user?.role as string | undefined;
    if (role === 'ADMIN' || role === 'SUPER_ADMIN') return true;

    if (MaintenanceGuard.isAllowed(req.method as string, (req.path ?? req.url ?? '') as string)) {
      return true;
    }

    throw new ServiceUnavailableException({
      code: 'MAINTENANCE',
      message: 'المنصة تحت الصيانة حاليًا. نعود قريبًا.',
      messageEn: 'The platform is under maintenance. We will be back shortly.',
      maintenance: true,
    });
  }

  /** Reachable even during maintenance. */
  private static isAllowed(method: string, path: string): boolean {
    if (path.includes('/admin/auth/')) return true; // admin sign-in / refresh / logout
    if (method !== 'GET') return false;
    return (
      path.endsWith('/settings/app') ||      // clients detect maintenance + message
      path.endsWith('/settings/platform') || // branding for the maintenance screen
      path.endsWith('/settings/currencies') ||
      path.endsWith('/health') ||
      path === '/' || path === ''
    );
  }
}

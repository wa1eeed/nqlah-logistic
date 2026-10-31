import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RealtimeGateway } from './realtime.gateway';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * After every successful mutating HTTP request, broadcast a `data:changed`
 * signal (via [RealtimeGateway]) to the acting user's company + user rooms and
 * the admin room. Dashboards listen and revalidate, so any action — a plan
 * change, a status update, a new order, an edit — appears on every relevant
 * portal instantly, with no page refresh and no per-endpoint wiring.
 */
@Injectable()
export class RealtimeInvalidateInterceptor implements NestInterceptor {
  constructor(private readonly realtime: RealtimeGateway) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const req = context.switchToHttp().getRequest();
    const method = (req?.method ?? '').toUpperCase();
    if (!MUTATING.has(method)) return next.handle();

    return next.handle().pipe(
      tap(() => {
        const user = req.user as
          | { id?: string; sub?: string; companyId?: string | null }
          | undefined;
        if (!user) return; // unauthenticated (e.g. login) — nothing to scope
        const entity = String(req.route?.path ?? req.url ?? '').split('?')[0];
        try {
          this.realtime.emitDataChanged({
            companyId: user.companyId ?? null,
            userId: user.id ?? user.sub ?? null,
            entity,
          });
        } catch {
          // best-effort: a realtime hiccup must never fail the request
        }
      }),
    );
  }
}

import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { normalizeDecimals } from '../money/money';

interface PaginatedShape<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, unknown> {
  intercept(_ctx: ExecutionContext, next: CallHandler<T>): Observable<unknown> {
    return next.handle().pipe(
      // Serialize exact-Decimal money as plain numbers so response shapes are
      // unchanged for the frontend (see common/money/money.ts).
      map((raw) => normalizeDecimals(raw)),
      map((value) => {
        if (value && typeof value === 'object' && 'data' in value && 'meta' in value) {
          const v = value as unknown as PaginatedShape<unknown>;
          return { success: true, data: v.data, meta: v.meta };
        }
        return { success: true, data: value };
      }),
    );
  }
}

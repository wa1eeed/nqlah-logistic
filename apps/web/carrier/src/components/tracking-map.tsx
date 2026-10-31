'use client';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';
import type { TrackingMapImplProps } from './tracking-map-impl';

export type { TrackingDriver, TrackingOrderRoute, TrackingRoutePoint } from './tracking-map-impl';

// Leaflet touches `window`, so the renderer is client-only (no SSR).
const TrackingMapImpl = dynamic(() => import('./tracking-map-impl').then((m) => m.TrackingMapImpl), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
      <span className="w-2 h-2 rounded-full bg-primary animate-pulse me-2" />
      جار تحميل الخريطة...
    </div>
  ),
});

export function TrackingMap({ className, ...props }: TrackingMapImplProps & { className?: string }) {
  return (
    <div className={cn('relative h-full w-full overflow-hidden rounded-xl border bg-card', className)}>
      <TrackingMapImpl {...props} />
    </div>
  );
}

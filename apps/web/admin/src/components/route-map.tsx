'use client';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';

const RouteMapImpl = dynamic(() => import('./route-map-impl').then((m) => m.RouteMapImpl), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center text-muted-foreground text-sm" style={{ height: 300 }}>
      <span className="w-2 h-2 rounded-full bg-primary animate-pulse me-2" />
      جار تحميل الخريطة...
    </div>
  ),
});

export interface RoutePoint {
  lat: number;
  lng: number;
  label: string;
}

/** One tracked truck for a consolidated order. */
export interface MapTruck {
  index: number;
  progress: number;
  reference?: string;
}

export interface RouteMapProps {
  origin: RoutePoint;
  destination: RoutePoint;
  progress?: number;
  /** Multiple trucks (consolidated orders) — takes precedence over `progress`. */
  trucks?: MapTruck[];
  /** When true, the truck keeps crawling toward the destination (live tracking). */
  live?: boolean;
  height?: number;
  className?: string;
}

export function RouteMap({ origin, destination, progress, trucks, live, height = 300, className }: RouteMapProps) {
  return (
    <div className={cn('overflow-hidden rounded-xl border bg-card', className)}>
      <RouteMapImpl origin={origin} destination={destination} progress={progress} trucks={trucks} live={live} height={height} />
    </div>
  );
}

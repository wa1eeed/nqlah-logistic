'use client';
import * as React from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import L, { type LatLngTuple } from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface TrackingDriver {
  id: string;
  name: string;
  status: 'AVAILABLE' | 'ON_TRIP' | 'OFF_DUTY' | string;
  lat: number;
  lng: number;
  code?: string;
}

export interface TrackingRoutePoint {
  lat: number;
  lng: number;
  label: string;
}

export interface TrackingOrderRoute {
  id: string;
  origin: TrackingRoutePoint;
  destination: TrackingRoutePoint;
  /** Live truck position from a real driver GPS fix (preferred). */
  truck?: { lat: number; lng: number } | null;
  /** Fallback position: 0..1 along the drawn route (simulated stream). */
  progress?: number;
  driverName?: string;
}

export interface TrackingMapImplProps {
  tileUrl: string;
  attribution: string;
  maxZoom?: number;
  drivers: TrackingDriver[];
  selectedDriverId?: string | null;
  order?: TrackingOrderRoute | null;
  /** The pin "B" label on the destination. */
  height?: number | string;
}

const STATUS_COLOR: Record<string, string> = {
  ON_TRIP: '#00C9A7',   // mint — busy / on the road
  AVAILABLE: '#2563EB', // blue — free
  OFF_DUTY: '#9CA3AF',  // gray — offline
};

const SAUDI_CENTER: LatLngTuple = [23.8859, 45.0792];

// ── Geometry helpers (operate on [lat,lng] tuples) ───────────────────
function haversine(a: LatLngTuple, b: LatLngTuple): number {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const la1 = (a[0] * Math.PI) / 180;
  const la2 = (b[0] * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function pathLength(pts: LatLngTuple[]): number {
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += haversine(pts[i - 1], pts[i]);
  return total;
}
/** The sub-path from start up to `fraction`, plus the point at that fraction. */
function sliceAlong(pts: LatLngTuple[], fraction: number): { traveled: LatLngTuple[]; at: LatLngTuple } {
  if (pts.length < 2) return { traveled: pts, at: pts[0] ?? SAUDI_CENTER };
  const f = Math.max(0, Math.min(1, fraction));
  const target = pathLength(pts) * f;
  const out: LatLngTuple[] = [pts[0]];
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const seg = haversine(pts[i - 1], pts[i]);
    if (acc + seg >= target) {
      const t = seg === 0 ? 0 : (target - acc) / seg;
      const at: LatLngTuple = [
        pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t,
        pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t,
      ];
      out.push(at);
      return { traveled: out, at };
    }
    acc += seg;
    out.push(pts[i]);
  }
  return { traveled: out, at: pts[pts.length - 1] };
}

const pinSvg = (color: string, letter: string) => `
<svg xmlns="http://www.w3.org/2000/svg" width="34" height="46" viewBox="0 0 34 46">
  <defs><filter id="s" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="0" dy="2" stdDeviation="1.5" flood-opacity="0.25"/>
  </filter></defs>
  <path d="M17 0 C7.5 0 0 7.5 0 17 c0 12 17 29 17 29 s17-17 17-29 C34 7.5 26.5 0 17 0z"
        fill="${color}" stroke="white" stroke-width="2" filter="url(#s)"/>
  <circle cx="17" cy="16" r="6" fill="white"/>
  <text x="17" y="19.5" text-anchor="middle" font-family="Inter,Arial,sans-serif" font-size="8" font-weight="700" fill="${color}">${letter}</text>
</svg>`;

const ORIGIN_ICON = L.divIcon({
  html: pinSvg('#0A3D3A', 'A'), className: 'naqla-pin', iconSize: [34, 46], iconAnchor: [17, 46], popupAnchor: [0, -40],
});
const DEST_ICON = L.divIcon({
  html: pinSvg('#00C9A7', 'B'), className: 'naqla-pin', iconSize: [34, 46], iconAnchor: [17, 46], popupAnchor: [0, -40],
});

/** A driver dot marker colored by status, enlarged + ringed when selected. */
function makeDriverIcon(color: string, selected: boolean) {
  const size = selected ? 30 : 22;
  return L.divIcon({
    html: `
    <div class="naqla-drv-wrap" style="width:${size}px;height:${size}px">
      ${selected ? `<span class="naqla-drv-ring" style="background:${color}33"></span>` : ''}
      <span class="naqla-drv-dot" style="background:${color};${selected ? 'border-width:3px' : ''}">
        <svg width="${selected ? 15 : 11}" height="${selected ? 15 : 11}" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/>
          <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
          <circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>
        </svg>
      </span>
    </div>`,
    className: 'naqla-drv',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

const TRUCK_ICON = L.divIcon({
  html: `
  <div class="naqla-truck-wrap">
    <span class="naqla-truck-ring"></span>
    <div class="naqla-truck-dot">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0A3D3A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/>
        <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
        <circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>
      </svg>
    </div>
  </div>`,
  className: 'naqla-truck', iconSize: [34, 34], iconAnchor: [17, 17], popupAnchor: [0, -20],
});

/** Keep the view framed on whatever is relevant: the selected order route,
 *  the selected driver, or the full fleet. */
function ViewController({
  routeLine, selectedDriver, driverPoints,
}: {
  routeLine: LatLngTuple[] | null;
  selectedDriver: LatLngTuple | null;
  driverPoints: LatLngTuple[];
}) {
  const map = useMap();
  React.useEffect(() => {
    if (routeLine && routeLine.length >= 2) {
      map.fitBounds(routeLine as unknown as L.LatLngBoundsExpression, { padding: [50, 50], maxZoom: 13 });
      return;
    }
    if (selectedDriver) {
      map.setView(selectedDriver, Math.max(map.getZoom(), 11), { animate: true });
      return;
    }
    if (driverPoints.length >= 2) {
      map.fitBounds(driverPoints as unknown as L.LatLngBoundsExpression, { padding: [60, 60], maxZoom: 11 });
    } else if (driverPoints.length === 1) {
      map.setView(driverPoints[0], 9, { animate: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    routeLine ? routeLine.length : 0,
    routeLine ? `${routeLine[0]?.[0]},${routeLine[0]?.[1]}` : '',
    selectedDriver ? `${selectedDriver[0]},${selectedDriver[1]}` : '',
    driverPoints.length,
  ]);
  return null;
}

/** The live truck marker — tweens smoothly from its last position to the new
 *  one (whether reported as coordinates or as a progress fraction). */
function LiveTruck({ line, order }: { line: LatLngTuple[]; order: TrackingOrderRoute }) {
  // Resolve the target position: a real GPS coordinate wins, else interpolate
  // the progress fraction along the drawn route.
  const target: LatLngTuple = order.truck
    ? [order.truck.lat, order.truck.lng]
    : sliceAlong(line, order.progress ?? 0).at;

  const [pos, setPos] = React.useState<LatLngTuple>(target);
  const fromRef = React.useRef<LatLngTuple>(target);
  React.useEffect(() => {
    const from = fromRef.current;
    const to = target;
    if (Math.abs(to[0] - from[0]) < 1e-7 && Math.abs(to[1] - from[1]) < 1e-7) {
      fromRef.current = to; setPos(to); return;
    }
    let raf = 0;
    const start = performance.now();
    const dur = 1000;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      const v: LatLngTuple = [from[0] + (to[0] - from[0]) * eased, from[1] + (to[1] - from[1]) * eased];
      fromRef.current = v; setPos(v);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target[0], target[1]]);

  return (
    <Marker position={pos} icon={TRUCK_ICON} zIndexOffset={1000}>
      <Popup>
        <strong>{order.driverName || 'الشاحنة في الطريق'}</strong>
      </Popup>
    </Marker>
  );
}

export function TrackingMapImpl({
  tileUrl, attribution, maxZoom = 19, drivers, selectedDriverId, order, height = '100%',
}: TrackingMapImplProps) {
  const [route, setRoute] = React.useState<LatLngTuple[] | null>(null);

  // Fetch a real road route from OSRM for the selected order (free, OSM-based,
  // no API key). Falls back to the straight line if the request fails.
  const oLat = order?.origin.lat, oLng = order?.origin.lng;
  const dLat = order?.destination.lat, dLng = order?.destination.lng;
  React.useEffect(() => {
    setRoute(null);
    if (oLat == null || oLng == null || dLat == null || dLng == null) return;
    let cancelled = false;
    const url = `https://router.project-osrm.org/route/v1/driving/${oLng},${oLat};${dLng},${dLat}?overview=full&geometries=geojson`;
    fetch(url)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        const coords = json?.routes?.[0]?.geometry?.coordinates as [number, number][] | undefined;
        if (!coords || coords.length < 2) return;
        setRoute(coords.map(([lng, lat]) => [lat, lng] as LatLngTuple));
      })
      .catch(() => { /* keep straight-line fallback */ });
    return () => { cancelled = true; };
  }, [oLat, oLng, dLat, dLng]);

  const routeLine: LatLngTuple[] | null = order
    ? route ?? [[order.origin.lat, order.origin.lng], [order.destination.lat, order.destination.lng]]
    : null;

  const { traveled } = routeLine && (order?.progress != null || order?.truck)
    ? (order?.truck
        // Real coordinate: approximate traveled overlay by nearest fraction.
        ? sliceAlong(routeLine, 0)
        : sliceAlong(routeLine, order.progress ?? 0))
    : { traveled: [] as LatLngTuple[] };

  const driverPoints: LatLngTuple[] = drivers.map((d) => [d.lat, d.lng]);
  const selectedDriver = drivers.find((d) => d.id === selectedDriverId) ?? null;
  const selectedDriverPoint: LatLngTuple | null = selectedDriver ? [selectedDriver.lat, selectedDriver.lng] : null;

  return (
    <div style={{ height, position: 'relative', zIndex: 0 }}>
      <style>{`
        .naqla-drv-wrap{position:relative;display:grid;place-items:center}
        .naqla-drv-ring{position:absolute;inset:-6px;border-radius:9999px;animation:naqla-ping 1.8s cubic-bezier(0,0,.2,1) infinite}
        .naqla-drv-dot{position:relative;display:grid;place-items:center;width:100%;height:100%;border-radius:9999px;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35)}
        .naqla-truck-wrap{position:relative;width:34px;height:34px}
        .naqla-truck-ring{position:absolute;inset:0;border-radius:9999px;background:rgba(0,201,167,.45);animation:naqla-ping 1.6s cubic-bezier(0,0,.2,1) infinite}
        .naqla-truck-dot{position:absolute;inset:4px;background:#fff;border:2px solid #0A3D3A;border-radius:9999px;display:grid;place-items:center;box-shadow:0 2px 6px rgba(0,0,0,.2)}
        @keyframes naqla-ping{0%{transform:scale(.7);opacity:.8}80%,100%{transform:scale(2);opacity:0}}
      `}</style>
      <MapContainer center={SAUDI_CENTER} zoom={6} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
        <TileLayer attribution={attribution} url={tileUrl} maxZoom={maxZoom} />
        <ViewController routeLine={routeLine} selectedDriver={selectedDriverPoint} driverPoints={driverPoints} />

        {/* Selected order route — casing + main, then the traveled overlay. */}
        {routeLine && (
          <>
            <Polyline positions={routeLine} pathOptions={{ color: '#ffffff', weight: 8, opacity: 0.9 }} />
            <Polyline positions={routeLine} pathOptions={{ color: '#9CA3AF', weight: 4, opacity: 0.9 }} />
            {traveled.length > 1 && (
              <Polyline positions={traveled} pathOptions={{ color: '#0A3D3A', weight: 5, opacity: 0.95 }} />
            )}
          </>
        )}

        {order && (
          <>
            <Marker position={[order.origin.lat, order.origin.lng]} icon={ORIGIN_ICON}>
              <Popup><strong>{order.origin.label}</strong><br /><span style={{ color: '#6B7280' }}>نقطة الانطلاق</span></Popup>
            </Marker>
            <Marker position={[order.destination.lat, order.destination.lng]} icon={DEST_ICON}>
              <Popup><strong>{order.destination.label}</strong><br /><span style={{ color: '#6B7280' }}>نقطة الوصول</span></Popup>
            </Marker>
            {(order.truck || order.progress != null) && <LiveTruck line={routeLine ?? []} order={order} />}
          </>
        )}

        {/* Fleet driver markers, colored by status. */}
        {drivers.map((d) => (
          <Marker
            key={d.id}
            position={[d.lat, d.lng]}
            icon={makeDriverIcon(STATUS_COLOR[d.status] ?? '#9CA3AF', d.id === selectedDriverId)}
            zIndexOffset={d.id === selectedDriverId ? 900 : 0}
          >
            <Popup>
              <strong>{d.name}</strong>
              {d.code ? <><br /><span className="num" style={{ color: '#6B7280', direction: 'ltr', unicodeBidi: 'plaintext' }}>{d.code}</span></> : null}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

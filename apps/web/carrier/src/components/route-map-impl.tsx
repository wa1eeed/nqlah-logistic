'use client';
import * as React from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import L, { type LatLngTuple } from 'leaflet';
import 'leaflet/dist/leaflet.css';

export interface RoutePoint {
  lat: number;
  lng: number;
  label: string;
}

/** One tracked truck on the route (used for consolidated multi-truck orders). */
export interface MapTruck {
  /** Leg index (1-based) — shown on the marker. */
  index: number;
  /** 0..1 — where this truck is along the route. */
  progress: number;
  /** Per-leg shipment reference, shown in the marker popup. */
  reference?: string;
}

export interface RouteMapImplProps {
  origin: RoutePoint;
  destination: RoutePoint;
  /** 0..1 — single-shipment position (SINGLE orders). */
  progress?: number;
  /** Multiple trucks (CONSOLIDATED orders). Takes precedence over `progress`. */
  trucks?: MapTruck[];
  /** When true, the truck keeps crawling toward the destination (live feel). */
  live?: boolean;
  height?: number;
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
  html: pinSvg('#0A3D3A', 'A'),
  className: 'naqla-pin',
  iconSize: [34, 46],
  iconAnchor: [17, 46],
  popupAnchor: [0, -40],
});
const DEST_ICON = L.divIcon({
  html: pinSvg('#00C9A7', 'B'),
  className: 'naqla-pin',
  iconSize: [34, 46],
  iconAnchor: [17, 46],
  popupAnchor: [0, -40],
});
/** Truck marker, optionally stamped with a leg number (for consolidated orders). */
function makeTruckIcon(label?: string) {
  const badge = label
    ? `<span class="naqla-truck-badge num">${label}</span>`
    : '';
  return L.divIcon({
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
      ${badge}
    </div>`,
    className: 'naqla-truck',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

// ── Geometry helpers (work on [lat,lng] tuples) ──────────────────────
function haversine(a: LatLngTuple, b: LatLngTuple): number {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const la1 = (a[0] * Math.PI) / 180;
  const la2 = (b[0] * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Cumulative length of a polyline (km). */
function pathLength(pts: LatLngTuple[]): number {
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += haversine(pts[i - 1], pts[i]);
  return total;
}

/** The sub-path from the start up to `fraction` of the total length. */
function sliceAlong(pts: LatLngTuple[], fraction: number): { traveled: LatLngTuple[]; at: LatLngTuple } {
  if (pts.length < 2) return { traveled: pts, at: pts[0] ?? [0, 0] };
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

function FitBounds({ bounds }: { bounds: LatLngTuple[] }) {
  const map = useMap();
  React.useEffect(() => {
    if (bounds.length < 2) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    map.fitBounds(bounds as any, { padding: [40, 40] });
  }, [map, bounds]);
  return null;
}

function fmtDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  if (h > 0) return `${h} س${m ? ` ${m} د` : ''}`;
  return `${m} د`;
}

/**
 * A single truck marker that smoothly tweens from its last position to the
 * newly reported `progress` (like a ride-hailing app between GPS fixes). Each
 * instance owns its own animation, so a consolidated order renders several
 * trucks moving independently.
 */
function TruckMarker({ line, progress, label, reference }: {
  line: LatLngTuple[];
  progress: number;
  label?: string;
  reference?: string;
}) {
  const target = Math.max(0, Math.min(1, progress));
  const animRef = React.useRef(target);
  const [anim, setAnim] = React.useState(target);
  React.useEffect(() => {
    const from = animRef.current;
    const to = target;
    if (Math.abs(to - from) < 1e-6) { animRef.current = to; setAnim(to); return; }
    let raf = 0;
    const start = performance.now();
    const dur = 1200;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = from + (to - from) * eased;
      animRef.current = v;
      setAnim(v);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  const { at } = sliceAlong(line, anim);
  const icon = React.useMemo(() => makeTruckIcon(label), [label]);
  return (
    <Marker position={at} icon={icon} zIndexOffset={1000}>
      <Popup>
        {label ? <strong>شحنة {label}</strong> : <strong>الشاحنة في الطريق</strong>}
        {reference ? <><br /><span className="num" style={{ color: '#6B7280', direction: 'ltr', unicodeBidi: 'plaintext' }}>{reference}</span></> : null}
      </Popup>
    </Marker>
  );
}

export function RouteMapImpl({ origin, destination, progress, trucks, height = 300 }: RouteMapImplProps) {
  const o: LatLngTuple = [origin.lat, origin.lng];
  const d: LatLngTuple = [destination.lat, destination.lng];

  const [route, setRoute] = React.useState<LatLngTuple[] | null>(null);
  const [info, setInfo] = React.useState<{ km: number; sec: number } | null>(null);

  // Fetch a real road route from OSRM (free, OSM-based, no API key). Falls back
  // to the straight line if the request fails.
  React.useEffect(() => {
    let cancelled = false;
    const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;
    fetch(url)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        const r0 = json?.routes?.[0];
        const coords = r0?.geometry?.coordinates as [number, number][] | undefined;
        if (!coords || coords.length < 2) return;
        setRoute(coords.map(([lng, lat]) => [lat, lng] as LatLngTuple));
        setInfo({ km: r0.distance / 1000, sec: r0.duration });
      })
      .catch(() => { /* keep straight-line fallback */ });
    return () => { cancelled = true; };
  }, [origin.lat, origin.lng, destination.lat, destination.lng]);

  const line = route ?? [o, d];

  // Unify single (`progress`) and multi-truck (`trucks`) into one list. Each
  // truck gets its own marker that tweens between the GPS fixes it reports.
  const truckList: MapTruck[] = trucks && trucks.length > 0
    ? trucks
    : progress != null
      ? [{ index: 0, progress }]
      : [];
  // The traveled overlay follows the lead (furthest) truck.
  const leadProgress = truckList.reduce((m, t) => Math.max(m, t.progress), 0);
  const { traveled } = truckList.length > 0
    ? sliceAlong(line, leadProgress)
    : { traveled: [] as LatLngTuple[] };

  return (
    <div style={{ height, position: 'relative', zIndex: 0 }}>
      <style>{`
        .naqla-truck-wrap{position:relative;width:34px;height:34px}
        .naqla-truck-ring{position:absolute;inset:0;border-radius:9999px;background:rgba(0,201,167,.45);animation:naqla-ping 1.6s cubic-bezier(0,0,.2,1) infinite}
        .naqla-truck-dot{position:absolute;inset:4px;background:#fff;border:2px solid #0A3D3A;border-radius:9999px;display:grid;place-items:center;box-shadow:0 2px 6px rgba(0,0,0,.2)}
        .naqla-truck-badge{position:absolute;top:-6px;inset-inline-end:-6px;min-width:16px;height:16px;padding:0 3px;background:#0A3D3A;color:#fff;border:1.5px solid #fff;border-radius:9999px;font-size:10px;font-weight:700;line-height:13px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,.3)}
        @keyframes naqla-ping{0%{transform:scale(.6);opacity:.8}80%,100%{transform:scale(2);opacity:0}}
      `}</style>
      <MapContainer
        center={[(o[0] + d[0]) / 2, (o[1] + d[1]) / 2]}
        zoom={6}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds bounds={line} />

        {/* Road path — casing + main (Google-like), then the traveled overlay */}
        <Polyline positions={line} pathOptions={{ color: '#ffffff', weight: 8, opacity: 0.9 }} />
        <Polyline positions={line} pathOptions={{ color: '#9CA3AF', weight: 4, opacity: 0.9 }} />
        {traveled.length > 1 && (
          <Polyline positions={traveled} pathOptions={{ color: '#0A3D3A', weight: 5, opacity: 0.95 }} />
        )}

        <Marker position={o} icon={ORIGIN_ICON}>
          <Popup><strong>{origin.label}</strong><br /><span style={{ color: '#6B7280' }}>نقطة الانطلاق</span></Popup>
        </Marker>
        <Marker position={d} icon={DEST_ICON}>
          <Popup><strong>{destination.label}</strong><br /><span style={{ color: '#6B7280' }}>نقطة الوصول</span></Popup>
        </Marker>
        {truckList.map((t) => (
          <TruckMarker
            key={t.index}
            line={line}
            progress={t.progress}
            label={t.index > 0 ? String(t.index) : undefined}
            reference={t.reference}
          />
        ))}
      </MapContainer>

      {info && (
        <div
          className="num"
          style={{
            position: 'absolute', top: 10, insetInlineStart: 10, zIndex: 500,
            background: 'rgba(255,255,255,.95)', borderRadius: 10, padding: '6px 10px',
            boxShadow: '0 2px 8px rgba(0,0,0,.15)', fontSize: 12, fontWeight: 600, color: '#0A3D3A',
            display: 'flex', gap: 8, alignItems: 'center', pointerEvents: 'none',
          }}
        >
          <span>{Math.round(info.km).toLocaleString('en-US')} كم</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>~{fmtDuration(info.sec)}</span>
        </div>
      )}
    </div>
  );
}

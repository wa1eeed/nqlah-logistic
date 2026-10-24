# Shipment Tracking & Route Map

How the live shipment tracking map works. The map is **Leaflet + OpenStreetMap**
tiles (free) with a **real driving route** and an animated truck.

Component: `apps/web/{client,carrier,admin}/src/components/route-map.tsx`
(SSR-disabled wrapper) → `route-map-impl.tsx` (Leaflet). All three apps keep an
identical copy.

---

## 1. Real road route (OSRM)

Instead of a straight A→B polyline, the impl fetches a road-following route from
the public **OSRM** demo server (free, OpenStreetMap-based, no API key):

```
GET https://router.project-osrm.org/route/v1/driving/
    {originLng},{originLat};{destLng},{destLat}?overview=full&geometries=geojson
```

- `routes[0].geometry.coordinates` → the road polyline (drawn as a white casing
  under a grey road line, Google-style).
- `routes[0].distance` / `duration` → the real road distance + ETA, shown in a
  chip on the map.
- If the request fails, the component falls back to the straight line and the
  linear truck position, so the map always renders.

## 2. Live truck position

- The truck marker is placed **on the route**, at the point `fraction` of the
  way along it **by distance** (`sliceAlong` / `haversine`), not by straight-line
  interpolation.
- The `traveled` sub-path (origin → truck) is drawn in the brand teal; the rest
  stays grey — a clear "how far along" indicator.
- Animation: the truck shows the **last reported position** and **tweens**
  smoothly from its current point to each new `progress` value (like a
  ride-hailing app between GPS fixes). There is no continuous auto-crawl — the
  marker only moves when a new fix changes `progress`. A pulsing halo marks the
  live position.

## 3. Props

`RouteMap` / `RouteMapImpl`:

| Prop | Meaning |
| --- | --- |
| `origin` / `destination` | `{ lat, lng, label }` endpoints |
| `progress` | 0..1 — where the shipment is (e.g. 0.55 for in-transit, 1 for delivered) |
| `live` | keep the truck crawling toward the destination (live tracking) |
| `height` | map height in px |

Used by the order detail map (client/carrier/admin) and the client tracking page.

## 4. Live events timeline

The client tracking page (`apps/web/client/src/app/(app)/tracking/page.tsx`)
shows a `TrackingTimeline`: journey milestones (pickup → departure → mid-route →
approaching → delivery) whose times are derived from the order's pickup time and
distance (average speed). The current position is inserted at the live progress
point and marked «الآن» with a pulsing node; past milestones are "done" and
future ones "upcoming". A progress bar and a «مباشر» badge accompany it.

For in-transit shipments the live data is **pushed** from a mock tracking socket
(`apps/web/client/src/lib/tracking-socket.ts`) — a WebSocket stand-in that emits
`TrackingPing` messages (progress, speed, timestamp) at a realistic cadence. The
page subscribes once and reflects the last fix: «آخر تحديث HH:MM:SS», the current
speed, the remaining distance, the progress bar, and the timeline states — it
updates only when a fix arrives, not on a page timer. Swap `openTrackingSocket`
for a real `new WebSocket(url)` + `onmessage` without touching the consumers.

## 5. Backend (v0.9.28) — real WebSocket

The mock channel is now backed by a real Socket.IO connection (see
`docs/LOCAL_BACKEND.md`).

- **Server**: the `RealtimeGateway`
  (`apps/api/src/modules/realtime/realtime.gateway.ts`) authenticates the
  handshake with the JWT, joins `user:`/`company:`/`order:` rooms, and on
  `order:subscribe` for an `IN_TRANSIT` order streams discrete
  `tracking:location_update` fixes (progress + speed) to that order's room every
  4s, advancing to ~0.97. The stream is ref-counted by subscribers. `OrdersService`
  also emits `order:status_changed` on status transitions / the consolidated
  rollup, and `tracking:location_update` when a tracking event is posted.
- **Client**: `lib/tracking-socket.ts` connects with `socket.io-client`,
  `emit('order:subscribe', { orderId, startProgress })`, and forwards
  `tracking:location_update` fixes to the page — the same `TrackingPing`
  interface, so the UI is unchanged. If it can't connect it falls back to the
  local simulation. The tracking page lists live API orders (mock fallback).

## 6. Future

Replace the server's simulated progress with real device GPS (posted via
`POST /orders/:id/tracking`, already emitted live); keep the same OSRM route and
animation. Consider self-hosting OSRM (or a keyed router) for production rate
limits.

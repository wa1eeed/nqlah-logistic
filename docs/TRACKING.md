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
- Animation (`progress` + `live` props):
  - a reveal from 0 to the current `progress` over ~2.6s;
  - when `live` is true (`IN_TRANSIT` orders), the truck then **crawls** slowly
    toward the destination, simulating real-time movement;
  - a pulsing halo marks the live position.

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

With a real backend, replace the derived milestones with actual tracking events.

## 5. Future (real API)

Replace the simulated progress with the vehicle's actual GPS position from
tracking events / a realtime channel; keep the same OSRM route and animation.
Consider self-hosting OSRM (or a keyed router) for production rate limits.

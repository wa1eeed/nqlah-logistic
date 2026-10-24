# Fleet Management — Trucks & Drivers

Reference for the carrier **fleet management** subsystem: trucks, drivers, their
bidirectional link, status synchronization, trip history, and the activity
(audit) log. Carrier app only (`apps/web/carrier`).

> The current build is demo-mode (no backend): fleet state is seeded from
> `mock-data` and mutated through a client-side store. The data model and UI are
> designed to map cleanly onto a real API later.

---

## 1. Data model

Defined in `packages/shared-utils/src/mock-data.ts`.

### Truck (`interface Truck`)
`id`, `code` (human ID, e.g. `TRK-1001`), `carrierId`, `plateNumber` (Arabic
Saudi format, e.g. `"ا ب ح 1234"`), `truckType`, `capacityKg`, `modelYear`,
`status: TruckStatus`, `lastInspection`, `assignedDriverId?`.

`TruckStatus = 'AVAILABLE' | 'ON_TRIP' | 'MAINTENANCE' | 'OFF_DUTY'`

### Driver (`interface Driver`)
`id`, `code` (e.g. `DRV-2001`), `carrierId`, `fullName`, `nationalId`,
`licenseClass`, `licenseExpiry`, `phone`, `status: DriverStatus`,
`assignedTruckId?`, `totalTrips`.

`DriverStatus = 'AVAILABLE' | 'ON_TRIP' | 'OFF_DUTY'`

Seed invariant: **every truck has an assigned driver (1:1)**.

### Trips (`interface TruckTrip`)
One record per freight trip: `orderId`, `truckId`, `driverId?`, `clientName`,
`originCity`, `destinationCity`, `startedAt`, `finishedAt?`, `distanceKm`
(derived from `coordsFor`), `amount`, `status: OrderStatus`.
Helpers: `tripsForTruck(truckId)`, `tripsForDriver(driverId)` (newest first).

### Audit log (`interface FleetAuditEvent`)
`id`, `at` (ISO), `type: FleetEventType`, `truckId?`, `driverId?`, `actor`,
`message` (Arabic, user-facing).

`FleetEventType = 'ASSIGN' | 'UNASSIGN' | 'ONLINE' | 'OFFLINE' | 'TRIP_START' | 'TRIP_END' | 'MAINTENANCE' | 'STATUS'`

Seed `FLEET_AUDIT_SEED`; helpers `auditForTruck(id, extra)`,
`auditForDriver(id, extra)` merge seed + runtime events, newest first.

---

## 2. State store

`apps/web/carrier/src/stores/fleet-store.ts` — Zustand + `persist`
(`localStorage` key `naqla:fleet`). Initial maps are seeded synchronously from
`TRUCKS` / `DRIVERS`, so reads are always complete.

State: `assign` (truck → driver | null), `truckStatus`, `driverStatus`,
`events` (runtime audit, newest first).

Actions (each records an audit event):

| Action | Effect |
| --- | --- |
| `assignDriver(truckId, driverId)` | Links the pair; frees the driver from any other truck; the truck's previous driver goes off-duty; the new driver inherits the truck's status. |
| `unassignDriver(truckId)` | Clears the link; the driver goes off-duty. |
| `setTruckStatus(truckId, status)` | Sets the truck status and **syncs the linked driver**. |
| `setDriverStatus(driverId, status)` | Sets the driver status and **syncs the linked truck** (maintenance is preserved). |

### Status synchronization rules
- Truck → driver: `ON_TRIP → ON_TRIP`, `AVAILABLE → AVAILABLE`,
  `MAINTENANCE | OFF_DUTY → OFF_DUTY`.
- Driver → truck: `MAINTENANCE` on the truck always wins; otherwise
  `ON_TRIP → ON_TRIP`, `AVAILABLE → AVAILABLE`, `OFF_DUTY → OFF_DUTY`.

---

## 3. UI

Shared pieces: `apps/web/carrier/src/components/fleet-bits.tsx` —
`TripsTimeline`, `AuditTimeline`, `FleetStatusSelect`, `ConfirmDialog`,
`TRUCK_STATUS_OPTIONS`, `DRIVER_STATUS_OPTIONS`.

- **Trucks list** (`fleet/trucks`) — sourced from `mock-data`, overlaid with the
  store's status/assignment; columns include ID code, plate, driver, status.
- **Truck detail** (`fleet/trucks/[id]`) — header with plate + ID code + status
  select; linked-driver card with assign / change / unassign; tabs **Trips**
  (timeline + totals), **Activity log**, **Specs & documents**.
- **Drivers list** (`fleet/drivers`) — ID code, linked truck, synced status.
- **Driver detail** (`fleet/drivers/[id]`) — info, linked-truck card (plate +
  assign / change / unassign), tabs **Trips**, **Activity log**.
- Assign and unassign always go through a **confirmation dialog**; assigning a
  driver who is on another truck warns that they will be moved.

Plates are drawn with `SaudiLicensePlate` (see `CHANGELOG.md` v0.9.17).

---

## 4. Order integration

Order detail pages (client / carrier / admin) show the assigned truck's **plate
+ code** and the **driver** (name, code, licence, phone), so every party sees
who is carrying the shipment.

---

## 5. Future (real API)

- Replace the seed + store with fleet endpoints; keep the same action semantics.
- Persist the audit log server-side; emit events from trip lifecycle webhooks.
- Enforce the status-sync rules on the backend, not only in the client.

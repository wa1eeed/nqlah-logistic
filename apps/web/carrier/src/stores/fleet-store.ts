'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  TRUCKS, DRIVERS,
  type TruckStatus, type DriverStatus, type FleetAuditEvent, type FleetEventType,
} from '@naqla/shared-utils';

type TruckId = string;
type DriverId = string;

/** Truck status → the status its linked driver should take. */
function truckToDriver(status: TruckStatus): DriverStatus {
  if (status === 'ON_TRIP') return 'ON_TRIP';
  if (status === 'AVAILABLE') return 'AVAILABLE';
  return 'OFF_DUTY'; // MAINTENANCE | OFF_DUTY → driver off duty
}

/** Driver status → the status its linked truck should take (maintenance wins). */
function driverToTruck(status: DriverStatus, current: TruckStatus): TruckStatus {
  if (current === 'MAINTENANCE') return 'MAINTENANCE';
  if (status === 'ON_TRIP') return 'ON_TRIP';
  if (status === 'AVAILABLE') return 'AVAILABLE';
  return 'OFF_DUTY';
}

const nameD = (id?: string | null) => DRIVERS.find((d) => d.id === id)?.fullName ?? id ?? '—';
const codeT = (id?: string | null) => TRUCKS.find((t) => t.id === id)?.code ?? id ?? '—';
const codeD = (id?: string | null) => DRIVERS.find((d) => d.id === id)?.code ?? id ?? '—';

let seq = 0;
function mk(
  type: FleetEventType,
  truckId: TruckId | undefined,
  driverId: DriverId | undefined,
  message: string,
  actor = 'مشغّل الأسطول',
): FleetAuditEvent {
  return { id: `AE-U-${Date.now().toString(36)}-${seq++}`, at: new Date().toISOString(), type, truckId, driverId, actor, message };
}

const statusEvent = (status: TruckStatus): FleetEventType =>
  status === 'ON_TRIP' ? 'TRIP_START'
  : status === 'AVAILABLE' ? 'ONLINE'
  : status === 'MAINTENANCE' ? 'MAINTENANCE'
  : 'OFFLINE';

const statusVerb = (status: TruckStatus): string =>
  status === 'ON_TRIP' ? 'دخلت رحلة'
  : status === 'AVAILABLE' ? 'أصبحت متاحة وعلى الخط'
  : status === 'MAINTENANCE' ? 'دخلت الصيانة'
  : 'أصبحت خارج الخدمة';

interface FleetState {
  /** truck → driver (null = unassigned). Seeded from mock-data. */
  assign: Record<TruckId, DriverId | null>;
  truckStatus: Record<TruckId, TruckStatus>;
  driverStatus: Record<DriverId, DriverStatus>;
  /** User-generated events, newest first (merged with seed by the pages). */
  events: FleetAuditEvent[];

  assignDriver: (truckId: TruckId, driverId: DriverId) => void;
  unassignDriver: (truckId: TruckId) => void;
  setTruckStatus: (truckId: TruckId, status: TruckStatus) => void;
  setDriverStatus: (driverId: DriverId, status: DriverStatus) => void;
  /** Append a pre-built activity event (used after an API-backed action so the
   *  message can carry real names resolved from live data). */
  logEvent: (event: FleetAuditEvent) => void;
  /** Restore the fleet to its seeded state (demo convenience). */
  resetFleet: () => void;
}

/** Build an activity event for the local log (names resolved by the caller). */
export function makeFleetEvent(
  type: FleetEventType,
  truckId: string | undefined,
  driverId: string | undefined,
  message: string,
): FleetAuditEvent {
  return { id: `AE-U-${Date.now().toString(36)}-${seq++}`, at: new Date().toISOString(), type, truckId, driverId, actor: 'مشغّل الأسطول', message };
}

const seedAssign: Record<TruckId, DriverId | null> =
  Object.fromEntries(TRUCKS.map((t) => [t.id, t.assignedDriverId ?? null]));
const seedTruckStatus: Record<TruckId, TruckStatus> =
  Object.fromEntries(TRUCKS.map((t) => [t.id, t.status]));
const seedDriverStatus: Record<DriverId, DriverStatus> =
  Object.fromEntries(DRIVERS.map((d) => [d.id, d.status]));

export const useFleetStore = create<FleetState>()(
  persist(
    (set) => ({
      assign: { ...seedAssign },
      truckStatus: { ...seedTruckStatus },
      driverStatus: { ...seedDriverStatus },
      events: [],

      assignDriver: (truckId, driverId) =>
        set((s) => {
          const assign = { ...s.assign };
          const driverStatus = { ...s.driverStatus };
          // Free the driver from any other truck.
          for (const tid of Object.keys(assign)) {
            if (assign[tid] === driverId) assign[tid] = null;
          }
          // The truck's previous driver becomes free → off duty.
          const prev = assign[truckId];
          if (prev && prev !== driverId) driverStatus[prev] = 'OFF_DUTY';
          assign[truckId] = driverId;
          // New driver inherits the truck's current status.
          driverStatus[driverId] = truckToDriver(s.truckStatus[truckId] ?? 'AVAILABLE');
          const events = [
            mk('ASSIGN', truckId, driverId, `تم إسناد السائق ${nameD(driverId)} (${codeD(driverId)}) إلى الشاحنة ${codeT(truckId)}`),
            ...s.events,
          ];
          return { assign, driverStatus, events };
        }),

      unassignDriver: (truckId) =>
        set((s) => {
          const driverId = s.assign[truckId];
          if (!driverId) return {} as Partial<FleetState>;
          const assign = { ...s.assign, [truckId]: null };
          const driverStatus = { ...s.driverStatus, [driverId]: 'OFF_DUTY' as DriverStatus };
          const events = [
            mk('UNASSIGN', truckId, driverId, `تم فك ارتباط السائق ${nameD(driverId)} عن الشاحنة ${codeT(truckId)}`),
            ...s.events,
          ];
          return { assign, driverStatus, events };
        }),

      setTruckStatus: (truckId, status) =>
        set((s) => {
          const truckStatus = { ...s.truckStatus, [truckId]: status };
          const driverStatus = { ...s.driverStatus };
          const driverId = s.assign[truckId];
          if (driverId) driverStatus[driverId] = truckToDriver(status);
          const events = [
            mk(statusEvent(status), truckId, driverId ?? undefined, `الشاحنة ${codeT(truckId)} ${statusVerb(status)}`),
            ...s.events,
          ];
          return { truckStatus, driverStatus, events };
        }),

      setDriverStatus: (driverId, status) =>
        set((s) => {
          const driverStatus = { ...s.driverStatus, [driverId]: status };
          const truckStatus = { ...s.truckStatus };
          const truckId = Object.keys(s.assign).find((tid) => s.assign[tid] === driverId);
          if (truckId) truckStatus[truckId] = driverToTruck(status, s.truckStatus[truckId] ?? 'AVAILABLE');
          const synced: TruckStatus | null = truckId ? truckStatus[truckId] : null;
          const events = [
            mk(
              status === 'ON_TRIP' ? 'TRIP_START' : status === 'AVAILABLE' ? 'ONLINE' : 'OFFLINE',
              truckId ?? undefined,
              driverId,
              `السائق ${nameD(driverId)} ${status === 'ON_TRIP' ? 'بدأ رحلة' : status === 'AVAILABLE' ? 'أصبح متاحًا' : 'أصبح خارج الخدمة'}${synced ? ` · الشاحنة ${codeT(truckId)} ${statusVerb(synced)}` : ''}`,
            ),
            ...s.events,
          ];
          return { driverStatus, truckStatus, events };
        }),

      logEvent: (event) =>
        set((s) => ({ events: [event, ...s.events].slice(0, 200) })),

      resetFleet: () =>
        set({
          assign: { ...seedAssign },
          truckStatus: { ...seedTruckStatus },
          driverStatus: { ...seedDriverStatus },
          events: [],
        }),
    }),
    {
      name: 'naqla:fleet',
      version: 1,
    },
  ),
);

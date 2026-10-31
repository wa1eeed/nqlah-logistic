'use client';
import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import useSWR from 'swr';
import {
  Circle, Clock, Gauge, MapPin, Navigation, Package, Truck, Users, X,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { DriverStatusBadge } from '@/components/fleet-bits';
import { TrackingMap, type TrackingDriver, type TrackingOrderRoute } from '@/components/tracking-map';
import { api, fetcher } from '@/lib/api';
import { openFleetTrackingSocket, type FleetTrackingPing } from '@/lib/fleet-tracking-socket';
import { useAuthStore } from '@/lib/auth-store';
import {
  CURRENT_CARRIER_ID, coordsFor, localizeCity, normalizeDriverList, normalizeOrderList,
  type Driver, type Order,
} from '@naqla/shared-utils';
import { cn } from '@/lib/utils';

// ── Types ────────────────────────────────────────────────────────────
type FleetDriver = Driver & {
  currentLat?: number | null;
  currentLng?: number | null;
  lastLocationAt?: string | null;
  rating?: number;
};

/** The order-detail shape we read for driver assignment (lean subset). */
interface OrderDetail {
  id: string;
  orderDrivers?: Array<{
    driver?: {
      id: string;
      currentLat?: number | null;
      currentLng?: number | null;
      user?: { firstName?: string; lastName?: string } | null;
    } | null;
  }>;
}

interface MapsConfig { provider: string; tileUrl: string; attribution: string; maxZoom: number }

const OSM_TILE = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTR = '© OpenStreetMap contributors';

// Carrier "work" orders that belong on the tracking board (accepted → moving).
const ACTIVE_STATUSES = ['ASSIGNED', 'CONFIRMED', 'IN_TRANSIT'] as const;

/** Resolve an order's origin/destination coordinates: the API lat/lng when the
 *  client geocoded it, else the city-centroid fallback. */
function orderCoords(o: Order, which: 'origin' | 'destination'): { lat: number; lng: number } {
  const r = o as unknown as Record<string, number | null | undefined>;
  const lat = r[`${which}Lat`];
  const lng = r[`${which}Lng`];
  if (typeof lat === 'number' && typeof lng === 'number') return { lat, lng };
  return coordsFor(which === 'origin' ? o.originCity : o.destinationCity);
}

export default function TrackingPage() {
  const t = useTranslations('carrier');
  const authedCompanyId = useAuthStore((s) => s.user?.companyId);
  const myCompanyId = authedCompanyId ?? CURRENT_CARRIER_ID;

  const { data: mapsCfg } = useSWR<MapsConfig>('/config/maps', fetcher);
  const tileUrl = mapsCfg?.tileUrl || OSM_TILE;
  const attribution = mapsCfg?.attribution || OSM_ATTR;
  const maxZoom = mapsCfg?.maxZoom ?? 19;

  const { data: driversRaw, error: driversErr } = useSWR<unknown>('/fleet/drivers', fetcher);
  const { data: ordersRaw, error: ordersErr } = useSWR<unknown>('/orders?mine=true&limit=100', fetcher);

  // ── Drivers ──────────────────────────────────────────────────────
  const drivers = useMemo<FleetDriver[]>(() => normalizeDriverList<FleetDriver>(driversRaw), [driversRaw]);
  const driversByStatus = useMemo(() => ({
    ON_TRIP: drivers.filter((d) => d.status === 'ON_TRIP'),
    AVAILABLE: drivers.filter((d) => d.status === 'AVAILABLE'),
    OFF_DUTY: drivers.filter((d) => d.status === 'OFF_DUTY'),
  }), [drivers]);

  // Only drivers with a known position are placed on the map.
  const mapDrivers = useMemo<TrackingDriver[]>(() => drivers
    .filter((d) => typeof d.currentLat === 'number' && typeof d.currentLng === 'number')
    .map((d) => ({
      id: d.id, name: d.fullName || d.code, status: d.status,
      lat: d.currentLat as number, lng: d.currentLng as number, code: d.code,
    })), [drivers]);

  // ── Orders (carrier work) ────────────────────────────────────────
  const activeOrders = useMemo<Order[]>(() => normalizeOrderList(ordersRaw)
    .filter((o) => (ACTIVE_STATUSES as readonly string[]).includes(o.status)), [ordersRaw]);

  // The LIST endpoint omits `orderDrivers`, so fetch each active order's detail
  // (cheap — active work is a handful) to learn whether a driver is assigned and
  // where that driver currently is. One SWR entry, keyed by the id set.
  const candidateIds = useMemo(() => activeOrders.map((o) => o.id).sort(), [activeOrders]);
  const { data: details } = useSWR<OrderDetail[]>(
    candidateIds.length ? ['order-details', candidateIds.join(',')] : null,
    () => Promise.all(candidateIds.map((id) => api.get(`/orders/${id}`).then((r) => r.data?.data as OrderDetail))),
  );
  const detailById = useMemo(() => {
    const m = new Map<string, OrderDetail>();
    (details ?? []).forEach((d) => { if (d?.id) m.set(d.id, d); });
    return m;
  }, [details]);

  const assignedDriverOf = (orderId: string) => detailById.get(orderId)?.orderDrivers?.[0]?.driver ?? null;
  const hasDriver = (o: Order) => {
    const detail = detailById.get(o.id);
    // Until the detail loads, use status as a first guess (IN_TRANSIT ⇒ moving).
    if (!detail) return o.status === 'IN_TRANSIT';
    return (detail.orderDrivers?.length ?? 0) > 0;
  };

  const awaitingOrders = useMemo(() => activeOrders.filter((o) => !hasDriver(o)), [activeOrders, detailById]);
  const assignedOrders = useMemo(() => activeOrders.filter((o) => hasDriver(o)), [activeOrders, detailById]);

  // ── Selection ────────────────────────────────────────────────────
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const selectedOrder = useMemo(() => activeOrders.find((o) => o.id === selectedOrderId) ?? null, [activeOrders, selectedOrderId]);

  const selectDriver = (id: string) => { setSelectedDriverId((cur) => (cur === id ? null : id)); setSelectedOrderId(null); };
  const selectOrder = (id: string) => { setSelectedOrderId((cur) => (cur === id ? null : id)); setSelectedDriverId(null); };

  // ── Live position for the selected order ─────────────────────────
  const [live, setLive] = useState<{ lat?: number; lng?: number; progress?: number; speedKmh?: number | null; at?: number } | null>(null);
  const selectedAssignedDriver = selectedOrderId ? assignedDriverOf(selectedOrderId) : null;
  const selectedIsLive = !!selectedOrder && hasDriver(selectedOrder);

  useEffect(() => {
    setLive(null);
    if (!selectedOrder || !selectedIsLive) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('naqla_carrier_token') ?? undefined : undefined;
    const socket = openFleetTrackingSocket({
      orderId: selectedOrder.id,
      token,
      startProgress: selectedOrder.status === 'IN_TRANSIT' ? 0.4 : 0.1,
      onPing: (p: FleetTrackingPing) => {
        setLive({ lat: p.lat, lng: p.lng, progress: p.progress, speedKmh: p.speedKmh, at: p.at });
      },
    });
    return () => socket.close();
  }, [selectedOrder?.id, selectedIsLive]); // eslint-disable-line react-hooks/exhaustive-deps

  // Build the order overlay passed to the map (route + live truck position).
  const mapOrder = useMemo<TrackingOrderRoute | null>(() => {
    if (!selectedOrder) return null;
    const o = orderCoords(selectedOrder, 'origin');
    const d = orderCoords(selectedOrder, 'destination');
    const driverName = selectedAssignedDriver?.user
      ? [selectedAssignedDriver.user.firstName, selectedAssignedDriver.user.lastName].filter(Boolean).join(' ').trim()
      : undefined;
    // Live GPS fix wins; else the driver's last known position; else the sim.
    const truck = live?.lat != null && live?.lng != null
      ? { lat: live.lat, lng: live.lng }
      : (typeof selectedAssignedDriver?.currentLat === 'number' && typeof selectedAssignedDriver?.currentLng === 'number'
          ? { lat: selectedAssignedDriver.currentLat, lng: selectedAssignedDriver.currentLng }
          : null);
    return {
      id: selectedOrder.id,
      origin: { ...o, label: localizeCity(selectedOrder.originCity) },
      destination: { ...d, label: localizeCity(selectedOrder.destinationCity) },
      truck: selectedIsLive ? truck : null,
      progress: selectedIsLive && !truck ? (live?.progress ?? undefined) : undefined,
      driverName,
    };
  }, [selectedOrder, selectedAssignedDriver, live, selectedIsLive]);

  const lastUpdate = live?.at ? new Date(live.at).toLocaleTimeString('en-GB') : null;

  return (
    <>
      <PageHeader
        title={t('tracking.title')}
        subtitle={t('tracking.subtitle', { drivers: drivers.length, orders: activeOrders.length })}
      />

      {/* RTL flow: DOM order renders drivers at the visual start (right), map
          in the center, orders at the end (left). Stacks on small screens. */}
      <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-13rem)] min-h-[560px]">
        {/* RIGHT (start) — DRIVERS */}
        <DriversPanel
          t={t}
          error={!!driversErr}
          driversByStatus={driversByStatus}
          selectedDriverId={selectedDriverId}
          onSelect={selectDriver}
        />

        {/* CENTER — MAP */}
        <div className="relative min-h-[320px] flex-1 lg:min-w-0">
          <TrackingMap
            tileUrl={tileUrl}
            attribution={attribution}
            maxZoom={maxZoom}
            drivers={mapDrivers}
            selectedDriverId={selectedDriverId}
            order={mapOrder}
          />
          <MapLegend t={t} />
        </div>

        {/* LEFT (end) — ORDERS */}
        <OrdersPanel
          t={t}
          error={!!ordersErr}
          awaiting={awaitingOrders}
          assigned={assignedOrders}
          selectedOrderId={selectedOrderId}
          onSelect={selectOrder}
          selectedOrder={selectedOrder}
          driverName={mapOrder?.driverName}
          live={selectedIsLive ? { speedKmh: live?.speedKmh, lastUpdate } : null}
          onClear={() => setSelectedOrderId(null)}
          myCompanyId={myCompanyId}
        />
      </div>
    </>
  );
}

// ─── Drivers panel ─────────────────────────────────────────────────────
type TFn = ReturnType<typeof useTranslations>;

function DriversPanel({
  t, error, driversByStatus, selectedDriverId, onSelect,
}: {
  t: TFn;
  error: boolean;
  driversByStatus: Record<'ON_TRIP' | 'AVAILABLE' | 'OFF_DUTY', FleetDriver[]>;
  selectedDriverId: string | null;
  onSelect: (id: string) => void;
}) {
  const [tab, setTab] = useState<'ON_TRIP' | 'AVAILABLE' | 'OFF_DUTY'>('ON_TRIP');
  const rows = driversByStatus[tab];

  return (
    <Card className="flex w-full flex-col lg:w-80 lg:shrink-0 overflow-hidden">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Users className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">{t('tracking.drivers.title')}</span>
      </div>
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="px-3 pt-3">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ON_TRIP">{t('tracking.drivers.tabs.busy')} ({driversByStatus.ON_TRIP.length})</TabsTrigger>
          <TabsTrigger value="AVAILABLE">{t('tracking.drivers.tabs.available')} ({driversByStatus.AVAILABLE.length})</TabsTrigger>
          <TabsTrigger value="OFF_DUTY">{t('tracking.drivers.tabs.offline')} ({driversByStatus.OFF_DUTY.length})</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="flex-1 space-y-2 overflow-y-auto scrollbar-thin p-3">
        {error && rows.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">{t('tracking.loadError')}</p>
        )}
        {!error && rows.length === 0 && (
          <div className="py-10 text-center text-muted-foreground">
            <Users className="mx-auto mb-2 h-8 w-8 opacity-30" />
            <p className="text-sm">{t('tracking.drivers.empty')}</p>
          </div>
        )}
        {rows.map((d) => {
          const isSelected = d.id === selectedDriverId;
          const located = typeof d.currentLat === 'number' && typeof d.currentLng === 'number';
          const initials = (d.fullName || d.code).split(' ').slice(0, 2).map((w) => w[0]).join('');
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => onSelect(d.id)}
              disabled={!located}
              className={cn(
                'w-full rounded-lg border p-3 text-start transition-colors',
                isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted/40',
                !located && 'opacity-60',
              )}
              title={!located ? t('tracking.drivers.noLocation') : undefined}
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9"><AvatarFallback className="text-xs">{initials}</AvatarFallback></Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{d.fullName || t('tracking.drivers.unnamed')}</div>
                  <div className="num truncate text-xs text-muted-foreground" style={{ direction: 'ltr', unicodeBidi: 'plaintext' }}>{d.code}</div>
                </div>
                <DriverStatusBadge status={d.status} />
              </div>
              {!located && (
                <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" /> {t('tracking.drivers.noLocation')}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

// ─── Orders panel ──────────────────────────────────────────────────────
function OrdersPanel({
  t, error, awaiting, assigned, selectedOrderId, onSelect, selectedOrder, driverName, live, onClear, myCompanyId,
}: {
  t: TFn;
  error: boolean;
  awaiting: Order[];
  assigned: Order[];
  selectedOrderId: string | null;
  onSelect: (id: string) => void;
  selectedOrder: Order | null;
  driverName?: string;
  live: { speedKmh?: number | null; lastUpdate: string | null } | null;
  onClear: () => void;
  myCompanyId: string;
}) {
  const [tab, setTab] = useState<'AWAITING' | 'ASSIGNED'>('ASSIGNED');
  const rows = tab === 'AWAITING' ? awaiting : assigned;

  return (
    <Card className="flex w-full flex-col lg:w-80 lg:shrink-0 overflow-hidden">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <Package className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">{t('tracking.orders.title')}</span>
      </div>

      {/* Selected-order details (route + assigned driver + live status). */}
      {selectedOrder && (
        <div className="border-b bg-primary/5 px-4 py-3">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="num text-xs font-semibold text-primary">{selectedOrder.orderNumber}</span>
            <button type="button" onClick={onClear} className="rounded p-0.5 text-muted-foreground hover:bg-muted" aria-label={t('tracking.selected.clear')}>
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <span className="truncate">{localizeCity(selectedOrder.originCity)}</span>
            <Navigation className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{localizeCity(selectedOrder.destinationCity)}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={selectedOrder.status} />
            {driverName && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Truck className="h-3 w-3" /> {driverName}
              </span>
            )}
          </div>
          {live && (
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
              <Badge variant="success" className="flex items-center gap-1">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
                {t('tracking.selected.live')}
              </Badge>
              {live.speedKmh != null && (
                <span className="num inline-flex items-center gap-1 font-medium text-[hsl(var(--mint))]">
                  <Gauge className="h-3 w-3" /> {live.speedKmh} {t('tracking.selected.speedUnit')}
                </span>
              )}
              {live.lastUpdate && (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3 w-3" /> <span className="num">{live.lastUpdate}</span>
                </span>
              )}
            </div>
          )}
        </div>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="px-3 pt-3">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="ASSIGNED">{t('tracking.orders.tabs.assigned')} ({assigned.length})</TabsTrigger>
          <TabsTrigger value="AWAITING">{t('tracking.orders.tabs.awaiting')} ({awaiting.length})</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="flex-1 space-y-2 overflow-y-auto scrollbar-thin p-3">
        {error && rows.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">{t('tracking.loadError')}</p>
        )}
        {!error && rows.length === 0 && (
          <div className="py-10 text-center text-muted-foreground">
            <Package className="mx-auto mb-2 h-8 w-8 opacity-30" />
            <p className="text-sm">{tab === 'AWAITING' ? t('tracking.orders.emptyAwaiting') : t('tracking.orders.emptyAssigned')}</p>
          </div>
        )}
        {rows.map((o) => {
          const isSelected = o.id === selectedOrderId;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onSelect(o.id)}
              className={cn(
                'w-full rounded-lg border p-3 text-start transition-colors',
                isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted/40',
              )}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="num text-xs font-semibold text-primary">{o.orderNumber}</span>
                <StatusBadge status={o.status} />
              </div>
              <div className="flex items-center gap-1.5 truncate text-sm font-medium">
                <span className="truncate">{localizeCity(o.originCity)}</span>
                <Navigation className="h-3 w-3 shrink-0 text-muted-foreground" />
                <span className="truncate">{localizeCity(o.destinationCity)}</span>
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

// ─── Map legend ────────────────────────────────────────────────────────
function MapLegend({ t }: { t: TFn }) {
  const items: Array<[string, string]> = [
    ['#00C9A7', t('tracking.legend.busy')],
    ['#2563EB', t('tracking.legend.available')],
    ['#9CA3AF', t('tracking.legend.offline')],
  ];
  return (
    <div className="pointer-events-none absolute bottom-3 end-3 z-[500] rounded-lg bg-card/95 px-3 py-2 text-xs shadow-md ring-1 ring-border">
      <div className="space-y-1">
        {items.map(([color, label]) => (
          <div key={label} className="flex items-center gap-2">
            <Circle className="h-2.5 w-2.5" style={{ color, fill: color }} />
            <span className="text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

'use client';
import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import useSWR, { useSWRConfig } from 'swr';
import {
  ChevronLeft, Circle, Clock, Gauge, Map as MapIcon, MapPin, Navigation, Package,
  Phone, RefreshCw, Rows3, Search, Truck, Users, X,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/status-badge';
import { TrackingMap, type TrackingDriver, type TrackingOrderRoute } from '@/components/tracking-map';
import { api, fetcher } from '@/lib/api';
import { openFleetTrackingSocket, type FleetTrackingPing } from '@/lib/fleet-tracking-socket';
import { openCarrierPresenceSocket } from '@/lib/carrier-presence-socket';
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

const ACTIVE_STATUSES = ['ASSIGNED', 'CONFIRMED', 'IN_TRANSIT'] as const;

const STATUS_HEX: Record<string, string> = {
  ON_TRIP: '#00C9A7', AVAILABLE: '#2563EB', OFF_DUTY: '#9CA3AF',
};

/** A GPS fix newer than this = "live"; older = last-known/stale. */
const FRESH_MS = 90_000;
const isFresh = (iso?: string | null) => !!iso && Date.now() - new Date(iso).getTime() < FRESH_MS;
const lastSeen = (iso?: string | null): string | null => {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  const m = Math.floor(ms / 60000);
  if (m < 1) return '<1m';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
};

function orderCoords(o: Order, which: 'origin' | 'destination'): { lat: number; lng: number } {
  const r = o as unknown as Record<string, number | null | undefined>;
  const lat = r[`${which}Lat`];
  const lng = r[`${which}Lng`];
  if (typeof lat === 'number' && typeof lng === 'number') return { lat, lng };
  return coordsFor(which === 'origin' ? o.originCity : o.destinationCity);
}

const hhmm = (iso?: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

export default function TrackingPage() {
  const t = useTranslations('carrier');
  const { mutate } = useSWRConfig();
  const authedCompanyId = useAuthStore((s) => s.user?.companyId);
  const myCompanyId = authedCompanyId ?? CURRENT_CARRIER_ID;

  const { data: mapsCfg } = useSWR<MapsConfig>('/config/maps', fetcher);
  // Use the tiles from the Integration Hub (defaults to free OSM). For the plain
  // OSM default we render a dark-dispatch look by CSS-filtering the tiles; a
  // configured provider (e.g. Mapbox) is shown as-is.
  const useConfigured = !!mapsCfg && mapsCfg.provider !== 'maplibre' && !!mapsCfg.tileUrl;
  const tileUrl = mapsCfg?.tileUrl || OSM_TILE;
  const attribution = mapsCfg?.attribution || OSM_ATTR;
  const maxZoom = mapsCfg?.maxZoom ?? 19;
  const darkMap = !useConfigured;

  const { data: driversRaw, error: driversErr } = useSWR<unknown>('/fleet/drivers', fetcher);
  const { data: ordersRaw, error: ordersErr } = useSWR<unknown>('/orders?mine=true&limit=100', fetcher);

  const [view, setView] = useState<'MAP' | 'LIST'>('MAP');

  // Live driver online/offline presence (socket `driver:presence` on the
  // carrier's company room), merged over the REST snapshot.
  const [presence, setPresence] = useState<Record<string, boolean>>({});
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('naqla_carrier_token') ?? undefined : undefined;
    const s = openCarrierPresenceSocket({
      token,
      onPresence: (p) => setPresence((cur) => ({ ...cur, [p.driverId]: p.online })),
    });
    return () => s.close();
  }, []);

  // ── Drivers ──────────────────────────────────────────────────────
  const drivers = useMemo<FleetDriver[]>(() => normalizeDriverList<FleetDriver>(driversRaw), [driversRaw]);
  const mapDrivers = useMemo<TrackingDriver[]>(() => drivers
    .filter((d) => typeof d.currentLat === 'number' && typeof d.currentLng === 'number')
    .map((d) => ({
      id: d.id, name: d.fullName || d.code, status: d.status,
      lat: d.currentLat as number, lng: d.currentLng as number, code: d.code,
    })), [drivers]);

  // ── Orders (carrier work) ────────────────────────────────────────
  const activeOrders = useMemo<Order[]>(() => normalizeOrderList(ordersRaw)
    .filter((o) => (ACTIVE_STATUSES as readonly string[]).includes(o.status)), [ordersRaw]);

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

  // Current task (active-order) count per driver — Tookan-style badge.
  const driverTaskCount = useMemo(() => {
    const m = new Map<string, number>();
    (details ?? []).forEach((d) => d.orderDrivers?.forEach((od) => {
      const id = od.driver?.id; if (id) m.set(id, (m.get(id) ?? 0) + 1);
    }));
    return m;
  }, [details]);

  const assignedDriverOf = (orderId: string) => detailById.get(orderId)?.orderDrivers?.[0]?.driver ?? null;
  const hasDriver = (o: Order) => {
    const detail = detailById.get(o.id);
    if (!detail) return o.status === 'IN_TRANSIT';
    return (detail.orderDrivers?.length ?? 0) > 0;
  };

  // ── Selection ────────────────────────────────────────────────────
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const selectedOrder = useMemo(() => activeOrders.find((o) => o.id === selectedOrderId) ?? null, [activeOrders, selectedOrderId]);

  const selectDriver = (id: string) => { setSelectedDriverId((cur) => (cur === id ? null : id)); setSelectedOrderId(null); setView('MAP'); };
  const selectOrder = (id: string) => { setSelectedOrderId((cur) => (cur === id ? null : id)); setSelectedDriverId(null); setView('MAP'); };

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
      onPing: (p: FleetTrackingPing) => setLive({ lat: p.lat, lng: p.lng, progress: p.progress, speedKmh: p.speedKmh, at: p.at }),
    });
    return () => socket.close();
  }, [selectedOrder?.id, selectedIsLive]); // eslint-disable-line react-hooks/exhaustive-deps

  const mapOrder = useMemo<TrackingOrderRoute | null>(() => {
    if (!selectedOrder) return null;
    const o = orderCoords(selectedOrder, 'origin');
    const d = orderCoords(selectedOrder, 'destination');
    const driverName = selectedAssignedDriver?.user
      ? [selectedAssignedDriver.user.firstName, selectedAssignedDriver.user.lastName].filter(Boolean).join(' ').trim()
      : undefined;
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
  const refresh = () => mutate(() => true, undefined, { revalidate: true });

  return (
    <div className="space-y-3">
      {/* ── Console toolbar ───────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-primary px-3 py-2 text-primary-foreground shadow-sm">
        <div className="flex items-center gap-2">
          <Navigation className="h-4 w-4" />
          <span className="text-sm font-semibold">{t('tracking.title')}</span>
          <span className="hidden text-xs text-primary-foreground/70 sm:inline">
            {t('tracking.subtitle', { drivers: drivers.length, orders: activeOrders.length })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* MAP / LIST segmented toggle */}
          <div className="flex items-center rounded-lg bg-white/10 p-0.5">
            <button
              type="button"
              onClick={() => setView('MAP')}
              className={cn('flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                view === 'MAP' ? 'bg-white text-primary' : 'text-primary-foreground/80 hover:text-primary-foreground')}
            >
              <MapIcon className="h-3.5 w-3.5" /> {t('tracking.view.map')}
            </button>
            <button
              type="button"
              onClick={() => { setView('LIST'); setSelectedOrderId(null); setSelectedDriverId(null); }}
              className={cn('flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                view === 'LIST' ? 'bg-white text-primary' : 'text-primary-foreground/80 hover:text-primary-foreground')}
            >
              <Rows3 className="h-3.5 w-3.5" /> {t('tracking.view.list')}
            </button>
          </div>
          <button
            type="button"
            onClick={refresh}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-primary-foreground/90 transition-colors hover:bg-white/20"
            aria-label={t('tracking.refresh')}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ── Dispatch board: RTL flow → drivers (start) · map · orders (end) ── */}
      <div className="flex flex-col lg:flex-row gap-3 h-[calc(100vh-12rem)] min-h-[560px]">
        <DriversPanel
          t={t}
          error={!!driversErr}
          drivers={drivers}
          taskCount={driverTaskCount}
          presence={presence}
          selectedDriverId={selectedDriverId}
          onSelect={selectDriver}
          expanded={view === 'LIST'}
        />

        {view === 'MAP' && (
          <div className="relative min-h-[320px] flex-1 lg:min-w-0">
            <TrackingMap
              tileUrl={tileUrl}
              attribution={attribution}
              maxZoom={maxZoom}
              dark={darkMap}
              drivers={mapDrivers}
              selectedDriverId={selectedDriverId}
              order={mapOrder}
            />
            <MapLegend t={t} />
          </div>
        )}

        <OrdersPanel
          t={t}
          error={!!ordersErr}
          orders={activeOrders}
          hasDriver={hasDriver}
          driverNameOf={(id) => {
            const dr = assignedDriverOf(id);
            return dr?.user ? [dr.user.firstName, dr.user.lastName].filter(Boolean).join(' ').trim() : undefined;
          }}
          selectedOrderId={selectedOrderId}
          onSelect={selectOrder}
          selectedOrder={selectedOrder}
          detailDriverName={mapOrder?.driverName}
          live={selectedIsLive ? { speedKmh: live?.speedKmh, lastUpdate } : null}
          onClear={() => setSelectedOrderId(null)}
          expanded={view === 'LIST'}
        />
      </div>
    </div>
  );
}

type TFn = ReturnType<typeof useTranslations>;

// ─── Shared panel bits ────────────────────────────────────────────────
function PanelHeader({ icon: Icon, title, query, setQuery, placeholder }: {
  icon: typeof Users; title: string; query: string; setQuery: (v: string) => void; placeholder: string;
}) {
  return (
    <>
      <div className="flex items-center gap-2 bg-primary px-4 py-2.5 text-primary-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <div className="border-b p-2">
        <div className="relative">
          <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder} className="h-8 ps-8 text-xs" />
        </div>
      </div>
    </>
  );
}

function SegTabs<T extends string>({ tabs, value, onChange }: {
  tabs: Array<{ key: T; label: string; count: number }>; value: T; onChange: (k: T) => void;
}) {
  return (
    <div className="flex border-b bg-muted/30">
      {tabs.map((tb) => {
        const active = tb.key === value;
        return (
          <button
            key={tb.key}
            type="button"
            onClick={() => onChange(tb.key)}
            className={cn(
              '-mb-px flex-1 border-b-2 px-2 py-2.5 text-center text-xs font-medium transition-colors',
              active ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <span className="num me-1 tabular-nums">{tb.count}</span>{tb.label}
          </button>
        );
      })}
    </div>
  );
}

function StatusAvatar({ name, status }: { name: string; status: string }) {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('') || '—';
  return (
    <div className="relative shrink-0">
      <Avatar className="h-9 w-9"><AvatarFallback className="text-xs">{initials}</AvatarFallback></Avatar>
      <span
        className="absolute -bottom-0.5 -end-0.5 h-3 w-3 rounded-full border-2 border-card"
        style={{ background: STATUS_HEX[status] ?? '#9CA3AF' }}
      />
    </div>
  );
}

// ─── Drivers (agents) panel ───────────────────────────────────────────
function DriversPanel({
  t, error, drivers, taskCount, presence, selectedDriverId, onSelect, expanded,
}: {
  t: TFn; error: boolean; drivers: FleetDriver[]; taskCount: Map<string, number>;
  presence: Record<string, boolean>;
  selectedDriverId: string | null; onSelect: (id: string) => void; expanded: boolean;
}) {
  const [tab, setTab] = useState<'ON_TRIP' | 'AVAILABLE' | 'OFF_DUTY'>('ON_TRIP');
  const [query, setQuery] = useState('');
  const counts = {
    ON_TRIP: drivers.filter((d) => d.status === 'ON_TRIP').length,
    AVAILABLE: drivers.filter((d) => d.status === 'AVAILABLE').length,
    OFF_DUTY: drivers.filter((d) => d.status === 'OFF_DUTY').length,
  };
  const q = query.trim().toLowerCase();
  const rows = drivers
    .filter((d) => d.status === tab)
    .filter((d) => !q || (d.fullName || '').toLowerCase().includes(q) || (d.code || '').toLowerCase().includes(q) || (d.phone || '').includes(q));

  return (
    <div className={cn('flex w-full flex-col overflow-hidden rounded-xl border bg-card shadow-sm',
      expanded ? 'lg:flex-1' : 'lg:w-80 lg:shrink-0')}>
      <PanelHeader icon={Users} title={t('tracking.drivers.title')} query={query} setQuery={setQuery} placeholder={t('tracking.drivers.search')} />
      <SegTabs
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'ON_TRIP', label: t('tracking.drivers.tabs.busy'), count: counts.ON_TRIP },
          { key: 'AVAILABLE', label: t('tracking.drivers.tabs.available'), count: counts.AVAILABLE },
          { key: 'OFF_DUTY', label: t('tracking.drivers.tabs.offline'), count: counts.OFF_DUTY },
        ]}
      />
      <div className="flex-1 divide-y overflow-y-auto scrollbar-thin">
        {error && rows.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">{t('tracking.loadError')}</p>}
        {!error && rows.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            <Users className="mx-auto mb-2 h-8 w-8 opacity-30" />
            <p className="text-sm">{t('tracking.drivers.empty')}</p>
          </div>
        )}
        {rows.map((d) => {
          const isSelected = d.id === selectedDriverId;
          const located = typeof d.currentLat === 'number' && typeof d.currentLng === 'number';
          const tasks = taskCount.get(d.id) ?? 0;
          return (
            <button
              key={d.id}
              type="button"
              onClick={() => located && onSelect(d.id)}
              disabled={!located}
              className={cn('flex w-full items-center gap-3 px-3 py-2.5 text-start transition-colors',
                isSelected ? 'bg-primary/5' : 'hover:bg-muted/50', !located && 'opacity-60')}
              title={!located ? t('tracking.drivers.noLocation') : undefined}
            >
              <StatusAvatar name={d.fullName || d.code} status={d.status} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{d.fullName || t('tracking.drivers.unnamed')}</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {d.phone ? (
                    <><Phone className="h-3 w-3 shrink-0" /><span className="num truncate" style={{ direction: 'ltr', unicodeBidi: 'plaintext' }}>{d.phone}</span></>
                  ) : (
                    <span className="num truncate" style={{ direction: 'ltr', unicodeBidi: 'plaintext' }}>{d.code}</span>
                  )}
                </div>
                {(() => {
                  const online = presence[d.id] ?? false;
                  const fresh = isFresh(d.lastLocationAt);
                  const color = online ? (fresh ? '#15803D' : '#B45309') : '#9CA3AF';
                  const label = online
                    ? (fresh ? t('tracking.presence.live') : t('tracking.presence.connected'))
                    : t('tracking.presence.offline');
                  const seen = lastSeen(d.lastLocationAt);
                  return (
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11px]">
                      <span className={`inline-block h-2 w-2 rounded-full ${online && fresh ? 'animate-pulse' : ''}`} style={{ background: color }} />
                      <span style={{ color }}>{label}</span>
                      {seen && <span className="num text-muted-foreground" style={{ direction: 'ltr', unicodeBidi: 'plaintext' }}>· {seen}</span>}
                    </div>
                  );
                })()}
                {!located && (
                  <div className="mt-0.5 flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-500">
                    <MapPin className="h-3 w-3" /> {t('tracking.drivers.noLocation')}
                  </div>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1 text-xs">
                <span className="num font-semibold text-primary">{tasks}</span>
                <span className="text-muted-foreground">{t('tracking.tasksWord')}</span>
                <ChevronLeft className="h-4 w-4 text-muted-foreground" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Orders (tasks) panel ─────────────────────────────────────────────
function OrdersPanel({
  t, error, orders, hasDriver, driverNameOf, selectedOrderId, onSelect, selectedOrder,
  detailDriverName, live, onClear, expanded,
}: {
  t: TFn; error: boolean; orders: Order[]; hasDriver: (o: Order) => boolean;
  driverNameOf: (id: string) => string | undefined;
  selectedOrderId: string | null; onSelect: (id: string) => void; selectedOrder: Order | null;
  detailDriverName?: string; live: { speedKmh?: number | null; lastUpdate: string | null } | null;
  onClear: () => void; expanded: boolean;
}) {
  const [tab, setTab] = useState<'ASSIGNED' | 'AWAITING'>('ASSIGNED');
  const [query, setQuery] = useState('');
  const assigned = orders.filter((o) => hasDriver(o));
  const awaiting = orders.filter((o) => !hasDriver(o));
  const q = query.trim().toLowerCase();
  const rows = (tab === 'ASSIGNED' ? assigned : awaiting)
    .filter((o) => !q || o.orderNumber.toLowerCase().includes(q) || o.originCity.toLowerCase().includes(q) || o.destinationCity.toLowerCase().includes(q));

  return (
    <div className={cn('flex w-full flex-col overflow-hidden rounded-xl border bg-card shadow-sm',
      expanded ? 'lg:flex-1' : 'lg:w-80 lg:shrink-0')}>
      <PanelHeader icon={Package} title={t('tracking.orders.title')} query={query} setQuery={setQuery} placeholder={t('tracking.orders.search')} />

      {selectedOrder && (
        <SelectedOrderDetail t={t} order={selectedOrder} driverName={detailDriverName} live={live} onClear={onClear} />
      )}

      <SegTabs
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'ASSIGNED', label: t('tracking.orders.tabs.assigned'), count: assigned.length },
          { key: 'AWAITING', label: t('tracking.orders.tabs.awaiting'), count: awaiting.length },
        ]}
      />
      <div className="flex-1 divide-y overflow-y-auto scrollbar-thin">
        {error && rows.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">{t('tracking.loadError')}</p>}
        {!error && rows.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            <Package className="mx-auto mb-2 h-8 w-8 opacity-30" />
            <p className="text-sm">{tab === 'AWAITING' ? t('tracking.orders.emptyAwaiting') : t('tracking.orders.emptyAssigned')}</p>
          </div>
        )}
        {rows.map((o) => {
          const isSelected = o.id === selectedOrderId;
          const time = hhmm(o.pickupDate);
          const driverName = driverNameOf(o.id);
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onSelect(o.id)}
              className={cn('flex w-full items-center gap-3 px-3 py-2.5 text-start transition-colors',
                isSelected ? 'bg-primary/5' : 'hover:bg-muted/50')}
            >
              <div className="flex w-12 shrink-0 flex-col items-center gap-0.5">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-[hsl(var(--mint))]/12 text-[hsl(var(--mint))]">
                  <Package className="h-3.5 w-3.5" />
                </span>
                {time && <span className="num text-[10px] text-muted-foreground">{time}</span>}
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-0.5 flex items-center gap-2">
                  <span className="num text-xs font-semibold text-primary">{o.orderNumber}</span>
                  <StatusBadge status={o.status} />
                </div>
                <div className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                  <span className="truncate text-foreground">{localizeCity(o.originCity)}</span>
                  <Navigation className="h-3 w-3 shrink-0" />
                  <span className="truncate text-foreground">{localizeCity(o.destinationCity)}</span>
                </div>
                {driverName && (
                  <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Truck className="h-3 w-3 shrink-0" /> <span className="truncate">{driverName}</span>
                  </div>
                )}
              </div>
              <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Selected-order detail (route timeline + live) ────────────────────
function SelectedOrderDetail({ t, order, driverName, live, onClear }: {
  t: TFn; order: Order; driverName?: string;
  live: { speedKmh?: number | null; lastUpdate: string | null } | null; onClear: () => void;
}) {
  const pickupTime = hhmm(order.pickupDate);
  return (
    <div className="border-b bg-primary/5 px-4 py-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="num text-xs font-semibold text-primary">{order.orderNumber}</span>
        <div className="flex items-center gap-2">
          <StatusBadge status={order.status} />
          <button type="button" onClick={onClear} className="rounded p-0.5 text-muted-foreground hover:bg-muted" aria-label={t('tracking.selected.clear')}>
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Two-stop route timeline (pickup → dropoff). */}
      <div className="relative ps-5">
        <span className="absolute start-[6px] top-2 bottom-2 w-px bg-[hsl(var(--mint))]/50" />
        <div className="relative flex items-center justify-between gap-2 pb-2">
          <span className="absolute start-[-14px] top-1 grid h-3 w-3 place-items-center rounded-full border-2 border-primary bg-card" />
          <span className="truncate text-sm font-medium">{localizeCity(order.originCity)}</span>
          {pickupTime && <span className="num shrink-0 text-xs text-muted-foreground">{pickupTime}</span>}
        </div>
        <div className="relative flex items-center justify-between gap-2">
          <span className="absolute start-[-14px] top-1 grid h-3 w-3 place-items-center rounded-full border-2 border-[hsl(var(--mint))] bg-[hsl(var(--mint))]" />
          <span className="truncate text-sm font-medium">{localizeCity(order.destinationCity)}</span>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {driverName && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Truck className="h-3 w-3" /> {driverName}
          </span>
        )}
        {live && (
          <>
            <Badge variant="success" className="flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
              {t('tracking.selected.live')}
            </Badge>
            {live.speedKmh != null && (
              <span className="num inline-flex items-center gap-1 text-xs font-medium text-[hsl(var(--mint))]">
                <Gauge className="h-3 w-3" /> {live.speedKmh} {t('tracking.selected.speedUnit')}
              </span>
            )}
            {live.lastUpdate && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" /> <span className="num">{live.lastUpdate}</span>
              </span>
            )}
          </>
        )}
      </div>
    </div>
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

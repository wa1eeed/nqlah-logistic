'use client';
import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import {
  CheckCircle2, Clock, Flag, MapPin, Navigation, Package, Phone, Star, Truck,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';
import { RouteMap } from '@/components/route-map';
import { StatusBadge } from '@/components/status-badge';
import { openTrackingSocket } from '@/lib/tracking-socket';
import { fetcher } from '@/lib/api';
import {
  CURRENT_CLIENT_ID, activeOrdersForClient, companyById, coordsFor, distanceKm,
  estimatedDurationLabel, formatDateTime, primaryRoadFor, normalizeOrderList, type Order,
} from '@naqla/shared-utils';

export default function TrackingPage() {
  // Live orders from the API (mock fallback when the backend is down).
  const { data: ordersRaw } = useSWR<unknown>('/orders?mine=true&limit=100', fetcher);
  const inTransit = useMemo(() => {
    const api = normalizeOrderList(ordersRaw).filter((o) => o.status === 'IN_TRANSIT' || o.status === 'CONFIRMED');
    if (api.length) return api;
    return activeOrdersForClient(CURRENT_CLIENT_ID).filter((o) => o.status === 'IN_TRANSIT' || o.status === 'CONFIRMED');
  }, [ordersRaw]);
  const [selectedId, setSelectedId] = useState<string | null>(inTransit[0]?.id ?? null);
  const selected = inTransit.find((o) => o.id === selectedId) ?? inTransit[0];

  if (inTransit.length === 0) {
    return (
      <>
        <PageHeader title="التتبع المباشر" subtitle="تابع موقع شحناتك في الوقت الفعلي" />
        <Card>
          <CardContent className="py-20 text-center">
            <Truck className="h-14 w-14 mx-auto mb-4 text-muted-foreground/40" />
            <h3 className="font-semibold">لا توجد شحنات نشطة حاليا</h3>
            <p className="mt-2 text-sm text-muted-foreground">سيظهر هنا التتبع المباشر فور انطلاق أي شاحنة</p>
            <Button asChild className="mt-4">
              <Link href="/orders/new">إنشاء طلب جديد</Link>
            </Button>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="التتبع المباشر"
        subtitle={`${inTransit.length} شحنة قيد التنفيذ`}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
        {/* Left list */}
        <Card className="lg:order-1 order-2">
          <CardHeader>
            <CardTitle className="text-base">الشحنات النشطة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
            {inTransit.map((o) => {
              const isSelected = selected?.id === o.id;
              const carrier = companyById(o.carrierId);
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setSelectedId(o.id)}
                  className={`w-full text-start rounded-lg border p-3 transition-colors ${
                    isSelected ? 'border-primary bg-primary/5' : 'hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-mono text-xs text-primary">{o.orderNumber}</span>
                    <StatusBadge status={o.status} />
                  </div>
                  <div className="text-sm font-medium truncate">{o.originCity} ← {o.destinationCity}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 truncate">{carrier?.nameAr ?? '—'}</div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* Right map+details */}
        {selected && (
          <div className="space-y-6 lg:order-2 order-1">
            <TrackingDetail order={selected} />
          </div>
        )}
      </div>
    </>
  );
}

function TrackingDetail({ order }: { order: any }) {
  const o = coordsFor(order.originCity);
  const d = coordsFor(order.destinationCity);
  const km = distanceKm(o, d);
  const duration = estimatedDurationLabel(km);
  const road = primaryRoadFor(order.originCity, order.destinationCity);
  const base = order.status === 'IN_TRANSIT' ? 0.55 : order.status === 'CONFIRMED' ? 0.1 : 0;

  const isConsolidated = order.orderType === 'CONSOLIDATED';
  // Seed one truck per leg from its status, so a consolidated order tracks
  // every shipment (not just one). Live pings then move each truck by index.
  const { data: legsResp } = useSWR<{ legs?: { index: number; status: string; reference?: string }[] }>(
    isConsolidated ? `/orders/${order.id}/legs` : null, fetcher);
  const seedTrucks = useMemo(() => {
    const arr = legsResp?.legs ?? (order.legs ?? []);
    const seed = (status: string) =>
      status === 'DELIVERED' ? 1 : status === 'IN_TRANSIT' ? 0.15 : status === 'ASSIGNED' ? 0.06 : 0;
    return (arr as { index: number; status: string; reference?: string }[])
      .map((l) => ({ index: l.index, reference: l.reference, progress: seed(l.status) }));
  }, [legsResp, order.legs]);

  // Live data is PUSHED from the tracking socket — GPS fixes, not a page timer.
  // A real WebSocket to the API when available, else a local simulation.
  const [progress, setProgress] = useState(base);
  const [trucks, setTrucks] = useState(seedTrucks);
  const [speed, setSpeed] = useState<number | null>(null);
  const [lastAt, setLastAt] = useState<number | null>(null);
  useEffect(() => { setTrucks(seedTrucks); }, [seedTrucks]);
  useEffect(() => {
    setProgress(base);
    setSpeed(null);
    setLastAt(null);
    if (order.status !== 'IN_TRANSIT') return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('naqla_client_token') ?? undefined : undefined;
    const socket = openTrackingSocket({
      startProgress: base,
      orderId: order.id,
      token,
      onPing: (p) => {
        setSpeed(p.speedKmh); setLastAt(p.at);
        if (p.legs && p.legs.length) {
          const byIdx = new Map(p.legs.map((l) => [l.index, l.progress]));
          setTrucks((prev) => prev.map((t) => (byIdx.has(t.index) ? { ...t, progress: byIdx.get(t.index)! } : t)));
        } else if (typeof p.progress === 'number') {
          setProgress(p.progress);
        }
      },
    });
    return () => socket.close();
  }, [order.id, order.status, base]);

  // Overall progress for the bar/stats: the average of the legs for a
  // consolidated order, else the single shipment's progress.
  const overall = isConsolidated
    ? (trucks.length ? trucks.reduce((s, t) => s + t.progress, 0) / trucks.length : 0)
    : progress;
  const remaining = Math.round(km * (1 - overall));
  const isLive = order.status === 'IN_TRANSIT';
  const lastUpdate = lastAt ? new Date(lastAt).toLocaleTimeString('en-GB') : '—';
  const carrier = companyById(order.carrierId);
  const initials = carrier?.nameAr.split(' ').slice(0, 2).map((w) => w[0]).join('') ?? '';

  return (
    <>
      <Card>
        <RouteMap
          origin={{ ...o, label: order.originCity }}
          destination={{ ...d, label: order.destinationCity }}
          progress={isConsolidated ? undefined : progress}
          trucks={isConsolidated ? trucks : undefined}
          height={420}
          className="rounded-b-none border-b"
        />
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6">
          <Stat icon={MapPin} label="إجمالي المسافة" value={<span className="num">{km.toLocaleString('en-US')} كم</span>} />
          <Stat icon={Truck} label="متبقّي" value={<span className="num text-[hsl(var(--mint))] font-bold">{remaining.toLocaleString('en-US')} كم</span>} />
          <Stat icon={Clock} label="الوصول المتوقّع" value={duration} />
          <Stat icon={Navigation} label="الطريق" value={road} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="h-4 w-4" /> الناقل
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="font-semibold truncate">{carrier?.nameAr ?? '—'}</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span className="num">{carrier?.completedTrips}</span> رحلة ·
                  <Star className="h-3 w-3 fill-[hsl(var(--mint))] text-[hsl(var(--mint))]" />
                  <span className="num">{carrier?.rating?.toFixed(1)}</span>
                </div>
              </div>
              <Button size="sm" variant="outline"><Phone className="h-3.5 w-3.5" /></Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" /> تفاصيل الشحنة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">الوزن</span>
              <span className="font-medium num">{order.weightKg.toLocaleString('en-US')} كجم</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">الاستلام</span>
              <span className="font-medium text-xs">{formatDateTime(order.pickupDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">الطلب</span>
              <Link href={`/orders/${order.id}`} className="font-mono text-xs text-primary">{order.orderNumber}</Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live events timeline */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Navigation className="h-4 w-4" /> خط أحداث التتبّع
            </CardTitle>
            <div className="flex items-center gap-2">
              {isLive && lastAt && (
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>آخر تحديث <span className="num">{lastUpdate}</span></span>
                  {speed != null && (
                    <span className="num font-medium text-[hsl(var(--mint))]">{speed} كم/س</span>
                  )}
                </span>
              )}
              <Badge variant="success" className="flex items-center gap-1">
                <span className="inline-block h-1.5 w-1.5 bg-success rounded-full animate-pulse" />
                مباشر
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-5">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>{isConsolidated ? 'متوسّط تقدّم الشاحنات' : 'التقدّم'}</span>
              <span className="num font-medium">{Math.round(overall * 100)}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-[hsl(var(--mint))] transition-all" style={{ width: `${overall * 100}%` }} />
            </div>
          </div>
          <TrackingTimeline order={order} km={km} progress={overall} road={road} />
        </CardContent>
      </Card>
    </>
  );
}

type TimelineEvent = {
  title: string;
  place: string;
  time: string;
  icon: React.ElementType;
  state: 'done' | 'current' | 'upcoming';
};

function TrackingTimeline({ order, km, progress, road }: { order: any; km: number; progress: number; road: string }) {
  // Estimate each milestone's time from the pickup time + an average speed.
  const totalMs = (km / 75) * 3_600_000;
  const t0 = new Date(order.pickupDate).getTime();
  const at = (f: number) => formatDateTime(new Date(t0 + totalMs * f).toISOString());

  const milestones = [
    { f: 0,    title: 'تم استلام الشحنة',   place: order.originCity,      icon: Package },
    { f: 0.05, title: 'انطلقت الرحلة',       place: order.originCity,      icon: Truck },
    { f: 0.5,  title: 'في منتصف الطريق',     place: road,                  icon: Navigation },
    { f: 0.85, title: 'الاقتراب من الوجهة',  place: order.destinationCity, icon: MapPin },
    { f: 1,    title: 'التسليم المتوقّع',    place: order.destinationCity, icon: Flag },
  ];

  const events: TimelineEvent[] = [];
  milestones.filter((m) => m.f <= progress + 1e-9).forEach((m) =>
    events.push({ title: m.title, place: m.place, time: at(m.f), icon: m.icon, state: 'done' }));
  if (progress > 0 && progress < 1) {
    events.push({ title: 'الموقع الحالي للشاحنة', place: `على ${road}`, time: 'الآن', icon: Navigation, state: 'current' });
  }
  milestones.filter((m) => m.f > progress + 1e-9).forEach((m) =>
    events.push({ title: m.title, place: m.place, time: at(m.f), icon: m.icon, state: 'upcoming' }));

  return (
    <ol className="relative space-y-5 before:absolute before:top-3 before:bottom-3 before:start-[15px] before:w-px before:bg-border">
      {events.map((e, i) => {
        const Icon = e.state === 'done' ? CheckCircle2 : e.icon;
        return (
          <li key={i} className="relative flex items-start gap-3 ps-0">
            <span
              className={`relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full ${
                e.state === 'done'
                  ? 'bg-[hsl(var(--mint))] text-primary'
                  : e.state === 'current'
                    ? 'bg-[hsl(var(--mint))]/15 text-[hsl(var(--mint))] ring-2 ring-[hsl(var(--mint))]'
                    : 'bg-muted text-muted-foreground'
              }`}
            >
              {e.state === 'current' && (
                <span className="absolute inset-0 rounded-full bg-[hsl(var(--mint))]/30 animate-ping" />
              )}
              <Icon className="relative h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex items-center justify-between gap-2">
                <span className={`text-sm font-semibold ${e.state === 'upcoming' ? 'text-muted-foreground' : ''}`}>
                  {e.title}
                </span>
                <span className={`shrink-0 text-xs ${e.state === 'current' ? 'font-semibold text-[hsl(var(--mint))]' : 'text-muted-foreground'} ${e.time !== 'الآن' ? 'num' : ''}`}>
                  {e.time}
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 shrink-0" /> {e.place}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[hsl(var(--mint))]/12 text-[hsl(var(--mint))]">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-0.5 text-sm font-semibold truncate">{value}</div>
      </div>
    </div>
  );
}

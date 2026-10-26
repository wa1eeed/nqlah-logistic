'use client';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowRight, Building2, Calendar, CheckCircle2, Clock, Layers, MapPin, Navigation, Package, Phone,
  ShieldCheck, Snowflake, Timer, Truck, User, Users, Wallet, Weight, type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { StopsPanel } from '@/components/stops-panel';
import useSWR, { useSWRConfig } from 'swr';
import { useTranslations } from 'next-intl';
import { api, fetcher } from '@/lib/api';
import { notify } from '@/lib/notify';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Currency } from '@/components/currency';
import { RouteMap } from '@/components/route-map';
import {
  ORDERS, TRUCKS, DRIVERS, bidsForOrder, companyById, coordsFor, distanceKm, estimatedDurationLabel,
  primaryRoadFor, timelineFor, formatDate, formatDateTime,
  normalizeOrder, COMMISSION_RATE, ESCROW_AUTO_RELEASE_HOURS, escrowAutoReleaseAt,
  escrowBreakdown, escrowMsRemaining, localizeCity, type ConsolidatedLeg,
} from '@naqla/shared-utils';
import { SaudiLicensePlate, parsePlateString } from '@/components/saudi-plate';

const TIMELINE_TITLE_KEYS = [
  'CREATED', 'PUBLISHED', 'BID_RECEIVED', 'BID_ACCEPTED', 'CONFIRMED', 'PICKED_UP',
  'IN_TRANSIT', 'DELIVERED', 'PAYMENT_RELEASED', 'COMPLETED', 'CANCELLED',
] as const;

export default function AdminOrderDetail() {
  const t = useTranslations('orders');
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const TITLES: Record<string, string> = Object.fromEntries(
    TIMELINE_TITLE_KEYS.map((k) => [k, t(`adminDetail.titles.${k}`)]),
  );
  // Real-API source of truth (with mock fallback through the api interceptor).
  // normalizeOrder aliases Prisma field names so the UI doesn't crash on
  // weight/requiredTruckType/_count.bids — same pattern as client/carrier
  // detail pages.
  // SWR is configured to auto-revalidate so the admin sees state transitions
  // (BIDDING → ASSIGNED → IN_TRANSIT → DELIVERED → COMPLETED) without
  // refreshing. 15s polling + on-focus refresh covers operational needs
  // without burning the API.
  const { data: orderData } = useSWR<typeof ORDERS[number] | null>(
    params?.id ? `/orders/${params.id}` : null,
    fetcher,
    { revalidateOnFocus: true, refreshInterval: 15000 },
  );
  const order = normalizeOrder(orderData ?? null) ?? ORDERS.find((o) => o.id === params.id);

  if (!order) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <Package className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="font-semibold">{t('adminDetail.notFound')}</h3>
          <Button onClick={() => router.push('/orders')} className="mt-4">{t('adminDetail.backAlt')}</Button>
        </CardContent>
      </Card>
    );
  }

  const client = companyById(order.clientId);
  const carrier = companyById(order.carrierId);
  type ApiOrderDriver = {
    id: string; assignedAt: string;
    driver: { id: string; status: string; user: { firstName: string; lastName: string; phone: string } };
  };
  const orderDrivers: ApiOrderDriver[] = (order as unknown as { orderDrivers?: ApiOrderDriver[] }).orderDrivers ?? [];
  // Prefer API bids (live data) — fall back to mock for offline demo.
  type ApiBid = { id: string; carrierId: string; status: string; amount?: number; price?: number; estimatedDays?: number; truckType?: string; proposedPickupDate?: string; proposedDeliveryDate?: string };
  const apiBids = (order as unknown as { bids?: ApiBid[] }).bids;
  const bids = (Array.isArray(apiBids) && apiBids.length > 0 ? apiBids : bidsForOrder(order.id)) as ApiBid[];
  const timeline = timelineFor(order.id);
  const accepted = bids.find((b) => b.status === 'ACCEPTED');
  const effectivePickup = accepted?.proposedPickupDate ?? order.pickupDate;
  const effectiveDelivery =
    accepted?.proposedDeliveryDate
    ?? (order as { deliveryDate?: string }).deliveryDate
    ?? null;
  const showShipmentCard = ['ASSIGNED', 'CONFIRMED', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED'].includes(order.status);
  const showEscrow = order.status === 'DELIVERED' && (order.agreedPrice ?? 0) > 0;
  // Assigned truck for this order (demo: prefer the order carrier's on-trip truck).
  const assignedTruck =
    TRUCKS.find((t) => t.carrierId === order.carrierId && t.status === 'ON_TRIP') ??
    TRUCKS.find((t) => t.carrierId === order.carrierId) ??
    TRUCKS.find((t) => t.status === 'ON_TRIP') ??
    TRUCKS[0];
  const assignedPlate = assignedTruck ? parsePlateString(assignedTruck.plateNumber) : null;
  const assignedDriver = assignedTruck ? DRIVERS.find((d) => d.id === assignedTruck.assignedDriverId) : null;
  const deliveredAt = (timeline.find((t) => t.kind === 'DELIVERED')?.at) ?? new Date();

  return (
    <>
      <PageHeader
        eyebrow={t('details')}
        title={order.orderNumber}
        subtitle={`${localizeCity(order.originCity)} ← ${localizeCity(order.destinationCity)} · ${formatDateTime(order.createdAt)}`}
        actions={
          <>
            <StatusBadge status={order.status} />
            <Badge variant={order.mode === 'DIRECT' ? 'warning' : 'secondary'}>
              {order.mode === 'OPEN' ? t('mode.open') : t('mode.direct')}
            </Badge>
            <Button variant="outline" onClick={() => router.push('/orders')}>
              <ArrowRight className="h-4 w-4 rtl:rotate-180" /> {t('adminDetail.back')}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main col */}
        <div className="lg:col-span-2 space-y-6">
          <MapSection order={order} />

          {showShipmentCard && (
            <AdminShipmentStatus
              order={order}
              effectivePickup={effectivePickup}
              effectiveDelivery={effectiveDelivery}
              fromCarrierBid={!!(accepted?.proposedDeliveryDate || accepted?.proposedPickupDate)}
            />
          )}

          {showShipmentCard && params?.id && (
            <StopsPanel
              orderId={params.id as string}
              canExecute
              payment={(order as { payment?: { id: string; collectionMethod: string; collectedAt: string | null } }).payment}
            />
          )}

          {showEscrow && (
            <AdminEscrowSummary deliveredAt={deliveredAt} total={order.agreedPrice ?? 0} />
          )}

          {/* Bids */}
          {bids.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{t('adminDetail.bidsTitle')}</CardTitle>
                  <Badge variant="secondary">{t('bidding.bidsCount', { count: String(bids.length) })}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {bids.map((bid) => {
                  const c = companyById(bid.carrierId);
                  if (!c) return null;
                  return (
                    <div key={bid.id} className="flex items-center gap-3 p-3 rounded-lg border">
                      <Avatar>
                        <AvatarFallback>{c.nameAr.split(' ').slice(0, 2).map((w) => w[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{c.nameAr}</div>
                        <div className="text-xs text-muted-foreground">
                          {t('adminDetail.daysUnit', { days: String(bid.estimatedDays ?? '') })} · {bid.truckType}
                        </div>
                      </div>
                      <Currency amount={bid.price} />
                      <StatusBadge status={bid.status} />
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card>
            <CardHeader><CardTitle>{t('timeline')}</CardTitle></CardHeader>
            <CardContent>
              <ol className="relative">
                {timeline.map((ev, i) => (
                  <li key={i} className="relative ps-8 pb-5 last:pb-0">
                    {i < timeline.length - 1 && (
                      <span aria-hidden className="absolute top-6 bottom-0 start-2.5 w-px bg-border" />
                    )}
                    <span className="absolute start-0 top-1 grid place-items-center h-5 w-5 rounded-full bg-primary border-2 border-background">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
                    </span>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium">{TITLES[ev.kind] ?? ev.kind}</div>
                        {(ev.note || ev.by) && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {ev.note} {ev.by && <span>· {ev.by}</span>}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">{formatDate(ev.at, 'd MMM · HH:mm')}</span>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar col */}
        <div className="space-y-6">
          {client && <PartyCard kind={t('fields.client')} company={client} onClick={() => router.push(`/companies/${client.id}`)} />}
          {carrier && <PartyCard kind={t('fields.carrier')} company={carrier} onClick={() => router.push(`/companies/${carrier.id}`)} />}

          {/* Assigned driver */}
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">{t('adminDetail.assignedDriver')}</CardTitle></CardHeader>
            <CardContent>
              {orderDrivers.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4 shrink-0" />
                  {t('adminDetail.noDriverAssigned')}
                </div>
              ) : (
                <div className="space-y-3">
                  {orderDrivers.map((od) => {
                    const fullName = `${od.driver.user.firstName} ${od.driver.user.lastName}`;
                    const isOnTrip = od.driver.status === 'ON_TRIP';
                    return (
                      <div key={od.id} className="space-y-2">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-muted grid place-items-center shrink-0">
                            <User className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium truncate">{fullName}</div>
                            <a href={`tel:${od.driver.user.phone}`} className="text-xs text-muted-foreground inline-flex items-center gap-1 hover:text-primary num" dir="ltr">
                              <Phone className="h-3 w-3" /> {od.driver.user.phone}
                            </a>
                          </div>
                        </div>
                        <dl className="divide-y text-xs">
                          <div className="flex justify-between py-1.5">
                            <dt className="text-muted-foreground">{t('adminDetail.assignDate')}</dt>
                            <dd>{formatDate(od.assignedAt, 'd MMM · HH:mm')}</dd>
                          </div>
                          <div className="flex justify-between py-1.5 items-center">
                            <dt className="text-muted-foreground">{t('adminDetail.statusLabel')}</dt>
                            <dd>
                              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium
                                ${isOnTrip ? 'bg-warning/15 text-warning' : 'bg-success/15 text-success'}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${isOnTrip ? 'bg-warning' : 'bg-success'}`} />
                                {isOnTrip ? t('adminDetail.onTrip') : t('adminDetail.available')}
                              </span>
                            </dd>
                          </div>
                        </dl>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>{t('adminDetail.shipmentDetails')}</CardTitle></CardHeader>
            <CardContent>
              {/* Consolidated breakdown shows from the start so the admin can
                  assign a carrier per leg (phase 2), not only once shipped. */}
              {order.orderType === 'CONSOLIDATED' && (
                <ConsolidatedReadonly order={order} />
              )}
              {showShipmentCard && order.orderType !== 'CONSOLIDATED' && assignedPlate && (
                <div className="mb-4 rounded-lg border bg-muted/30 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                    <Truck className="h-3.5 w-3.5" /> {t('adminDetail.truckAndDriver')}
                  </div>
                  <div className="flex flex-col items-center gap-1.5">
                    <SaudiLicensePlate
                      letters={assignedPlate.letters}
                      numbers={assignedPlate.numbers}
                      plateType="transport"
                      plateFormat="standard"
                      size="stage"
                    />
                    {assignedTruck && <div className="num text-xs text-muted-foreground">{assignedTruck.code}</div>}
                  </div>
                  {assignedDriver && (
                    <div className="flex items-center gap-3 rounded-md border bg-background p-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[hsl(var(--mint))]/15 text-[hsl(var(--mint))]">
                        <User className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{assignedDriver.fullName}</div>
                        <div className="text-xs text-muted-foreground"><span className="num">{assignedDriver.code}</span> · {t('adminDetail.license', { class: assignedDriver.licenseClass })}</div>
                      </div>
                      <a href={`tel:${assignedDriver.phone}`} dir="ltr" className="num text-xs font-medium text-[hsl(var(--mint))]">{assignedDriver.phone}</a>
                    </div>
                  )}
                </div>
              )}
              <dl className="divide-y">
                <Row label={t('adminDetail.descLabel')} value={order.cargoDescription} />
                <Row label={t('fields.weight')} icon={Weight} value={<span className="num">{t('adminDetail.weightUnit', { weight: order.weightKg.toLocaleString('en-US') })}</span>} />
                <Row label={t('adminDetail.truckType')} icon={Truck} value={order.truckType} />
                <Row label={t('adminDetail.insuranceLabel')} icon={ShieldCheck} value={order.requiresInsurance ? t('adminDetail.required') : '—'} />
                <Row label={t('fields.refrigeration')} icon={Snowflake} value={order.requiresRefrigeration ? t('adminDetail.required') : '—'} />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>{t('adminDetail.routeSchedule')}</CardTitle></CardHeader>
            <CardContent>
              <dl className="divide-y">
                <Row label={t('fields.from')} icon={MapPin} value={localizeCity(order.originCity)} />
                <Row label={t('fields.to')} icon={MapPin} value={localizeCity(order.destinationCity)} />
                <Row label={t('adminDetail.pickupSchedule')} icon={Calendar} value={formatDate(order.pickupDate, 'd MMM · HH:mm')} />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>{t('adminDetail.financials')}</CardTitle></CardHeader>
            <CardContent>
              <dl className="divide-y">
                <Row label={t('adminDetail.clientBudget')} value={<Currency amount={order.clientBudget} />} />
                <Row label={t('adminDetail.agreedPrice')} value={<Currency amount={order.agreedPrice} />} />
                <Row label={t('adminDetail.platformCommission')} value={<Currency amount={order.commission ?? 0} />} />
                <Row label={t('adminDetail.carrierNet')} value={<Currency amount={order.carrierAmount} />} />
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function PartyCard({
  kind, company, onClick,
}: { kind: string; company: { nameAr: string; city: string; id: string }; onClick: () => void }) {
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm font-medium text-muted-foreground">{kind}</CardTitle></CardHeader>
      <CardContent>
        <button onClick={onClick} className="flex items-center gap-3 w-full text-start hover:opacity-80 transition-opacity">
          <Avatar>
            <AvatarFallback>{company.nameAr.split(' ').slice(0, 2).map((w) => w[0]).join('')}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="text-sm font-medium truncate text-primary">{company.nameAr}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Building2 className="h-3 w-3" /> {localizeCity(company.city)}
            </div>
          </div>
        </button>
      </CardContent>
    </Card>
  );
}

function Row({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: any }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <dt className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
        {Icon && <Icon className="h-4 w-4 shrink-0" />}
        <span className="truncate">{label}</span>
      </dt>
      <dd className="text-sm font-medium text-end shrink-0 max-w-[60%] leading-relaxed">{value ?? '—'}</dd>
    </div>
  );
}

function MapSection({ order }: { order: any }) {
  const t = useTranslations('orders');
  const o = coordsFor(order.originCity);
  const d = coordsFor(order.destinationCity);
  const km = distanceKm(o, d);
  const duration = estimatedDurationLabel(km);
  const road = primaryRoadFor(order.originCity, order.destinationCity);
  const progress = order.status === 'IN_TRANSIT' ? 0.55 : order.status === 'DELIVERED' || order.status === 'COMPLETED' ? 1 : undefined;

  // Consolidated orders show every truck on the map, each positioned by its
  // leg status (the client Tracking page moves them live).
  const isConsolidated = order.orderType === 'CONSOLIDATED';
  const { data: legsResp } = useSWR<{ legs?: { index: number; status: string; reference?: string }[] }>(
    isConsolidated ? `/orders/${order.id}/legs` : null, fetcher);
  const trucks = useMemo(() => {
    const arr = legsResp?.legs ?? (order.legs ?? []);
    const seed = (s: string) =>
      s === 'DELIVERED' ? 1 : s === 'IN_TRANSIT' ? 0.5 : s === 'ASSIGNED' ? 0.1 : 0;
    return (arr as { index: number; status: string; reference?: string }[])
      .map((l) => ({ index: l.index, reference: l.reference, progress: seed(l.status) }));
  }, [legsResp, order.legs]);

  return (
    <Card>
      <RouteMap
        origin={{ ...o, label: localizeCity(order.originCity) }}
        destination={{ ...d, label: localizeCity(order.destinationCity) }}
        progress={isConsolidated ? undefined : progress}
        trucks={isConsolidated ? trucks : undefined}
        live={order.status === 'IN_TRANSIT'}
        height={300}
        className="rounded-b-none border-b"
      />
      <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
        <RouteStat icon={MapPin} label={t('adminDetail.distance')} value={<span className="num">{t('adminDetail.distanceUnit', { km: km.toLocaleString('en-US') })}</span>} />
        <RouteStat icon={Timer} label={t('adminDetail.estimatedDuration')} value={duration} />
        <RouteStat icon={Navigation} label={t('adminDetail.mainRoad')} value={road} />
      </CardContent>
    </Card>
  );
}

/**
 * Read-only mirror of the client/carrier "shipment progress" card so admins
 * see the same status + pickup/delivery dates the parties see. No action
 * buttons — admins observe, not operate.
 */
function AdminShipmentStatus({
  order, effectivePickup, effectiveDelivery, fromCarrierBid,
}: {
  order: any;
  effectivePickup: string | undefined;
  effectiveDelivery: string | null;
  fromCarrierBid: boolean;
}) {
  const t = useTranslations('orders');
  const meta: Record<string, { text: string; step: 1 | 2 | 3; tone: 'info' | 'warning' | 'success' }> = {
    ASSIGNED:   { text: t('adminDetail.metaAssigned'),   step: 1, tone: 'info' },
    CONFIRMED:  { text: t('adminDetail.metaConfirmed'),  step: 1, tone: 'info' },
    IN_TRANSIT: { text: t('adminDetail.metaInTransit'),  step: 2, tone: 'warning' },
    DELIVERED:  { text: t('adminDetail.metaDelivered'),  step: 3, tone: 'warning' },
    COMPLETED:  { text: t('status.completed'),           step: 3, tone: 'success' },
  };
  const m = meta[order.status] ?? meta.ASSIGNED;
  const stepClass = (s: 1 | 2 | 3) =>
    s <= m.step
      ? (m.tone === 'success' ? 'bg-success text-success-foreground' : m.tone === 'warning' ? 'bg-warning text-warning-foreground' : 'bg-primary text-primary-foreground')
      : 'bg-muted text-muted-foreground';
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">{t('adminDetail.shipmentStatus')} <StatusBadge status={order.status} /></CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{m.text}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center gap-2">
          {[
            { s: 1 as const, label: t('adminDetail.stepPickup'),  icon: MapPin },
            { s: 2 as const, label: t('status.inTransit'), icon: Truck },
            { s: 3 as const, label: t('adminDetail.stepDelivery'),  icon: CheckCircle2 },
          ].map((step, i, arr) => (
            <div key={step.s} className="flex items-center gap-2 flex-1">
              <div className={`h-9 w-9 rounded-full grid place-items-center shrink-0 ${stepClass(step.s)}`}>
                <step.icon className="h-4 w-4" />
              </div>
              <div className="text-xs font-medium">{step.label}</div>
              {i < arr.length - 1 && <div className={`flex-1 h-0.5 ${step.s < m.step ? 'bg-primary' : 'bg-muted'}`} />}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Calendar className="h-3.5 w-3.5" /> {t('adminDetail.pickupSchedule')}</div>
            <div className="mt-0.5 font-medium">
              {effectivePickup ? formatDate(effectivePickup, 'EEEE d MMM') : '—'}
            </div>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Package className="h-3.5 w-3.5" /> {t('adminDetail.expectedDelivery')}</div>
            <div className="mt-0.5 font-medium">
              {effectiveDelivery ? formatDate(effectiveDelivery, 'EEEE d MMM') : t('adminDetail.tbd')}
            </div>
            {fromCarrierBid && (
              <Badge variant="outline" className="mt-1 h-4 text-[10px]">{t('adminDetail.fromCarrierBid')}</Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Admin-facing escrow summary — same engine as the carrier countdown but
 * framed as "auto-release in X" for observability. Read-only; no action.
 */
function AdminEscrowSummary({ deliveredAt, total }: { deliveredAt: Date | string; total: number }) {
  const t = useTranslations('orders');
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const msLeft = escrowMsRemaining(deliveredAt, now) ?? 0;
  const releaseAt = escrowAutoReleaseAt(deliveredAt)!;
  const breakdown = escrowBreakdown(total);
  const elapsed = ESCROW_AUTO_RELEASE_HOURS * 3600 * 1000 - msLeft;
  const pct = Math.min(100, Math.max(0, (elapsed / (ESCROW_AUTO_RELEASE_HOURS * 3600 * 1000)) * 100));
  const hours = Math.floor(msLeft / 3600000);
  const mins = Math.floor((msLeft % 3600000) / 60000);
  const secs = Math.floor((msLeft % 60000) / 1000);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return (
    <Card className="border-warning/30 bg-warning/[0.04]">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-warning/15 text-warning grid place-items-center shrink-0">
            <Wallet className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base">{t('adminDetail.escrowTitle')}</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t('adminDetail.escrowNote', { hours: String(ESCROW_AUTO_RELEASE_HOURS) })}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="rounded-lg bg-background border p-4">
          <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {t('adminDetail.escrowRemaining')}
          </div>
          <div className="flex items-baseline gap-2 font-mono num" dir="ltr">
            <span className="text-2xl font-bold">{pad(hours)}</span><span className="text-muted-foreground">{t('adminDetail.escrowH')}</span>
            <span className="text-2xl font-bold">{pad(mins)}</span><span className="text-muted-foreground">{t('adminDetail.escrowM')}</span>
            <span className="text-2xl font-bold">{pad(secs)}</span><span className="text-muted-foreground">{t('adminDetail.escrowS')}</span>
          </div>
          <div className="mt-3 h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-warning transition-[width]" style={{ width: `${pct}%` }} aria-hidden />
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            {t('adminDetail.escrowExpected')}{' '}
            <span className="num" dir="ltr">
              {releaseAt.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
        <div className="rounded-lg bg-background border p-4">
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t('adminDetail.escrowOrderValue')}</dt>
              <dd className="font-medium"><Currency amount={breakdown.total} /></dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t('adminDetail.escrowCommission', { pct: String(Math.round(COMMISSION_RATE * 100)) })}</dt>
              <dd className="font-medium text-muted-foreground">−<Currency amount={breakdown.commission} /></dd>
            </div>
            <div className="flex justify-between pt-2 mt-1 border-t font-bold">
              <dt>{t('adminDetail.carrierNet')}</dt>
              <dd className="text-success"><Currency amount={breakdown.carrierAmount} /></dd>
            </div>
          </dl>
        </div>
      </CardContent>
    </Card>
  );
}

function RouteStat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: React.ReactNode }) {
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

const LEG_TONE: Record<ConsolidatedLeg['status'], string> = {
  PENDING: 'bg-muted text-muted-foreground',
  ASSIGNED: 'bg-[hsl(var(--mint))]/15 text-[hsl(var(--mint))]',
  IN_TRANSIT: 'bg-[hsl(var(--mint))]/15 text-[hsl(var(--mint))]',
  DELIVERED: 'bg-[hsl(var(--mint))]/15 text-[hsl(var(--mint))]',
};

/** Read-only consolidated-order breakdown + invoice (client/admin view). */
type ReadonlyLeg = ConsolidatedLeg & { plateNumber?: string; driverName?: string };

function ConsolidatedReadonly({ order }: {
  order: { id: string; orderNumber: string; truckCount?: number; legs?: ConsolidatedLeg[]; agreedPrice: number | null; commission?: number | null };
}) {
  const t = useTranslations('orders');
  const LEG_LABEL: Record<ConsolidatedLeg['status'], string> = {
    PENDING: t('adminDetail.legs.PENDING'),
    ASSIGNED: t('adminDetail.legs.ASSIGNED'),
    IN_TRANSIT: t('adminDetail.legs.IN_TRANSIT'),
    DELIVERED: t('adminDetail.legs.DELIVERED'),
  };
  // Live legs from the API (enriched with plate + driver name); fall back to the
  // mock order legs.
  const { data: legsData } = useSWR<{ truckCount: number; heterogeneous?: boolean; legs: ReadonlyLeg[] }>(`/orders/${order.id}/legs`, fetcher);
  const apiLegs = Array.isArray(legsData?.legs) ? legsData!.legs : null;
  const legs: ReadonlyLeg[] = apiLegs ?? (order.legs ?? []);
  const count = (apiLegs ? legsData!.truckCount : order.truckCount) ?? legs.length;
  const distributed = legs.filter((l) => l.truckId).length;
  const heterogeneous = !!legsData?.heterogeneous;
  // Admin can assign a different carrier to each leg of a heterogeneous order.
  const { mutate } = useSWRConfig();
  const { data: carriersData } = useSWR<Array<{ id: string; nameAr: string }>>(
    heterogeneous ? '/companies?type=CARRIER&limit=100' : null, fetcher);
  const carriers = Array.isArray(carriersData) ? carriersData : [];
  const assignLegCarrier = async (index: number, carrierId: string | null) => {
    try {
      if (carrierId) await api.post(`/orders/${order.id}/legs/${index}/assign-carrier`, { carrierId });
      else await api.delete(`/orders/${order.id}/legs/${index}/carrier`);
      mutate(`/orders/${order.id}/legs`);
      mutate(`/orders/${order.id}`);
    } catch (e) { notify.error(e); }
  };
  // Per-leg bids (phase 2b): view the bids on a leg and award one.
  const [bidsLeg, setBidsLeg] = useState<number | null>(null);
  const { data: legBids } = useSWR<Array<{ id: string; amount: number; carrier?: { nameAr: string }; status: string }>>(
    bidsLeg != null ? `/orders/${order.id}/bids?legIndex=${bidsLeg}` : null, fetcher);
  const acceptLegBid = async (bidId: string) => {
    try {
      await api.post(`/orders/${order.id}/bids/${bidId}/accept`, {});
      setBidsLeg(null);
      mutate(`/orders/${order.id}/legs`);
      mutate(`/orders/${order.id}`);
    } catch (e) { notify.error(e); }
  };
  const legPriceSum = legs.reduce((s, l) => s + (l.price ?? 0), 0);
  const perLeg = Math.round((order.agreedPrice ?? 0) / Math.max(1, count));
  const invoiceTotal = heterogeneous && legPriceSum > 0 ? legPriceSum : (order.agreedPrice ?? 0);
  const pct = count > 0 ? Math.round((distributed / count) * 100) : 0;
  return (
    <div className="mb-4 space-y-3 rounded-lg border bg-muted/30 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
          <Layers className="h-3.5 w-3.5" /> {t('adminDetail.consolidatedTitle', { count: String(count) })}
        </div>
        <span className="num text-xs text-muted-foreground">{t('adminDetail.consolidatedDistributed', { ratio: `${distributed}/${count}` })}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-[hsl(var(--mint))]" style={{ width: `${pct}%` }} />
      </div>
      <div className="space-y-2">
        {legs.map((leg) => {
          const plateStr = leg.plateNumber ?? TRUCKS.find((t) => t.id === leg.truckId)?.plateNumber;
          const driverName = leg.driverName ?? DRIVERS.find((d) => d.id === leg.driverId)?.fullName;
          const plate = plateStr ? parsePlateString(plateStr) : null;
          return (
            <div key={leg.index} className="flex items-center gap-3 rounded-md border bg-background p-2.5">
              <span className="num flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">{leg.index}</span>
              {leg.truckId && plate ? (
                <>
                  <div className="w-[100px] shrink-0"><SaudiLicensePlate letters={plate.letters} numbers={plate.numbers} plateType="transport" size="fill" /></div>
                  <div className="min-w-0 flex-1">
                    {leg.reference && <div className="num font-mono text-[11px] text-foreground truncate" dir="ltr">{leg.reference}</div>}
                    {heterogeneous && (
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground flex-wrap">
                        <Truck className="h-3 w-3" />{leg.requiredTruckType}
                        {leg.destinationCity && <>· <MapPin className="h-3 w-3" />{localizeCity(leg.destinationCity)}</>}
                      </div>
                    )}
                    {driverName
                      ? <div className="flex items-center gap-1 text-xs text-muted-foreground"><Users className="h-3 w-3" /> {driverName}</div>
                      : <div className="text-xs text-muted-foreground">{t('adminDetail.noDriver')}</div>}
                  </div>
                </>
              ) : (
                <div className="min-w-0 flex-1">
                  {leg.reference && <div className="num font-mono text-[11px] text-foreground truncate" dir="ltr">{leg.reference}</div>}
                  {heterogeneous && (
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground flex-wrap">
                      <Truck className="h-3 w-3" />{leg.requiredTruckType}
                      {leg.destinationCity && <>· <MapPin className="h-3 w-3" />{localizeCity(leg.destinationCity)}</>}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">{t('adminDetail.notAssignedYet')}</div>
                </div>
              )}
              {heterogeneous && leg.price != null && (
                <span className="shrink-0 text-xs font-semibold"><Currency amount={leg.price} /></span>
              )}
              {heterogeneous && !leg.carrierId && (leg.bidCount ?? 0) > 0 && (
                <Button size="sm" variant="outline" className="h-7 shrink-0 text-xs" onClick={() => setBidsLeg(leg.index)}>
                  {t('adminDetail.legCarrier.bids', { count: String(leg.bidCount) })}
                </Button>
              )}
              {heterogeneous && (
                <Select
                  value={leg.carrierId ?? 'none'}
                  onValueChange={(v) => assignLegCarrier(leg.index, v === 'none' ? null : v)}
                  disabled={leg.status === 'IN_TRANSIT' || leg.status === 'DELIVERED'}
                >
                  <SelectTrigger className="h-7 w-[150px] shrink-0 text-xs"><SelectValue placeholder={t('adminDetail.legCarrier.assign')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('adminDetail.legCarrier.none')}</SelectItem>
                    {carriers.map((c) => <SelectItem key={c.id} value={c.id}>{c.nameAr}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${LEG_TONE[leg.status]}`}>{LEG_LABEL[leg.status]}</span>
            </div>
          );
        })}
      </div>
      <div className="rounded-md border bg-background p-3 text-sm">
        <div className="mb-1 font-semibold">{t('adminDetail.consolidatedInvoice')}</div>
        {heterogeneous ? (
          <div className="flex justify-between text-muted-foreground"><span className="num">{count}</span><span className="text-[11px]">{t('adminDetail.perLegPricing')}</span></div>
        ) : (
          <div className="flex justify-between text-muted-foreground"><span className="num">{t('adminDetail.trucksMultiplier', { count: String(count) })}</span><Currency amount={perLeg} /></div>
        )}
        <div className="mt-1 flex justify-between border-t pt-1 font-semibold"><span>{t('adminDetail.total')}</span><Currency amount={invoiceTotal} /></div>
        <p className="mt-1 text-[11px] text-muted-foreground">{t('adminDetail.singleInvoice', { orderNumber: order.orderNumber })}</p>
      </div>

      {/* Per-leg bids — award one to assign the leg's carrier. */}
      <Dialog open={bidsLeg != null} onOpenChange={(o) => { if (!o) setBidsLeg(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('adminDetail.legCarrier.bidsTitle', { index: String(bidsLeg ?? '') })}</DialogTitle>
            <DialogDescription>{t('adminDetail.legCarrier.bidsDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-1">
            {(legBids ?? []).length === 0 && <div className="py-6 text-center text-sm text-muted-foreground">{t('adminDetail.legCarrier.noBids')}</div>}
            {(legBids ?? []).map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-3 rounded-lg border p-2.5">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{b.carrier?.nameAr ?? '—'}</div>
                  <div className="text-xs text-muted-foreground"><Currency amount={b.amount} /></div>
                </div>
                {b.status === 'PENDING'
                  ? <Button size="sm" className="shrink-0" onClick={() => acceptLegBid(b.id)}>{t('adminDetail.legCarrier.award')}</Button>
                  : <span className="shrink-0 text-xs text-muted-foreground">{b.status}</span>}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

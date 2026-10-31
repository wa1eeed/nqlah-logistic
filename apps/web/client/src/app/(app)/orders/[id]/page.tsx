'use client';
import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { fetcher, api } from '@/lib/api';
import { useConfirm } from '@/components/confirm';
import {
  AlertTriangle, ArrowRight, BadgeCheck, Calendar, CheckCircle2, Layers, MapPin, MessageSquare,
  Package, Phone, ShieldCheck, Shield, Snowflake, Star, Timer, Truck, User, Users, UserSearch,
  Weight, X, Navigation,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/page-header';
import { SaudiLicensePlate, SaudiPlate, parsePlateString } from '@/components/saudi-plate';
import { StatusBadge } from '@/components/status-badge';
import { Currency } from '@/components/currency';
import { RouteMap } from '@/components/route-map';
import { EscrowCountdown } from '@/components/escrow-countdown';
import { playSoundIfEnabled } from '@/lib/sound';
import { notify } from '@/lib/notify';
import {
  BIDS, DRIVERS, ORDERS, TRUCKS, bidsForOrder, companyById, coordsFor, distanceKm,
  estimatedDurationLabel, primaryRoadFor, formatDate, formatDateTime, formatRelative,
  lastRound, proposalForOrder, timelineFor,
  cancellationPolicy, escrowBreakdown, COMMISSION_RATE, pickupWindowLabel, estimateDeliveryDate,
  normalizeOrder, localizeCity,
  type DirectProposal, type Order, type ConsolidatedLeg,
} from '@naqla/shared-utils';

// Maps enum → i18n key path (under the `orders` namespace). A helper resolves
// the key via `t`, falling back to the raw enum value when unknown.
const TRUCK_LABELS: Record<string, string> = {
  SMALL_VAN: 'detail.truckLabels.SMALL_VAN', BOX_TRUCK: 'detail.truckLabels.BOX_TRUCK', MEDIUM_FLATBED: 'detail.truckLabels.MEDIUM_FLATBED',
  LARGE_FLATBED: 'detail.truckLabels.LARGE_FLATBED', REFRIGERATED: 'detail.truckLabels.REFRIGERATED', TANKER: 'detail.truckLabels.TANKER',
  LOWBED: 'detail.truckLabels.LOWBED', CONTAINER_TRAILER: 'detail.truckLabels.CONTAINER_TRAILER',
};
const CARGO_LABELS: Record<string, string> = {
  GENERAL: 'detail.cargoLabels.GENERAL', FRAGILE: 'detail.cargoLabels.FRAGILE', PERISHABLE: 'detail.cargoLabels.PERISHABLE',
  HAZARDOUS: 'detail.cargoLabels.HAZARDOUS', OVERSIZED: 'detail.cargoLabels.OVERSIZED', CONSTRUCTION: 'detail.cargoLabels.CONSTRUCTION',
  AUTOMOTIVE: 'detail.cargoLabels.AUTOMOTIVE', LIVESTOCK: 'detail.cargoLabels.LIVESTOCK',
};
const TITLES: Record<string, string> = {
  CREATED: 'detail.titles.CREATED', PUBLISHED: 'detail.titles.PUBLISHED', BID_RECEIVED: 'detail.titles.BID_RECEIVED',
  BID_ACCEPTED: 'detail.titles.BID_ACCEPTED', CONFIRMED: 'detail.titles.CONFIRMED', PICKED_UP: 'detail.titles.PICKED_UP',
  IN_TRANSIT: 'detail.titles.IN_TRANSIT', DELIVERED: 'detail.titles.DELIVERED',
  PAYMENT_RELEASED: 'detail.titles.PAYMENT_RELEASED', COMPLETED: 'detail.titles.COMPLETED', CANCELLED: 'detail.titles.CANCELLED',
};

type SortKey = 'price' | 'rating' | 'days';

/** Days between two date-ish values; rounded toward zero. Returns 0 if either is missing. */
function dayDiff(later: string | Date | undefined, earlier: string | Date | undefined): number {
  if (!later || !earlier) return 0;
  const ms = new Date(later).getTime() - new Date(earlier).getTime();
  return Math.round(ms / 86_400_000);
}

export default function ClientOrderDetail() {
  const t = useTranslations('orders');
  const tc = useTranslations('common');
  const confirm = useConfirm();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  // Real-API source of truth (with mock fallback via the api interceptor).
  // We still hold `ORDERS.find(...)` as a final fallback for offline UI demos.
  // The API response uses Prisma field names (weight, requiredTruckType,
  // _count.bids) — `normalizeOrder` aliases them onto the mock shape the UI
  // was written against, so accessing `order.weightKg` / `order.truckType`
  // no longer crashes when the backend wins the race.
  const { data: orderData, mutate: refetchOrder } = useSWR<Order>(
    params?.id ? `/orders/${params.id}` : null,
    fetcher,
  );
  const order = (normalizeOrder(orderData) ?? ORDERS.find((o) => o.id === params.id)) as Order | undefined;

  // ─── Hooks — MUST be declared unconditionally, BEFORE any early return ────
  // Otherwise React throws "Rendered more hooks than during the previous
  // render" because the first render (order=undefined) takes the early return
  // path with fewer hooks than the second render (order=defined). All hooks
  // below tolerate order being undefined.
  const [sort, setSort] = useState<SortKey>('price');
  const [acceptBid, setAcceptBid] = useState<typeof BIDS[number] | null>(null);
  // Dedicated state for the "تفاصيل" details dialog. Separate from
  // `acceptBid` so the dialog can show without triggering the accept flow.
  const [detailsBid, setDetailsBid] = useState<typeof BIDS[number] | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [confirmDeliveryOpen, setConfirmDeliveryOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelReasonText, setCancelReasonText] = useState('');

  // Prefer bids from the API response (live data — backend `findById()` includes
  // them via Prisma relation). Falls back to mock `bidsForOrder()` only when
  // the API isn't reachable + mock data is being served instead.
  const bids = useMemo(() => {
    if (!order) return [];
    const apiBids = (order as Order & { bids?: typeof BIDS }).bids;
    if (Array.isArray(apiBids) && apiBids.length > 0) return apiBids;
    return bidsForOrder(order.id);
  }, [order]);
  const timeline = useMemo(() => (order ? timelineFor(order.id) : []), [order]);

  const sortedBids = useMemo(() => {
    const arr = [...bids];
    // `bid.price` is set by normalizeBid (aliases API field `amount` → mock field `price`).
    // For rating sort we look at embedded `bid.carrier` first (live API), then mock fallback.
    const carrierOf = (bid: typeof BIDS[number]) =>
      (bid as typeof bid & { carrier?: { rating?: number } }).carrier ?? companyById(bid.carrierId);
    if (sort === 'price')  arr.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    if (sort === 'rating') arr.sort((a, b) => (carrierOf(b)?.rating ?? 0) - (carrierOf(a)?.rating ?? 0));
    if (sort === 'days')   arr.sort((a, b) => (a.estimatedDays ?? 0) - (b.estimatedDays ?? 0));
    return arr;
  }, [bids, sort]);

  // ─── Early return — ONLY after all hooks have been called ────────────────
  if (!order) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <Package className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="font-semibold">{t('detail.notFound')}</h3>
          <Button onClick={() => router.push('/orders')} className="mt-4">{t('detail.backToOrders')}</Button>
        </CardContent>
      </Card>
    );
  }

  const showBidComparison = order.status === 'BIDDING' && order.mode === 'OPEN';
  const showWaiting = order.status === 'PUBLISHED' && order.mode === 'DIRECT';
  // DELIVERED orders show the 72h escrow countdown until auto-release.
  // For the prototype we treat the most recent timeline event's `at` as the
  // delivery timestamp; in production this would be `order.deliveredAt`.
  const showEscrowCountdown = order.status === 'DELIVERED';
  const deliveredAt = (timeline.find((t) => t.kind === 'DELIVERED')?.at) ?? new Date();

  return (
    <>
      <PageHeader
        title={order.orderNumber}
        subtitle={`${localizeCity(order.originCity)} ← ${localizeCity(order.destinationCity)} · ${formatDateTime(order.createdAt)}`}
        actions={
          <>
            <StatusBadge status={order.status} />
            <OrderActionButtons
              order={order}
              onCancel={() => setCancelOpen(true)}
              onConfirmDelivery={() => setConfirmDeliveryOpen(true)}
              onOpenDispute={() => router.push('/disputes')}
            />
            <Button variant="outline" onClick={() => router.push('/orders')}>
              <ArrowRight className="h-4 w-4 rtl:rotate-180" /> {t('detail.back')}
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <MapSection order={order} />

          {order.carrierId && <CarrierInfoCard order={order} />}

          {/* Status + pickup→delivery progress card. Visible once the order
              has a carrier assigned. Surfaces what the customer cares about
              most after acceptance: where is my shipment + when does it arrive? */}
          {['ASSIGNED', 'CONFIRMED', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED'].includes(order.status) && (
            <ShipmentProgressCard order={order} bids={bids} />
          )}

          {showEscrowCountdown && (
            <EscrowCountdown
              deliveredAt={deliveredAt}
              total={order.agreedPrice ?? 0}
              onConfirmEarly={() => setConfirmDeliveryOpen(true)}
            />
          )}

          {showWaiting && <DirectProposalView order={order} onRefetch={refetchOrder} />}

          {showBidComparison && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle>{t('detail.bids.title')}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">{bids.length} {t('detail.bids.subtitle')}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-muted-foreground me-1">{t('detail.bids.sortBy')}</span>
                    {[
                      { k: 'price' as const,  l: t('detail.bids.cheapest') },
                      { k: 'rating' as const, l: t('detail.bids.topRated') },
                      { k: 'days' as const,   l: t('detail.bids.fastest') },
                    ].map((s) => (
                      <Button
                        key={s.k}
                        size="sm"
                        variant={sort === s.k ? 'default' : 'ghost'}
                        onClick={() => setSort(s.k)}
                      >
                        {s.l}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {sortedBids.map((bid, i) => {
                  // Prefer the embedded `bid.carrier` from the API response (live data).
                  // Fall back to `companyById` for mock-data demos where the carrier
                  // lookup still has to walk the mock COMPANIES array.
                  type ExpandedBid = typeof bid & {
                    carrier?: { id: string; nameAr: string; logo?: string | null; city?: string; rating?: number; completedTrips?: number; responseTimeMins?: number; insurance?: boolean };
                  };
                  const embeddedCarrier = (bid as ExpandedBid).carrier;
                  const fallbackCarrier = companyById(bid.carrierId);
                  const c = (embeddedCarrier ?? fallbackCarrier) as NonNullable<typeof fallbackCarrier> | undefined;
                  if (!c) return null;
                  const isBest = sort === 'price' && i === 0;
                  return (
                    <div key={bid.id} className="p-4 rounded-lg border hover:border-primary/40 transition-colors">
                      <div className="flex items-start gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback>{(c.nameAr ?? '').split(' ').slice(0, 2).map((w) => w[0] ?? '').join('')}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold">{c.nameAr}</h4>
                            {isBest && <Badge variant="success">{t('detail.bids.cheapest')}</Badge>}
                            {c.insurance && <Badge variant="default">{t('detail.bids.insurance')}</Badge>}
                          </div>
                          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                            <span className="inline-flex items-center gap-1">
                              <Star className="h-3 w-3 fill-warning text-warning" />
                              <span className="num">{c.rating?.toFixed(1)}</span>
                              <span>(<span className="num">{c.completedTrips}</span> {t('detail.tripsWord')})</span>
                            </span>
                            <span>· {localizeCity(c.city)}</span>
                            <span>· {t('detail.bids.responsePrefix')} <span className="num">{c.responseTimeMins}</span> {t('detail.minUnit')}</span>
                            <span>· {bid.truckType && TRUCK_LABELS[bid.truckType] ? t(TRUCK_LABELS[bid.truckType]) : bid.truckType}</span>
                          </div>
                          {bid.notes && (
                            <p className="mt-2 text-sm bg-muted/50 rounded-md p-2.5">&ldquo;{bid.notes}&rdquo;</p>
                          )}
                          {/* Prominent alerts when the carrier proposed dates that differ
                              from what the client asked for. Visible above the ETA card so
                              the client can't miss the change before accepting. */}
                          {bid.proposedPickupDate && bid.proposedPickupDate !== order.pickupDate && (
                            <div className="mt-3 rounded-md border-2 border-warning/40 bg-warning/[0.06] p-3 text-sm flex items-start gap-2">
                              <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                              <div>
                                <span className="font-semibold">{t('detail.bids.altPickupProposed')}</span>
                                {formatDate(bid.proposedPickupDate, 'EEEE d MMM')}
                                {(() => {
                                  const d = dayDiff(bid.proposedPickupDate, order.pickupDate);
                                  if (d === 0) return null;
                                  const unit = Math.abs(d) === 1 ? t('detail.unit.day') : t('detail.unit.days');
                                  return (
                                    <span className="ms-1 text-xs text-muted-foreground">
                                      {d > 0 ? t('detail.bids.afterYourDate', { count: String(d), unit }) : t('detail.bids.beforeYourDate', { count: String(Math.abs(d)), unit })}
                                    </span>
                                  );
                                })()}
                              </div>
                            </div>
                          )}
                          {bid.proposedDeliveryDate && order.deliveryDate && bid.proposedDeliveryDate !== order.deliveryDate && (
                            <div className="mt-2 rounded-md border-2 border-warning/40 bg-warning/[0.06] p-3 text-sm flex items-start gap-2">
                              <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                              <div>
                                <span className="font-semibold">{t('detail.bids.altDeliveryProposed')}</span>
                                {formatDate(bid.proposedDeliveryDate, 'EEEE d MMM')}
                                {(() => {
                                  const d = dayDiff(bid.proposedDeliveryDate, order.deliveryDate);
                                  if (d === 0) return null;
                                  const unit = Math.abs(d) === 1 ? t('detail.unit.day') : t('detail.unit.days');
                                  return (
                                    <span className="ms-1 text-xs text-muted-foreground">
                                      {d > 0 ? t('detail.bids.afterYourDate', { count: String(d), unit }) : t('detail.bids.beforeYourDate', { count: String(Math.abs(d)), unit })}
                                    </span>
                                  );
                                })()}
                              </div>
                            </div>
                          )}
                          {/* ETA card — at-a-glance pickup + delivery */}
                          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs rounded-md border bg-muted/20 p-2.5">
                            <div>
                              <div className="text-muted-foreground">{t('detail.bids.pickup')}</div>
                              <div className="font-medium">
                                {formatDate(bid.proposedPickupDate ?? order.pickupDate, 'EEEE d MMM')}
                                {order.pickupWindow && <span className="ms-1 text-muted-foreground">· {pickupWindowLabel(order.pickupWindow).split(' ')[1]}</span>}
                              </div>
                            </div>
                            <div>
                              <div className="text-muted-foreground">{t('detail.bids.expectedDelivery')}</div>
                              <div className="font-medium">
                                {bid.proposedDeliveryDate
                                  ? formatDate(bid.proposedDeliveryDate, 'EEEE d MMM')
                                  : (order.deliveryDate
                                      ? formatDate(order.deliveryDate, 'EEEE d MMM')
                                      : (bid.estimatedDays
                                          ? formatDate(
                                              estimateDeliveryDate(
                                                bid.proposedPickupDate ?? order.pickupDate,
                                                bid.estimatedDays,
                                                bid.estimatedHours ?? 0,
                                              ),
                                              'EEEE d MMM',
                                            )
                                          : t('detail.toBeDetermined')))}
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-baseline gap-3">
                              <div className="text-xl font-bold num">{(bid.price ?? 0).toLocaleString('en-US')}</div>
                              <span className="text-xs text-muted-foreground">{t('detail.sar')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button variant="outline" onClick={() => setDetailsBid(bid)}>{t('detail.bids.detailsBtn')}</Button>
                              <Button onClick={() => setAcceptBid(bid)}>{t('detail.bids.acceptThis')}</Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Show the standalone timeline only when there's no other status surface
              (i.e. order is in DRAFT/PUBLISHED/BIDDING/CANCELLED). For ASSIGNED+
              the timeline is folded into ShipmentProgressCard above. */}
          {!showBidComparison && !showWaiting && !['ASSIGNED', 'CONFIRMED', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED'].includes(order.status) && (
            <Card>
              <CardHeader><CardTitle>{t('timeline')}</CardTitle></CardHeader>
              <CardContent>
                <ol className="relative">
                  {timeline.map((ev, i) => (
                    <li key={i} className="relative ps-8 pb-5 last:pb-0">
                      {i < timeline.length - 1 && <span aria-hidden className="absolute top-6 bottom-0 start-2.5 w-px bg-border" />}
                      <span className="absolute start-0 top-1 grid place-items-center h-5 w-5 rounded-full bg-primary border-2 border-background">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
                      </span>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium">{TITLES[ev.kind] ? t(TITLES[ev.kind]) : ev.kind}</div>
                          {(ev.note || ev.by) && <div className="text-xs text-muted-foreground mt-0.5">{ev.note} {ev.by && `· ${ev.by}`}</div>}
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">{formatDate(ev.at, 'd MMM · HH:mm')}</span>
                      </div>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>{t('detail.shipmentDetails')}</CardTitle></CardHeader>
            <CardContent>
              <dl className="divide-y">
                {/* Defensive `??` everywhere — order shape may originate from the
                    API (Prisma fields), the mock data (`weightKg` / `truckType`),
                    or the normalizer's pass-through when input fields are missing.
                    Wrapping in `?? 0`/`?? '—'` ensures we never call `.toLocaleString`
                    on undefined or pass an empty key into a labels map. */}
                <Row label={t('detail.fields.cargoType')} icon={Package} value={(order.cargoType && CARGO_LABELS[order.cargoType] ? t(CARGO_LABELS[order.cargoType]) : order.cargoType) || '—'} />
                <Row label={t('detail.fields.description')} value={order.cargoDescription || '—'} />
                <Row label={t('detail.fields.weight')} icon={Weight} value={<span className="num">{((order.weightKg ?? 0)).toLocaleString('en-US')} {t('tracking.kgUnit')}</span>} />
                <Row label={t('detail.fields.truckType')} icon={Truck} value={(order.truckType && TRUCK_LABELS[order.truckType] ? t(TRUCK_LABELS[order.truckType]) : order.truckType) || '—'} />
                <Row label={t('detail.fields.insurance')} icon={ShieldCheck} value={order.requiresInsurance ? t('detail.required') : '—'} />
                <Row label={t('detail.fields.refrigeration')} icon={Snowflake} value={order.requiresRefrigeration ? t('detail.required') : '—'} />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>{t('detail.routeTitle')}</CardTitle></CardHeader>
            <CardContent>
              <dl className="divide-y">
                <Row label={t('detail.fields.from')} icon={MapPin} value={`${localizeCity(order.originCity)} — ${order.originAddress}`} />
                <Row label={t('detail.fields.to')} icon={MapPin} value={`${localizeCity(order.destinationCity)} — ${order.destinationAddress}`} />
                <Row label={t('detail.fields.pickupDate')} icon={Calendar} value={formatDate(order.pickupDate, 'EEEE d MMM · HH:mm')} />
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Accept bid confirmation */}
      <Dialog open={!!acceptBid} onOpenChange={(o) => !o && setAcceptBid(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('detail.accept.title')}</DialogTitle>
            <DialogDescription>{t('detail.accept.desc')}</DialogDescription>
          </DialogHeader>
          {acceptBid && (() => {
            const carrier = (acceptBid as typeof acceptBid & { carrier?: { id: string; nameAr: string; logo?: string | null; rating?: number; completedTrips?: number } }).carrier
              ?? companyById(acceptBid.carrierId);
            return (
              <div className="space-y-3 py-2">
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>{(carrier?.nameAr ?? '').split(' ').slice(0, 2).map((w) => w[0] ?? '').join('')}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="font-semibold">{carrier?.nameAr}</div>
                      <div className="text-xs text-muted-foreground">
                        <Star className="h-3 w-3 inline fill-warning text-warning" /> {carrier?.rating?.toFixed(1)} · <span className="num">{carrier?.completedTrips}</span> {t('detail.tripsWord')}
                      </div>
                    </div>
                  </div>
                  <dl className="space-y-1.5 text-sm pt-2 border-t">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">{t('detail.accept.price')}</dt>
                      <dd className="font-bold"><Currency amount={acceptBid.price} /></dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">{t('detail.estimatedDuration')}</dt>
                      <dd className="font-medium num">{acceptBid.estimatedDays} {acceptBid.estimatedDays === 1 ? t('detail.unit.day') : t('detail.unit.days')}</dd>
                    </div>
                  </dl>
                </div>
                <div className="rounded-md bg-info/10 border border-info/30 p-3 flex items-start gap-2 text-xs">
                  <ShieldCheck className="h-4 w-4 text-info shrink-0 mt-0.5" />
                  <p className="text-muted-foreground leading-relaxed">
                    {t('detail.accept.escrowNote')}
                  </p>
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcceptBid(null)}>{tc('buttons.cancel')}</Button>
            <Button
              onClick={async () => {
                if (!acceptBid || !order) return;
                try {
                  // POST /orders/:orderId/bids/:bidId/accept — atomic on the backend:
                  //   • this bid → ACCEPTED
                  //   • other bids → REJECTED
                  //   • order → ASSIGNED with agreedPrice + commission
                  //   • Payment row created in HELD state
                  await api.post(`/orders/${order.id}/bids/${acceptBid.id}/accept`, {});
                  notify.success(t('detail.toast.bidAccepted'), t('detail.toast.bidAcceptedDesc'));
                  await refetchOrder();
                  setAcceptBid(null);
                } catch (err: unknown) {
                  notify.error(err, t('detail.toast.bidAcceptFailed'));
                }
              }}
            >
              <CheckCircle2 className="h-4 w-4" /> {t('detail.accept.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bid details dialog — opens from "تفاصيل" on a bid row. Shows the
          carrier card + ETA + notes, and offers accept/reject/close so the
          client can decide without leaving the order page. */}
      <Dialog open={!!detailsBid} onOpenChange={(o) => !o && setDetailsBid(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('detail.bidDetails.title')}</DialogTitle>
            <DialogDescription>{t('detail.bidDetails.desc')}</DialogDescription>
          </DialogHeader>
          {detailsBid && (() => {
            const carrier = (detailsBid as typeof detailsBid & { carrier?: { id: string; nameAr: string; logo?: string | null; rating?: number; completedTrips?: number; city?: string; responseTimeMins?: number; insurance?: boolean } }).carrier
              ?? companyById(detailsBid.carrierId);
            const pickupDiff = dayDiff(detailsBid.proposedPickupDate, order.pickupDate);
            const deliveryDiff = dayDiff(detailsBid.proposedDeliveryDate, order.deliveryDate);
            return (
              <div className="space-y-3 py-2">
                {/* Carrier card */}
                <div className="rounded-lg border bg-muted/30 p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback>{(carrier?.nameAr ?? '').split(' ').slice(0, 2).map((w) => w[0] ?? '').join('')}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">{carrier?.nameAr}</div>
                      <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-2 mt-0.5">
                        <span className="inline-flex items-center gap-1">
                          <Star className="h-3 w-3 fill-warning text-warning" />
                          <span className="num">{carrier?.rating?.toFixed(1) ?? '—'}</span>
                          {carrier?.completedTrips != null && <span>(<span className="num">{carrier.completedTrips}</span> {t('detail.tripsWord')})</span>}
                        </span>
                        {carrier?.city && <span>· {localizeCity(carrier.city)}</span>}
                        {carrier?.insurance && <Badge variant="default" className="h-4 text-[10px] gap-1"><Shield className="h-3 w-3" /> {t('detail.bids.insurance')}</Badge>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Price row */}
                <div className="rounded-lg border bg-card p-3 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t('detail.bidDetails.offeredPrice')}</span>
                  <span className="text-xl font-bold num">
                    {(detailsBid.price ?? 0).toLocaleString('en-US')}
                    <span className="ms-1 text-xs text-muted-foreground">{t('detail.sar')}</span>
                  </span>
                </div>

                {/* Pickup + delivery rows with diff highlight */}
                <div className="rounded-lg border bg-card p-3 space-y-2 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs text-muted-foreground">{t('detail.bids.pickup')}</div>
                      <div className="font-medium">{formatDate(detailsBid.proposedPickupDate ?? order.pickupDate, 'EEEE d MMM')}</div>
                    </div>
                    {detailsBid.proposedPickupDate && detailsBid.proposedPickupDate !== order.pickupDate && (
                      <Badge variant="warning" className="text-[10px] shrink-0">
                        {t('detail.bidDetails.altDate')} {pickupDiff !== 0 && `· ${pickupDiff > 0 ? '+' : ''}${pickupDiff} ${Math.abs(pickupDiff) === 1 ? t('detail.unit.day') : t('detail.unit.days')}`}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-start justify-between gap-3 pt-2 border-t">
                    <div>
                      <div className="text-xs text-muted-foreground">{t('detail.bids.expectedDelivery')}</div>
                      <div className="font-medium">
                        {detailsBid.proposedDeliveryDate
                          ? formatDate(detailsBid.proposedDeliveryDate, 'EEEE d MMM')
                          : (order.deliveryDate ? formatDate(order.deliveryDate, 'EEEE d MMM') : t('detail.toBeDetermined'))}
                      </div>
                    </div>
                    {detailsBid.proposedDeliveryDate && order.deliveryDate && detailsBid.proposedDeliveryDate !== order.deliveryDate && (
                      <Badge variant="warning" className="text-[10px] shrink-0">
                        {t('detail.bidDetails.altDate')} {deliveryDiff !== 0 && `· ${deliveryDiff > 0 ? '+' : ''}${deliveryDiff} ${Math.abs(deliveryDiff) === 1 ? t('detail.unit.day') : t('detail.unit.days')}`}
                      </Badge>
                    )}
                  </div>
                </div>

                {detailsBid.notes && (
                  <div className="rounded-md bg-muted/40 p-3 text-sm">
                    <div className="text-xs text-muted-foreground mb-1">{t('detail.bidDetails.carrierNotes')}</div>
                    {detailsBid.notes}
                  </div>
                )}
              </div>
            );
          })()}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDetailsBid(null)}
              aria-label={tc('buttons.close')}
            >
              <X className="h-4 w-4" /> {tc('buttons.close')}
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                if (!detailsBid || !order) return;
                const ok = await confirm({
                  title: 'رفض العرض',
                  description: 'سيتم رفض هذا العرض وإشعار الناقل، ولن يظهر ضمن العروض المقدّمة. تبقى بقية العروض كما هي ويمكنك قبول غيره.',
                  confirmLabel: 'رفض العرض',
                  destructive: true,
                });
                if (!ok) return;
                try {
                  await api.post(`/orders/${order.id}/bids/${detailsBid.id}/reject`, {});
                  notify.success(t('detail.toast.bidRejected'));
                  await refetchOrder();
                  setDetailsBid(null);
                } catch (err: unknown) {
                  notify.error(err, t('detail.toast.bidRejectFailed'));
                }
              }}
            >
              <X className="h-4 w-4" /> {t('detail.reject')}
            </Button>
            <Button
              onClick={() => {
                if (!detailsBid) return;
                setAcceptBid(detailsBid);
                setDetailsBid(null);
              }}
            >
              <CheckCircle2 className="h-4 w-4" /> {t('detail.acceptShort')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel order */}
      <CancelOrderDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        order={order}
        reason={cancelReason}
        setReason={setCancelReason}
        reasonText={cancelReasonText}
        setReasonText={setCancelReasonText}
        onConfirm={async () => {
          try {
            await api.post(`/orders/${order.id}/cancel`, {
              reason: cancelReason + (cancelReasonText ? ` — ${cancelReasonText}` : ''),
            });
            notify.success(t('detail.toast.orderCancelled'));
            await refetchOrder();
            setCancelOpen(false);
          } catch (err: unknown) {
            notify.error(err, t('detail.toast.orderCancelFailed'));
          }
        }}
      />

      {/* Confirm delivery */}
      <Dialog open={confirmDeliveryOpen} onOpenChange={setConfirmDeliveryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('detail.confirmDelivery.title')}</DialogTitle>
            <DialogDescription>{t('detail.confirmDelivery.desc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="rounded-lg bg-success/10 border border-success/30 p-3 flex items-start gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
              <p className="text-muted-foreground leading-relaxed">
                {t('detail.confirmDelivery.note')}
              </p>
            </div>
            <p className="text-sm">{t('detail.confirmDelivery.payoutPrefix')} <Currency amount={(order.agreedPrice ?? 0) * 0.92} /> {t('detail.confirmDelivery.payoutSuffix')}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDeliveryOpen(false)}>{tc('buttons.cancel')}</Button>
            <Button
              onClick={async () => {
                try {
                  // POST /orders/:id/complete → order COMPLETED + Payment RELEASED
                  await api.post(`/orders/${order.id}/complete`, {});
                  playSoundIfEnabled('orderCompleted');
                  notify.success(t('detail.toast.deliveryConfirmed'), t('detail.toast.deliveryConfirmedDesc'));
                  await refetchOrder();
                  setConfirmDeliveryOpen(false);
                } catch (err: unknown) {
                  notify.error(err, t('detail.toast.deliveryConfirmFailed'));
                }
              }}
            >
              <CheckCircle2 className="h-4 w-4" /> {t('detail.confirmDelivery.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Order action buttons (rule-based by status) ─────────────────────

function OrderActionButtons({
  order, onCancel, onConfirmDelivery, onOpenDispute,
}: {
  order: Order;
  onCancel: () => void;
  onConfirmDelivery: () => void;
  onOpenDispute: () => void;
}) {
  const t = useTranslations('orders');
  const canCancel = ['DRAFT', 'PUBLISHED', 'BIDDING', 'ASSIGNED', 'CONFIRMED'].includes(order.status);
  const canConfirmDelivery = order.status === 'DELIVERED';
  const canDispute = ['IN_TRANSIT', 'DELIVERED'].includes(order.status);

  return (
    <>
      {canConfirmDelivery && (
        <Button onClick={onConfirmDelivery} className="bg-success hover:bg-success/90 text-success-foreground">
          <CheckCircle2 className="h-4 w-4" /> {t('detail.confirmDelivery.confirm')}
        </Button>
      )}
      {canDispute && (
        <Button variant="outline" onClick={onOpenDispute}>
          <Shield className="h-4 w-4" /> {t('actions.openDispute')}
        </Button>
      )}
      {canCancel && (
        <Button variant="outline" onClick={onCancel} className="text-destructive hover:text-destructive border-destructive/30">
          <X className="h-4 w-4" /> {t('actions.cancel')}
        </Button>
      )}
    </>
  );
}

// ─── Cancel dialog with rule-based fees ──────────────────────────────

// value stays the canonical Arabic string (what gets submitted to the API,
// unchanged); the displayed label is translated via `labelKey`.
const CANCEL_REASONS = [
  { value: 'لم أعد بحاجة للنقل', labelKey: 'detail.cancelReasons.noLongerNeeded' },
  { value: 'وجدت بديلا أرخص', labelKey: 'detail.cancelReasons.cheaperAlt' },
  { value: 'تغيّر الموعد أو الوجهة', labelKey: 'detail.cancelReasons.scheduleChanged' },
  { value: 'مشكلة في البضاعة', labelKey: 'detail.cancelReasons.cargoIssue' },
  { value: 'الناقل لا يستجيب', labelKey: 'detail.cancelReasons.carrierUnresponsive' },
  { value: 'أخرى', labelKey: 'detail.cancelReasons.other' },
];

function CancelOrderDialog({
  open, onClose, order, reason, setReason, reasonText, setReasonText, onConfirm,
}: {
  open: boolean; onClose: () => void; order: Order;
  reason: string; setReason: (v: string) => void;
  reasonText: string; setReasonText: (v: string) => void;
  onConfirm: () => void;
}) {
  const t = useTranslations('orders');
  // Pull the cancellation policy from the workflow engine (single source of
  // truth: shared-utils/workflow-engine.ts). Renders the appropriate tier-
  // specific summary card.
  const policy = cancellationPolicy(order);
  const beforePublish = policy.tier === 'FREE' && order.status === 'DRAFT';
  const beforeAssign  = policy.tier === 'FREE' && order.status !== 'DRAFT';
  const afterAssign   = policy.tier === 'FEE_10_PERCENT';
  const inTransit     = policy.tier === 'DISPUTE_ONLY';

  const total = order.agreedPrice ?? order.clientBudget ?? 0;
  const fee = policy.feeAmount;
  const refund = policy.refundAmount;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('detail.cancelDialog.title', { orderNumber: order.orderNumber })}</DialogTitle>
          <DialogDescription>{t('detail.cancelDialog.desc')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Fee rules summary */}
          {(beforePublish || beforeAssign) && (
            <div className="rounded-md bg-success/10 border border-success/30 p-3 flex items-start gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{t('detail.cancelDialog.freeTitle')}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t('detail.cancelDialog.freeDesc')}</p>
              </div>
            </div>
          )}

          {afterAssign && (
            <div className="rounded-md bg-warning/10 border border-warning/30 p-3 flex items-start gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">{t('detail.cancelDialog.fee10Title')}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('detail.cancelDialog.fee10Desc')}
                </p>
                <dl className="mt-2 pt-2 border-t border-warning/30 text-xs space-y-1">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">{t('detail.cancelDialog.orderValue')}</dt>
                    <dd className="font-medium"><Currency amount={total} /></dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">{t('detail.cancelDialog.feeLabel')}</dt>
                    <dd className="font-medium text-destructive">−<Currency amount={fee} /></dd>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-warning/30 font-semibold">
                    <dt>{t('detail.cancelDialog.refund')}</dt>
                    <dd className="text-success"><Currency amount={refund} /></dd>
                  </div>
                </dl>
              </div>
            </div>
          )}

          {inTransit && (
            <div className="rounded-md bg-destructive/10 border border-destructive/30 p-3 flex items-start gap-2 text-sm">
              <X className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{t('detail.cancelDialog.cannotTitle')}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('detail.cancelDialog.cannotDesc')}
                </p>
              </div>
            </div>
          )}

          {!inTransit && (
            <>
              <div className="space-y-2">
                <Label>{t('detail.cancelDialog.reason')}</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger><SelectValue placeholder={t('detail.cancelDialog.reasonPlaceholder')} /></SelectTrigger>
                  <SelectContent>
                    {CANCEL_REASONS.map((r) => <SelectItem key={r.value} value={r.value}>{t(r.labelKey)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('detail.cancelDialog.notes')}</Label>
                <textarea
                  value={reasonText}
                  onChange={(e) => setReasonText(e.target.value)}
                  rows={3}
                  className="w-full p-3 rounded-md border bg-background text-sm"
                  placeholder={t('detail.cancelDialog.notesPlaceholder')}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('detail.goBack')}</Button>
          {!inTransit && (
            <Button variant="destructive" onClick={onConfirm} disabled={!reason}>
              <X className="h-4 w-4" /> {t('detail.cancelDialog.confirm')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: any }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <dt className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
        {Icon && <Icon className="h-4 w-4 shrink-0" />}
        <span className="truncate">{label}</span>
      </dt>
      <dd className="text-sm font-medium text-end max-w-[60%] leading-relaxed">{value ?? '—'}</dd>
    </div>
  );
}

/**
 * Status header + pickup→delivery progress + tracking events list.
 * Rendered once the order is ASSIGNED+ so the client sees a clear "where
 * is my shipment, when does it arrive, what just happened?" answer
 * without scrolling through bid history.
 */
function ShipmentProgressCard({ order, bids }: { order: Order; bids: typeof BIDS }) {
  const t = useTranslations('orders');
  const accepted = bids.find((b) => b.status === 'ACCEPTED');
  const effectivePickup = accepted?.proposedPickupDate ?? order.pickupDate;
  const effectiveDelivery =
    accepted?.proposedDeliveryDate
    ?? accepted?.estimatedDeliveryDate
    ?? order.deliveryDate
    ?? null;
  const events = timelineFor(order.id);
  // Map status → (helper text, which of the 3 steps is the current focus).
  const meta: Record<string, { text: string; step: 1 | 2 | 3; tone: 'info' | 'warning' | 'success' }> = {
    ASSIGNED:   { text: t('detail.progress.assigned'),   step: 1, tone: 'info' },
    CONFIRMED:  { text: t('detail.progress.confirmed'),  step: 1, tone: 'info' },
    IN_TRANSIT: { text: t('detail.progress.inTransit'),  step: 2, tone: 'warning' },
    DELIVERED:  { text: t('detail.progress.delivered'),  step: 3, tone: 'warning' },
    COMPLETED:  { text: t('detail.progress.completed'),  step: 3, tone: 'success' },
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
            <CardTitle className="flex items-center gap-2">{t('detail.progress.title')} <StatusBadge status={order.status} /></CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{m.text}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* 3-step progress: استلام → في الطريق → تسليم */}
        <div className="flex items-center gap-2">
          {[
            { s: 1 as const, label: t('detail.progress.stepPickup'),  icon: MapPin },
            { s: 2 as const, label: t('detail.progress.stepTransit'), icon: Truck },
            { s: 3 as const, label: t('detail.progress.stepDelivery'),  icon: CheckCircle2 },
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

        {/* Pickup + delivery dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="text-xs text-muted-foreground">{t('detail.progress.pickupDate')}</div>
            <div className="mt-0.5 font-medium">
              {effectivePickup ? formatDate(effectivePickup, 'EEEE d MMM') : '—'}
            </div>
            {accepted?.proposedPickupDate && accepted.proposedPickupDate !== order.pickupDate && (
              <Badge variant="warning" className="mt-1 h-4 text-[10px]">{t('detail.progress.altFromCarrier')}</Badge>
            )}
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="text-xs text-muted-foreground">{t('detail.progress.deliveryDate')}</div>
            <div className="mt-0.5 font-medium">
              {effectiveDelivery ? formatDate(effectiveDelivery, 'EEEE d MMM') : t('detail.toBeDetermined')}
            </div>
            {accepted?.proposedDeliveryDate && order.deliveryDate && accepted.proposedDeliveryDate !== order.deliveryDate && (
              <Badge variant="warning" className="mt-1 h-4 text-[10px]">{t('detail.progress.altFromCarrier')}</Badge>
            )}
          </div>
        </div>

        {/* Tracking events */}
        {events.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">{t('detail.progress.tracking')}</div>
            <ol className="relative space-y-3">
              {events.map((ev, i) => (
                <li key={i} className="relative ps-7">
                  {i < events.length - 1 && <span aria-hidden className="absolute top-5 bottom-[-12px] start-[9px] w-px bg-border" />}
                  <span className="absolute start-0 top-1 grid place-items-center h-5 w-5 rounded-full bg-primary border-2 border-background">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
                  </span>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">{TITLES[ev.kind] ? t(TITLES[ev.kind]) : ev.kind}</div>
                      {(ev.note || ev.by) && <div className="text-xs text-muted-foreground mt-0.5">{ev.note} {ev.by && `· ${ev.by}`}</div>}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{formatDate(ev.at, 'd MMM · HH:mm')}</span>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type ApiCarrier = { id: string; nameAr: string; nameEn?: string; city?: string; contactPhone?: string; contactEmail?: string; rating?: number; completedTrips?: number; responseTimeMins?: number; insurance?: boolean };
type ApiOrderFull = Order & { carrier?: ApiCarrier };

function CarrierInfoCard({ order }: { order: Order }) {
  const t = useTranslations('orders');
  // Use API-provided carrier data when available, fall back to mock
  const apiOrder = order as ApiOrderFull;
  const carrierFromApi = apiOrder.carrier;
  const carrierFromMock = companyById(order.carrierId);
  const carrier = carrierFromApi ?? carrierFromMock;
  if (!carrier) return null;

  // Accepted bid from API (bids injected by normalizeOrder) or from mock
  type ApiBid = { id: string; status: string; price?: number; amount?: number; estimatedDays?: number };
  const apiBids = (order as Order & { bids?: ApiBid[] }).bids;
  const acceptedBid = apiBids?.find((b) => b.status === 'ACCEPTED') ?? BIDS.find((b) => b.orderId === order.id && b.status === 'ACCEPTED');

  // Truck and driver data still come from mocks (no dedicated API endpoint on order detail)
  const assignedTruck =
    TRUCKS.find((t) => t.carrierId === carrier.id && t.status === 'ON_TRIP') ??
    TRUCKS.find((t) => t.carrierId === carrier.id);
  const driver = assignedTruck?.assignedDriverId
    ? DRIVERS.find((d) => d.id === assignedTruck.assignedDriverId)
    : DRIVERS.find((d) => d.carrierId === carrier.id);

  const initials = (carrier.nameAr ?? '').split(' ').slice(0, 2).map((w) => w[0] ?? '').join('');
  const driverInitials = (driver?.fullName ?? '').split(' ').slice(0, 2).map((w) => w[0] ?? '').join('');
  const plate = assignedTruck ? parsePlateString(assignedTruck.plateNumber) : null;

  return (
    <Card className="border-success/30 bg-success/[0.03]">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-success/15 text-success grid place-items-center">
              <BadgeCheck className="h-4 w-4" />
            </div>
            <CardTitle>{t('detail.carrier.title')}</CardTitle>
          </div>
          <Badge variant="success">{t('detail.carrier.bidAccepted')}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Carrier company header */}
        <div className="flex items-start gap-4">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="text-base">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-semibold text-base">{carrier.nameAr}</h4>
              {(carrier as { insurance?: boolean }).insurance && <Badge variant="default">{t('detail.carrier.fullInsurance')}</Badge>}
              <Badge variant="outline">{t('detail.carrier.verified')}</Badge>
            </div>
            <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              {carrier.rating && (
                <span className="inline-flex items-center gap-1">
                  <Star className="h-3 w-3 fill-warning text-warning" />
                  <span className="num">{carrier.rating.toFixed(1)}</span>
                  {(carrier as { completedTrips?: number }).completedTrips != null && (
                    <span>(<span className="num">{(carrier as { completedTrips?: number }).completedTrips}</span> {t('detail.tripsWord')})</span>
                  )}
                </span>
              )}
              {carrier.city && <span>· {localizeCity(carrier.city)}</span>}
              {carrier.contactPhone && (
                <span dir="ltr" className="num">{carrier.contactPhone}</span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {carrier.contactPhone && (
              <Button size="sm" variant="outline" asChild>
                <a href={`tel:${carrier.contactPhone}`}>
                  <Phone className="h-3.5 w-3.5" /> {t('detail.carrier.call')}
                </a>
              </Button>
            )}
            {carrier.contactEmail && (
              <Button size="sm" variant="ghost" asChild>
                <a href={`mailto:${carrier.contactEmail}`}>
                  <MessageSquare className="h-3.5 w-3.5" /> {t('detail.carrier.email')}
                </a>
              </Button>
            )}
          </div>
        </div>

        {order.orderType === 'CONSOLIDATED' && (
          <ConsolidatedReadonly order={order} />
        )}
        {/* Truck + Driver split */}
        {order.orderType !== 'CONSOLIDATED' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Truck */}
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase mb-3">
              <Truck className="h-3.5 w-3.5" />
              {t('detail.carrier.assignedTruck')}
            </div>
            {assignedTruck && plate ? (
              <>
                <SaudiPlate
                  letters={plate.letters}
                  numbers={plate.numbers}
                  type="public"
                  size="sm"
                />
                <dl className="mt-3 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">{t('detail.carrier.type')}</dt>
                    <dd className="font-medium">{assignedTruck.truckType && TRUCK_LABELS[assignedTruck.truckType] ? t(TRUCK_LABELS[assignedTruck.truckType]) : assignedTruck.truckType}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">{t('detail.carrier.capacity')}</dt>
                    <dd className="font-medium num">
                      {(assignedTruck.capacityKg / 1000).toFixed(0)} {t('detail.tonUnit')}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">{t('detail.carrier.model')}</dt>
                    <dd className="font-medium num">{assignedTruck.modelYear}</dd>
                  </div>
                </dl>
              </>
            ) : (
              <div className="text-xs text-muted-foreground py-2">{t('detail.carrier.truckSoon')}</div>
            )}
          </div>

          {/* Driver */}
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase mb-3">
              <User className="h-3.5 w-3.5" />
              {t('detail.carrier.driver')}
            </div>
            {driver ? (
              <>
                <div className="flex items-center gap-3">
                  <Avatar className="h-11 w-11">
                    <AvatarFallback>{driverInitials}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">{driver.fullName}</div>
                    <div className="text-xs text-muted-foreground">{driver.licenseClass}</div>
                  </div>
                </div>
                <dl className="mt-3 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">{t('detail.carrier.mobile')}</dt>
                    <dd className="font-medium num" dir="ltr">{driver.phone}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">{t('detail.carrier.completedTrips')}</dt>
                    <dd className="font-medium num">{driver.totalTrips.toLocaleString('en-US')}</dd>
                  </div>
                </dl>
              </>
            ) : (
              <div className="text-xs text-muted-foreground py-2">{t('detail.carrier.driverSoon')}</div>
            )}
          </div>
        </div>
        )}

        {/* Agreed price + ETA */}
        {(order.agreedPrice || acceptedBid) && (
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <div className="text-xs text-muted-foreground">{t('detail.carrier.agreedPrice')}</div>
              <div className="mt-0.5 text-lg font-bold">
                <Currency amount={order.agreedPrice ?? acceptedBid?.price ?? 0} />
              </div>
            </div>
            {acceptedBid && (
              <div>
                <div className="text-xs text-muted-foreground">{t('detail.estimatedDuration')}</div>
                <div className="mt-0.5 text-lg font-bold num">
                  {acceptedBid.estimatedDays} {acceptedBid.estimatedDays === 1 ? t('detail.unit.day') : t('detail.unit.days')}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
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
  // leg status. (The dedicated Tracking page moves them live.)
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
        <RouteStat icon={MapPin} label={t('detail.map.distance')} value={<span className="num">{km.toLocaleString('en-US')} {t('detail.kmUnit')}</span>} />
        <RouteStat icon={Timer} label={t('detail.map.duration')} value={duration} />
        <RouteStat icon={Navigation} label={t('detail.map.mainRoad')} value={road} />
      </CardContent>
    </Card>
  );
}

function RouteStat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
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

// ─── DIRECT proposal view (client side) ──────────────────────────────
//
// Shown when mode=DIRECT and the order hasn't been assigned yet. Three
// states depending on the proposal:
//   1. No proposal yet           → "بانتظار رد الناقل"
//   2. Carrier proposed a price  → big price card + 3 actions
//   3. Negotiation finalised     → success or rejection state

function DirectProposalView({ order, onRefetch }: { order: Order; onRefetch: () => void }) {
  const t = useTranslations('orders');
  const tcDirect = useTranslations('common');
  const confirm = useConfirm();
  const proposal = proposalForOrder(order.id);
  const carrier = companyById(order.targetCarrierId);
  const [action, setAction] = useState<null | 'ACCEPT' | 'COUNTER' | 'REJECT'>(null);
  const [counterPrice, setCounterPrice] = useState<number>(0);
  const [counterNote, setCounterNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // pendingBid — the carrier's latest offer from the real API (order.bids injected by normalizeOrder)
  const bidsFromApi = (order as Order & { bids?: { id: string; status: string; price?: number; amount?: number }[] }).bids;
  const pendingBid = bidsFromApi?.find((b) => b.status === 'PENDING');

  // 1) Still waiting for the very first carrier reply
  if (!proposal && !pendingBid) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="h-14 w-14 rounded-2xl bg-warning/15 text-warning mx-auto grid place-items-center mb-4 animate-pulse">
            <UserSearch className="h-7 w-7" />
          </div>
          <h3 className="font-semibold text-lg">{t('detail.direct.waitingTitle')}</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
            {t.rich('detail.direct.waitingDesc', { name: carrier?.nameAr ?? '', b: (c) => <strong>{c}</strong> })}
          </p>
        </CardContent>
      </Card>
    );
  }

  const onTable = proposal ? lastRound(proposal) : undefined;
  const isClientTurn = proposal?.status === 'AWAITING_CLIENT' || !!pendingBid;
  const activeBidId = pendingBid?.id;
  const submit = async () => {
    if (submitting) return;
    const acceptPrice = onTable?.price ?? pendingBid?.amount ?? pendingBid?.price ?? 0;
    const confirmMap = {
      ACCEPT: {
        title: 'قبول السعر وإسناد الطلب',
        description: `بالقبول سيتم إسناد الطلب إلى ${carrier?.nameAr ?? 'الناقل'} بسعر ${acceptPrice.toLocaleString('en-US')} ر.س وحجز المبلغ في الضمان. لا يمكن التراجع بعد الإسناد.`,
        confirmLabel: 'قبول وإسناد',
        destructive: false,
      },
      COUNTER: {
        title: 'إرسال عرض مضاد',
        description: `سيتم إرسال سعرك المقترح ${counterPrice.toLocaleString('en-US')} ر.س للناقل، وينتظر الطلب ردّه.`,
        confirmLabel: 'إرسال العرض',
        destructive: false,
      },
      REJECT: {
        title: 'رفض عرض الناقل',
        description: 'سيتم رفض العرض الحالي وإشعار الناقل. يبقى الطلب قائماً ويمكن التفاوض مجدداً.',
        confirmLabel: 'رفض العرض',
        destructive: true,
      },
    } as const;
    if (action && confirmMap[action]) {
      const ok = await confirm(confirmMap[action]);
      if (!ok) return;
    }
    setSubmitting(true);
    try {
      if (action === 'ACCEPT' && activeBidId) {
        await api.post(`/orders/${order.id}/bids/${activeBidId}/accept`, {});
        notify.success(t('detail.toast.priceAccepted'), t('detail.toast.assignedTo', { name: carrier?.nameAr ?? t('detail.carrier.title') }));
        onRefetch();
      } else if (action === 'COUNTER') {
        await api.post(`/orders/${order.id}/bids`, {
          amount: counterPrice,
          notes: counterNote || undefined,
        });
        notify.success(t('detail.toast.counterSent'), `${counterPrice.toLocaleString('en-US')} ${t('detail.sar')} — ${t('detail.toast.counterWaiting')}`);
        onRefetch();
      } else if (action === 'REJECT' && activeBidId) {
        await api.post(`/orders/${order.id}/bids/${activeBidId}/reject`, {});
        notify.success(t('detail.toast.bidRejected'), t('detail.toast.rejectedDesc'));
        onRefetch();
      }
      setAction(null);
    } catch (err) {
      notify.error(err, t('detail.toast.actionFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Card className={isClientTurn ? 'border-warning/40 bg-warning/[0.04]' : ''}>
        <CardHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardDescription className="mb-1">
                {isClientTurn ? t('detail.direct.proposedFrom', { name: carrier?.nameAr ?? '' }) : t('detail.direct.waitingFrom', { name: carrier?.nameAr ?? '' })}
              </CardDescription>
              {onTable && (
                <>
                  <CardTitle className="text-3xl"><Currency amount={onTable.price} /></CardTitle>
                  {onTable.days && (
                    <div className="mt-1 text-sm text-muted-foreground">
                      {t('detail.direct.leadTime')} <span className="font-medium num">{onTable.days}</span> {t('detail.unit.days')}
                    </div>
                  )}
                </>
              )}
            </div>
            {onTable && (
              <div className="text-xs text-muted-foreground text-end">
                <div>{t('detail.direct.since')} {formatRelative(onTable.at)}</div>
                <div className="mt-0.5">{formatDate(onTable.at, 'd MMM · HH:mm')}</div>
              </div>
            )}
          </div>
        </CardHeader>
        {onTable?.notes && (
          <CardContent>
            <div className="rounded-md bg-card border p-3 text-sm flex items-start gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="leading-relaxed">{onTable.notes}</p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Actions — only when it's the client's turn */}
      {isClientTurn && (
        <Card>
          <CardHeader>
            <CardTitle>{t('detail.direct.actionsTitle')}</CardTitle>
            <CardDescription>{t('detail.direct.actionsDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <ProposalAction
              icon={CheckCircle2}
              title={t('detail.direct.acceptPrice')}
              subtitle={t('detail.direct.acceptPriceSub', { name: carrier?.nameAr ?? '' })}
              tone="success"
              onClick={() => setAction('ACCEPT')}
            />
            <ProposalAction
              icon={MessageSquare}
              title={t('detail.direct.counter')}
              subtitle={t('detail.direct.counterSub')}
              tone="warning"
              onClick={() => {
                setAction('COUNTER');
                setCounterPrice(onTable ? Math.round(onTable.price * 0.93) : 0);
              }}
            />
            <ProposalAction
              icon={X}
              title={t('detail.direct.rejectOffer')}
              subtitle={t('detail.direct.chooseAnother')}
              tone="destructive"
              onClick={() => setAction('REJECT')}
            />
          </CardContent>
        </Card>
      )}

      {proposal?.status === 'AWAITING_CARRIER_REPLY' && (
        <Card>
          <CardContent className="py-10 text-center">
            <div className="h-12 w-12 rounded-2xl bg-info/15 text-info mx-auto grid place-items-center mb-3 animate-pulse">
              <MessageSquare className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium">{t('detail.direct.counterSent')}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t('detail.direct.counterSentDesc')}</p>
          </CardContent>
        </Card>
      )}

      {proposal?.status === 'ACCEPTED' && (
        <Card className="border-success/30 bg-success/[0.04]">
          <CardContent className="pt-6 flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-success">{t('detail.direct.agreed')}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {t.rich('detail.direct.agreedDesc', { name: carrier?.nameAr ?? '', b: (c) => <strong>{c}</strong> })}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      {proposal?.status === 'DECLINED' && (
        <Card className="border-destructive/30 bg-destructive/[0.04]">
          <CardContent className="pt-6 flex items-start gap-3">
            <X className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-destructive">{t('detail.direct.ended')}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t('detail.direct.endedDesc')}</p>
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <Button size="sm" variant="outline">{t('detail.direct.chooseAnother')}</Button>
                <Button size="sm">{t('detail.direct.toOpenMarket')}</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Negotiation history (collapsible-ish — always visible since it's short) */}
      {(proposal?.rounds?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('detail.direct.negotiationLog')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {proposal?.rounds?.map((r, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className={`h-8 w-8 rounded-full grid place-items-center shrink-0 text-xs font-bold ${
                    r.by === 'CLIENT' ? 'bg-primary/10 text-primary' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  }`}>
                    {r.by === 'CLIENT' ? t('detail.direct.meInitial') : t('detail.direct.carrierInitial')}
                  </div>
                  <div className="flex-1 min-w-0 rounded-md border bg-card p-3">
                    <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-semibold">
                        {r.by === 'CLIENT' ? t('detail.direct.you') : carrier?.nameAr} — {r.kind === 'COUNTER' ? t('detail.direct.actionCountered') : r.kind === 'ACCEPT' ? t('detail.direct.actionAccepted') : t('detail.direct.actionRejected')}
                      </span>
                      <span className="text-xs text-muted-foreground">{formatRelative(r.at)}</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold"><Currency amount={r.price} /></span>
                      {r.days && <span className="text-xs text-muted-foreground">· {r.days} {t('detail.unit.days')}</span>}
                    </div>
                    {r.notes && <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{r.notes}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <Dialog open={action === 'ACCEPT'} onOpenChange={(o) => !o && setAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('detail.direct.acceptDialog.title')}</DialogTitle>
            <DialogDescription>
              {t.rich('detail.direct.acceptDialog.desc', {
                name: carrier?.nameAr ?? '',
                b: (c) => <strong>{c}</strong>,
                price: () => <strong><Currency amount={onTable?.price ?? 0} /></strong>,
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(null)}>{tcDirect('buttons.cancel')}</Button>
            <Button onClick={submit}><CheckCircle2 className="h-4 w-4" /> {t('detail.accept.confirm')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={action === 'COUNTER'} onOpenChange={(o) => !o && setAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('detail.direct.counterDialog.title')}</DialogTitle>
            <DialogDescription>{t('detail.direct.counterDialog.desc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>{t('detail.direct.counterDialog.priceLabel')}</Label>
              <Input type="number" value={counterPrice || ''} onChange={(e) => setCounterPrice(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>{t('detail.direct.counterDialog.noteLabel')}</Label>
              <textarea
                rows={3}
                value={counterNote}
                onChange={(e) => setCounterNote(e.target.value)}
                className="w-full p-3 rounded-md border bg-background text-sm"
                placeholder={t('detail.direct.counterDialog.notePlaceholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(null)}>{tcDirect('buttons.cancel')}</Button>
            <Button onClick={submit} disabled={!counterPrice}>{t('detail.direct.counterDialog.send')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={action === 'REJECT'} onOpenChange={(o) => !o && setAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('detail.direct.rejectDialog.title')}</DialogTitle>
            <DialogDescription>{t('detail.direct.rejectDialog.desc')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(null)}>{t('detail.goBack')}</Button>
            <Button variant="destructive" onClick={submit}><X className="h-4 w-4" /> {t('detail.direct.rejectDialog.confirm')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ProposalAction({
  icon: Icon, title, subtitle, tone, onClick,
}: {
  icon: any; title: string; subtitle: string;
  tone: 'success' | 'warning' | 'destructive';
  onClick: () => void;
}) {
  const styles = {
    success:     { ring: 'hover:border-success/40',     bg: 'bg-success/15 text-success' },
    warning:     { ring: 'hover:border-warning/40',     bg: 'bg-warning/15 text-warning' },
    destructive: { ring: 'hover:border-destructive/40', bg: 'bg-destructive/15 text-destructive' },
  }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-start gap-2 p-4 rounded-lg border-2 text-start transition-colors ${styles.ring}`}
    >
      <div className={`h-10 w-10 rounded-lg grid place-items-center ${styles.bg}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="font-semibold">{title}</div>
      <div className="text-xs text-muted-foreground">{subtitle}</div>
    </button>
  );
}

const LEG_LABEL: Record<ConsolidatedLeg['status'], string> = {
  PENDING: 'detail.leg.pending', ASSIGNED: 'detail.leg.assigned', IN_TRANSIT: 'detail.leg.inTransit', DELIVERED: 'detail.leg.delivered',
};
const LEG_TONE: Record<ConsolidatedLeg['status'], string> = {
  PENDING: 'bg-muted text-muted-foreground',
  ASSIGNED: 'bg-[hsl(var(--mint))]/15 text-[hsl(var(--mint))]',
  IN_TRANSIT: 'bg-[hsl(var(--mint))]/15 text-[hsl(var(--mint))]',
  DELIVERED: 'bg-[hsl(var(--mint))]/15 text-[hsl(var(--mint))]',
};

/** Read-only consolidated-order breakdown + invoice (client view). */
type ReadonlyLeg = ConsolidatedLeg & { plateNumber?: string; driverName?: string };

function ConsolidatedReadonly({ order }: {
  order: { id: string; orderNumber: string; truckCount?: number; legs?: ConsolidatedLeg[]; agreedPrice: number | null };
}) {
  const t = useTranslations('orders');
  // Live legs from the API (enriched with plate + driver name so the client can
  // render them without fleet access); fall back to the mock order legs.
  const { data: legsData } = useSWR<{ truckCount: number; heterogeneous?: boolean; legs: ReadonlyLeg[] }>(`/orders/${order.id}/legs`, fetcher);
  const apiLegs = Array.isArray(legsData?.legs) ? legsData!.legs : null;
  const legs: ReadonlyLeg[] = apiLegs ?? (order.legs ?? []);
  const count = (apiLegs ? legsData!.truckCount : order.truckCount) ?? legs.length;
  const distributed = legs.filter((l) => l.truckId).length;
  // Heterogeneous orders price per leg (sum); homogeneous ones split evenly.
  const heterogeneous = !!legsData?.heterogeneous;
  const legPriceSum = legs.reduce((s, l) => s + (l.price ?? 0), 0);
  const perLeg = Math.round((order.agreedPrice ?? 0) / Math.max(1, count));
  const invoiceTotal = heterogeneous && legPriceSum > 0 ? legPriceSum : (order.agreedPrice ?? 0);
  const truckLabel = (ty?: string) => (ty && TRUCK_LABELS[ty] ? t(TRUCK_LABELS[ty]) : ty);
  const pct = count > 0 ? Math.round((distributed / count) * 100) : 0;
  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
          <Layers className="h-3.5 w-3.5" /> {t('detail.consolidated.label')} · <span className="num">{count}</span> {t('detail.trucksWord')}
        </div>
        <span className="num text-xs text-muted-foreground">{t('detail.consolidated.distributed')} {distributed}/{count}</span>
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
            <div key={leg.index} className="flex items-center gap-3 rounded-md border bg-card p-2.5">
              <span className="num flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">{leg.index}</span>
              {leg.truckId && plate ? (
                <>
                  <div className="w-[100px] shrink-0"><SaudiLicensePlate letters={plate.letters} numbers={plate.numbers} plateType="transport" size="fill" /></div>
                  <div className="min-w-0 flex-1">
                    {leg.reference && <div className="num font-mono text-[11px] text-foreground truncate" dir="ltr">{leg.reference}</div>}
                    {heterogeneous && (
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground flex-wrap">
                        <Truck className="h-3 w-3" />{truckLabel(leg.requiredTruckType)}
                        {leg.destinationCity && <>· <MapPin className="h-3 w-3" />{localizeCity(leg.destinationCity)}</>}
                        {leg.carrierName && <span className="font-medium text-foreground">· {leg.carrierName}</span>}
                      </div>
                    )}
                    {driverName
                      ? <div className="flex items-center gap-1 text-xs text-muted-foreground"><Users className="h-3 w-3" /> {driverName}</div>
                      : <div className="text-xs text-muted-foreground">{t('detail.consolidated.noDriver')}</div>}
                  </div>
                </>
              ) : (
                <div className="min-w-0 flex-1">
                  {leg.reference && <div className="num font-mono text-[11px] text-foreground truncate" dir="ltr">{leg.reference}</div>}
                  {heterogeneous && (
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground flex-wrap">
                      <Truck className="h-3 w-3" />{truckLabel(leg.requiredTruckType)}
                      {leg.destinationCity && <>· <MapPin className="h-3 w-3" />{localizeCity(leg.destinationCity)}</>}
                      {leg.carrierName && <span className="font-medium text-foreground">· {leg.carrierName}</span>}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">{t('detail.consolidated.notDistributed')}</div>
                </div>
              )}
              {heterogeneous && leg.price != null && (
                <span className="shrink-0 text-xs font-semibold"><Currency amount={leg.price} /></span>
              )}
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${LEG_TONE[leg.status]}`}>{t(LEG_LABEL[leg.status])}</span>
            </div>
          );
        })}
      </div>
      <div className="rounded-md border bg-card p-3 text-sm">
        <div className="mb-1 font-semibold">{t('detail.consolidated.invoice')}</div>
        {heterogeneous ? (
          <div className="flex justify-between text-muted-foreground"><span className="num">{count} {t('detail.trucksWord')}</span><span className="text-[11px]">{t('detail.consolidated.perLegPricing')}</span></div>
        ) : (
          <div className="flex justify-between text-muted-foreground"><span className="num">{count} {t('detail.trucksWord')} × </span><Currency amount={perLeg} /></div>
        )}
        <div className="mt-1 flex justify-between border-t pt-1 font-semibold"><span>{t('detail.consolidated.total')}</span><Currency amount={invoiceTotal} /></div>
        <p className="mt-1 text-[11px] text-muted-foreground">{t('detail.consolidated.invoiceNote', { orderNumber: order.orderNumber })}</p>
      </div>
    </div>
  );
}

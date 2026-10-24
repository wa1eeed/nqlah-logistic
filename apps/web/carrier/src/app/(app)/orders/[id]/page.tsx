'use client';
import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowRight, Building2, Calendar, CheckCircle2, Mail, MapPin, Navigation, Package,
  Phone, Shield, ShieldCheck, Snowflake, Timer, Truck, Users, Weight, X,
  type LucideIcon,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { playSoundIfEnabled } from '@/lib/sound';
import useSWR from 'swr';
import { api, fetcher } from '@/lib/api';
import { notify } from '@/lib/notify';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { Currency } from '@/components/currency';
import { RouteMap } from '@/components/route-map';
import { EscrowCountdown } from '@/components/escrow-countdown';
import {
  ORDERS, TRUCKS, DRIVERS, CURRENT_CARRIER_ID, companyById, coordsFor, distanceKm, estimatedDurationLabel, primaryRoadFor,
  formatDate, formatDateTime, timelineFor, normalizeOrder, type Order,
} from '@naqla/shared-utils';
import { SaudiLicensePlate, parsePlateString } from '@/components/saudi-plate';
import { OwnershipBadge } from '@/components/fleet-bits';
import { ConsolidatedPanel } from '@/components/consolidated-panel';
import { useFleetStore } from '@/stores/fleet-store';
import { useConsolidatedStore } from '@/stores/consolidated-store';
import { useFreelancerStore } from '@/stores/freelancer-store';

const TITLES: Record<string, string> = {
  CREATED: 'إنشاء الطلب', PUBLISHED: 'نشر الطلب', BID_ACCEPTED: 'قبول عرضك',
  CONFIRMED: 'تأكيد التحميل', PICKED_UP: 'تم الاستلام', IN_TRANSIT: 'في الطريق',
  DELIVERED: 'تم التسليم', PAYMENT_RELEASED: 'الإفراج عن المبلغ',
  COMPLETED: 'إغلاق الطلب', CANCELLED: 'إلغاء',
};

export default function CarrierOrderDetail() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: orderData, mutate: refetchOrder } = useSWR<typeof ORDERS[number]>(
    params?.id ? `/orders/${params.id}` : null,
    fetcher,
  );
  // Normalize API → mock shape so `order.weightKg` / `order.truckType` don't crash.
  const order = normalizeOrder(orderData) ?? ORDERS.find((o) => o.id === params.id);
  const [confirmPickupOpen, setConfirmPickupOpen] = useState(false);
  const [startTripOpen, setStartTripOpen] = useState(false);
  const [markDeliveredOpen, setMarkDeliveredOpen] = useState(false);
  const [updateLocOpen, setUpdateLocOpen] = useState(false);
  const [location, setLocation] = useState('');
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [assignDriverOpen, setAssignDriverOpen] = useState(false);
  const [pickTruck, setPickTruck] = useState('');
  const [tripFee, setTripFee] = useState('');

  const fleetAssign = useFleetStore((s) => s.assign);
  const singleAssign = useConsolidatedStore((s) => s.singleAssign);
  const assignOrderTruck = useConsolidatedStore((s) => s.assignOrderTruck);
  const addFreelancerInvoice = useFreelancerStore((s) => s.addInvoice);
  const invoiceForOrderTruck = useFreelancerStore((s) => s.invoiceForOrderTruck);
  const driverForTruck = (truckId: string) =>
    (truckId in fleetAssign ? fleetAssign[truckId] : TRUCKS.find((t) => t.id === truckId)?.assignedDriverId) ?? '';

  if (!order) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <Package className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="font-semibold">الطلب غير موجود</h3>
          <Button onClick={() => router.push('/orders')} className="mt-4">عودة</Button>
        </CardContent>
      </Card>
    );
  }

  const client = companyById(order.clientId);
  const timeline = timelineFor(order.id);
  const showActions = ['ASSIGNED', 'CONFIRMED', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED'].includes(order.status);
  // The carrier's own bid (accepted = the assignment). Surfaces the dates
  // they proposed back in the bid form so the carrier sees a single source
  // of truth for "expected pickup / delivery" on this order.
  type ApiBid = { id: string; carrierId: string; status: string; proposedPickupDate?: string; proposedDeliveryDate?: string; estimatedDeliveryDate?: string };
  const apiBids: ApiBid[] = (order as unknown as { bids?: ApiBid[] }).bids ?? [];
  const myAcceptedBid = apiBids.find((b) => b.status === 'ACCEPTED');
  const effectivePickup = myAcceptedBid?.proposedPickupDate ?? order.pickupDate;
  const effectiveDelivery =
    myAcceptedBid?.proposedDeliveryDate
    ?? myAcceptedBid?.estimatedDeliveryDate
    ?? (order as { deliveryDate?: string }).deliveryDate
    ?? null;
  const showShipmentCard = ['ASSIGNED', 'CONFIRMED', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED'].includes(order.status);
  // Assigned truck for this order: the carrier's explicit choice (stored),
  // otherwise an auto-pick from the fleet (demo).
  const autoTruck =
    TRUCKS.find((t) => t.carrierId === order.carrierId && t.status === 'ON_TRIP') ??
    TRUCKS.find((t) => t.carrierId === order.carrierId) ??
    TRUCKS.find((t) => t.status === 'ON_TRIP') ??
    TRUCKS[0];
  const override = singleAssign[order.id];
  const assignedTruck = override ? (TRUCKS.find((t) => t.id === override.truckId) ?? autoTruck) : autoTruck;
  const assignedPlate = assignedTruck ? parsePlateString(assignedTruck.plateNumber) : null;
  const assignedDriver = override
    ? DRIVERS.find((d) => d.id === override.driverId)
    : (assignedTruck ? DRIVERS.find((d) => d.id === (fleetAssign[assignedTruck.id] ?? assignedTruck.assignedDriverId)) : null);

  // Revenue the carrier earns on this order (client side) — used to show the
  // provider's margin when assigning a freelancer, and to issue the invoice.
  const orderRevenue =
    (order as { carrierAmount?: number | null }).carrierAmount ?? order.agreedPrice ?? null;
  const pickedTruck = TRUCKS.find((t) => t.id === pickTruck);
  const isFreelancerPick = pickedTruck?.ownership === 'FREELANCER';
  const feeNum = Number(tripFee);
  const feeValid = Number.isFinite(feeNum) && feeNum > 0;
  const assignBlocked = !pickTruck || (isFreelancerPick && !feeValid);

  const doAssignOrderTruck = async () => {
    if (assignBlocked || !pickedTruck) return;
    const driverId = driverForTruck(pickTruck);
    assignOrderTruck(order.id, pickTruck, driverId);
    if (isFreelancerPick) {
      // Issue (or refresh) the per-trip invoice owed to the freelancer — via the
      // API, with a localStorage fallback so the demo still records it offline.
      const payload = {
        orderId: order.orderNumber ?? order.id,
        orderNumber: order.orderNumber ?? order.id,
        truckId: pickTruck,
        driverId: driverId || undefined,
        amount: feeNum,
        orderRevenue: orderRevenue ?? undefined,
      };
      try {
        await api.post('/freelancer-invoices', payload);
      } catch {
        if (!invoiceForOrderTruck(order.id, pickTruck)) {
          addFreelancerInvoice((order as { carrierId?: string }).carrierId ?? CURRENT_CARRIER_ID, payload);
        }
      }
      notify.success('تم إسناد الطلب للفري‑لانسر', `أُنشئت فاتورة رحلة بمبلغ ${feeNum.toLocaleString('en-US')} ر.س.`);
    } else {
      notify.success('تم إسناد الشاحنة للطلب', `${pickedTruck.code ?? ''}`);
    }
    setAssignDriverOpen(false);
    setPickTruck('');
    setTripFee('');
  };

  return (
    <>
      <PageHeader
        title={order.orderNumber}
        subtitle={`${order.originCity} ← ${order.destinationCity} · ${formatDateTime(order.createdAt)}`}
        actions={
          <>
            <StatusBadge status={order.status} />
            <Button variant="outline" onClick={() => router.push('/orders')}>
              <ArrowRight className="h-4 w-4 rtl:rotate-180" /> رجوع
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <MapSection order={order} />

          {order.orderType === 'CONSOLIDATED' && (
            <ConsolidatedPanel order={order as Order} canDistribute={showShipmentCard} />
          )}

          {showShipmentCard && (
            <ShipmentStatusCard
              order={order}
              effectivePickup={effectivePickup}
              effectiveDelivery={effectiveDelivery}
              fromCarrierBid={!!(myAcceptedBid?.proposedDeliveryDate || myAcceptedBid?.proposedPickupDate)}
              events={timeline}
              titles={TITLES}
            />
          )}

          {showActions && (
            <Card className="border-primary/30">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Navigation className="h-5 w-5 text-primary" />
                    إجراءات الرحلة
                  </CardTitle>
                  <StatusBadge status={order.status} />
                </div>
              </CardHeader>
              <CardContent>
                {order.status === 'ASSIGNED' && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      الطلب أُسند إليك. أكّد الاستلام عند الوصول لنقطة التحميل.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button onClick={() => setConfirmPickupOpen(true)} className="flex-1 sm:flex-none">
                        <CheckCircle2 className="h-4 w-4" /> تأكيد الاستلام
                      </Button>
                      <Button variant="outline" onClick={() => { setPickTruck(assignedTruck?.id ?? ''); setAssignDriverOpen(true); }} className="flex-1 sm:flex-none">
                        <Truck className="h-4 w-4" /> إسناد شاحنة
                      </Button>
                      <Button variant="outline" onClick={() => setDisputeOpen(true)} className="text-destructive border-destructive/30">
                        <Shield className="h-4 w-4" /> فتح نزاع
                      </Button>
                    </div>
                  </div>
                )}
                {order.status === 'CONFIRMED' && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      التحميل مؤكَّد. ابدأ الرحلة عند مغادرة نقطة الاستلام.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button onClick={() => setStartTripOpen(true)} className="flex-1 sm:flex-none">
                        <Truck className="h-4 w-4" /> بدأت الرحلة
                      </Button>
                      <Button variant="outline" onClick={() => setDisputeOpen(true)} className="text-destructive border-destructive/30">
                        <Shield className="h-4 w-4" /> فتح نزاع
                      </Button>
                    </div>
                  </div>
                )}
                {order.status === 'IN_TRANSIT' && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="inline-block h-2 w-2 bg-info rounded-full animate-pulse" />
                      <span className="text-muted-foreground">الشحنة في الطريق إلى</span>
                      <span className="font-semibold">{order.destinationCity}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button onClick={() => setMarkDeliveredOpen(true)} className="flex-1 sm:flex-none">
                        <CheckCircle2 className="h-4 w-4" /> تأكيد التسليم
                      </Button>
                      <Button variant="outline" onClick={() => setUpdateLocOpen(true)}>
                        <MapPin className="h-4 w-4" /> تحديث الموقع
                      </Button>
                      <Button variant="outline" onClick={() => setDisputeOpen(true)} className="text-destructive border-destructive/30">
                        <Shield className="h-4 w-4" /> فتح نزاع
                      </Button>
                    </div>
                  </div>
                )}
                {order.status === 'DELIVERED' && (
                  <EscrowCountdown
                    deliveredAt={timeline.find((t) => t.kind === 'DELIVERED')?.at ?? new Date()}
                    total={order.agreedPrice ?? 0}
                  />
                )}
                {order.status === 'COMPLETED' && (
                  <div className="rounded-md bg-success/10 border border-success/30 p-3 flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">الرحلة مكتملة وتم تحويل المبلغ</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        صافي المستلم: <Currency amount={order.carrierAmount ?? 0} />
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Escrow status (always shown if order is confirmed+) */}
          {order.agreedPrice && ['CONFIRMED', 'IN_TRANSIT', 'DELIVERED'].includes(order.status) && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-warning/15 text-warning grid place-items-center shrink-0">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-semibold text-sm">مبلغ Escrow محتجز</span>
                      <Badge variant="warning">محجوز</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      سيُفرَج تلقائيا بعد تأكيد العميل لاستلام الشحنة
                    </p>
                    <dl className="mt-3 pt-3 border-t space-y-1 text-xs">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">المبلغ المتّفق</dt>
                        <dd className="font-medium"><Currency amount={order.agreedPrice} /></dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">عمولة المنصة (8%)</dt>
                        <dd className="text-destructive">−<Currency amount={(order.commission ?? order.agreedPrice * 0.08)} /></dd>
                      </div>
                      <div className="flex justify-between pt-1 border-t font-semibold">
                        <dt>صافي مستحقّك</dt>
                        <dd className="text-success"><Currency amount={order.carrierAmount ?? (order.agreedPrice * 0.92)} /></dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* When ShipmentStatusCard is showing, it includes the tracking
              timeline inline (matches the client portal's layout). Only
              render the standalone "سجل الأحداث" card for orders that don't
              get the shipment card (DRAFT / PUBLISHED / BIDDING / CANCELLED). */}
          {!showShipmentCard && (
            <Card>
              <CardHeader><CardTitle>سجل الأحداث</CardTitle></CardHeader>
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
                          <div className="text-sm font-medium">{TITLES[ev.kind] ?? ev.kind}</div>
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
          {client && (
            <Card>
              <CardHeader><CardTitle>العميل</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 mb-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>{(client.nameAr ?? '').split(' ').slice(0, 2).map((w) => w[0] ?? '').join('')}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{client.nameAr}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Building2 className="h-3 w-3" /> {client.city}
                    </div>
                  </div>
                </div>
                <dl className="divide-y">
                  <Row label="رقم التواصل" icon={Phone} value={<span className="num" dir="ltr">{client.contactPhone}</span>} />
                  <Row label="البريد" icon={Mail} value={<span className="num text-xs">{client.contactEmail}</span>} />
                </dl>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle>تفاصيل الشحنة</CardTitle></CardHeader>
            <CardContent>
              {order.orderType !== 'CONSOLIDATED' && showShipmentCard && assignedPlate && (
                <div className="mb-4 rounded-lg border bg-muted/30 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                      <Truck className="h-3.5 w-3.5" /> الشاحنة والسائق
                    </div>
                    {showActions && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setPickTruck(assignedTruck?.id ?? ''); setAssignDriverOpen(true); }}>
                        تغيير
                      </Button>
                    )}
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
                        <Users className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{assignedDriver.fullName}</div>
                        <div className="text-xs text-muted-foreground"><span className="num">{assignedDriver.code}</span> · رخصة {assignedDriver.licenseClass}</div>
                      </div>
                      <a href={`tel:${assignedDriver.phone}`} dir="ltr" className="num inline-flex items-center gap-1 text-xs font-medium text-[hsl(var(--mint))]">
                        <Phone className="h-3.5 w-3.5" /> {assignedDriver.phone}
                      </a>
                    </div>
                  )}
                </div>
              )}
              <dl className="divide-y">
                <Row label="الوصف" value={order.cargoDescription} />
                <Row label="الوزن" icon={Weight} value={<span className="num">{(order.weightKg ?? 0).toLocaleString('en-US')} كجم</span>} />
                <Row label="نوع الشاحنة" icon={Truck} value={order.truckType} />
                <Row label="تأمين" icon={ShieldCheck} value={order.requiresInsurance ? 'مطلوب' : '—'} />
                <Row label="تبريد" icon={Snowflake} value={order.requiresRefrigeration ? 'مطلوب' : '—'} />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>المسار</CardTitle></CardHeader>
            <CardContent>
              <dl className="divide-y">
                <Row label="من" icon={MapPin} value={`${order.originCity}، ${order.originAddress}`} />
                <Row label="إلى" icon={MapPin} value={`${order.destinationCity}، ${order.destinationAddress}`} />
                <Row label="الاستلام" icon={Calendar} value={formatDate(order.pickupDate, 'EEEE d MMM · HH:mm')} />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>المالية</CardTitle></CardHeader>
            <CardContent>
              <dl className="divide-y">
                <Row label="السعر المتفق" value={<Currency amount={order.agreedPrice} />} />
                <Row label="العمولة" value={<Currency amount={order.commission ?? 0} />} />
                <Row label="صافي إلى حسابك" value={<Currency amount={order.carrierAmount} />} />
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirm pickup (ASSIGNED → CONFIRMED) */}
      <Dialog open={confirmPickupOpen} onOpenChange={setConfirmPickupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأكيد الاستلام</DialogTitle>
            <DialogDescription>سيتحوّل الطلب إلى "مؤكَّد" ويصل إشعار للعميل.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <p className="text-sm">هل أنت متأكد أنك وصلت لنقطة التحميل وجاهز للاستلام؟</p>
            <div className="rounded-md bg-info/10 border border-info/30 p-3 text-xs flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-info shrink-0 mt-0.5" />
              <span className="text-muted-foreground">بعد التأكيد انقر "بدأت الرحلة" عند مغادرة نقطة الاستلام.</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmPickupOpen(false)}>إلغاء</Button>
            <Button
              onClick={async () => {
                if (!order) return;
                try {
                  await api.post(`/orders/${order.id}/confirm`, {});
                  notify.success('تم تأكيد الاستلام', 'الطلب أصبح مؤكَّدا');
                  await refetchOrder();
                  setConfirmPickupOpen(false);
                } catch (err: unknown) {
                  notify.error(err, 'فشل تأكيد الاستلام');
                }
              }}
            >
              <CheckCircle2 className="h-4 w-4" /> تأكيد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Start trip (CONFIRMED → IN_TRANSIT via PICKED_UP tracking event) */}
      <Dialog open={startTripOpen} onOpenChange={setStartTripOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>بدء الرحلة</DialogTitle>
            <DialogDescription>سيتحوّل الطلب إلى "في الطريق" وتُفعَّل خريطة التتبع للعميل.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm">هل غادرت نقطة الاستلام وتوجّهت للوجهة؟</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStartTripOpen(false)}>إلغاء</Button>
            <Button
              onClick={async () => {
                if (!order) return;
                try {
                  await api.post(`/orders/${order.id}/tracking`, {
                    status: 'PICKED_UP',
                    description: 'بدأت الرحلة، الشحنة في الطريق',
                  });
                  notify.success('بدأت الرحلة', 'العميل يتابع الشحنة الآن');
                  await refetchOrder();
                  setStartTripOpen(false);
                } catch (err: unknown) {
                  notify.error(err, 'فشل تحديث الحالة');
                }
              }}
            >
              <Truck className="h-4 w-4" /> بدأت الرحلة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark delivered */}
      <Dialog open={markDeliveredOpen} onOpenChange={setMarkDeliveredOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تأكيد التسليم</DialogTitle>
            <DialogDescription>سيُرسل إشعار للعميل ليؤكد الاستلام ويُفرَج المبلغ.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <p className="text-sm">تأكّد قبل التسليم من:</p>
            <ul className="list-disc ps-6 space-y-1 text-sm text-muted-foreground">
              <li>توقيع المستلم على بوليصة التسليم</li>
              <li>التقاط صورة للبضاعة بعد التفريغ</li>
              <li>لا يوجد ضرر ظاهر على الشحنة</li>
            </ul>
            <div className="rounded-md bg-success/10 border border-success/30 p-3 text-xs flex items-start gap-2 mt-3">
              <ShieldCheck className="h-4 w-4 text-success shrink-0 mt-0.5" />
              <span className="text-muted-foreground">
                سيُحوَّل مبلغك تلقائيا من Escrow بعد تأكيد العميل أو خلال 72 ساعة.
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMarkDeliveredOpen(false)}>إلغاء</Button>
            <Button
              onClick={async () => {
                if (!order) return;
                try {
                  await api.post(`/orders/${order.id}/deliver`, {});
                  playSoundIfEnabled('orderCompleted');
                  notify.success('تم تأكيد التسليم', 'سيُفرَج المبلغ بعد تأكيد العميل أو خلال 72 ساعة');
                  await refetchOrder();
                  setMarkDeliveredOpen(false);
                } catch (err: unknown) {
                  notify.error(err, 'فشل تأكيد التسليم');
                }
              }}
            >
              <CheckCircle2 className="h-4 w-4" /> تأكيد التسليم
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update location */}
      <Dialog open={updateLocOpen} onOpenChange={setUpdateLocOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تحديث موقع الشاحنة</DialogTitle>
            <DialogDescription>سيُحدَّث الموقع لحظيا للعميل والأدمن.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>الموقع الحالي</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="مثال: عند مفرق الزلفي على طريق الرياض-القصيم" />
            </div>
            <Button variant="outline" className="w-full" onClick={() => setLocation('استخدام موقع GPS الحالي للسائق')}>
              <Navigation className="h-4 w-4" /> استخدام GPS الحالي
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateLocOpen(false)}>إلغاء</Button>
            <Button
              onClick={async () => {
                // POST /orders/:id/tracking — adds a TrackingEvent with the
                // free-text location note. Backend will surface it in the
                // shipment timeline for the client + admin.
                if (!order || !location) return;
                try {
                  await api.post(`/orders/${order.id}/tracking`, {
                    status: 'IN_TRANSIT',
                    description: location,
                  });
                  await refetchOrder();
                  notify.success('تم تحديث الموقع', 'سيظهر للعميل لحظيا');
                  setUpdateLocOpen(false);
                  setLocation('');
                } catch (err) {
                  notify.error(err, 'فشل تحديث الموقع');
                }
              }}
              disabled={!location}
            >
              <MapPin className="h-4 w-4" /> تحديث
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign driver */}
      <Dialog open={assignDriverOpen} onOpenChange={(o) => { setAssignDriverOpen(o); if (!o) { setPickTruck(''); setTripFee(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>إسناد شاحنة للطلب</DialogTitle>
            <DialogDescription>اختر شاحنة من أسطولك — السائق المربوط بها يُسنَد تلقائيا لهذا الطلب.</DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-2 max-h-64 overflow-y-auto">
            {TRUCKS.map((t) => {
              const drv = DRIVERS.find((d) => d.id === driverForTruck(t.id));
              const parsed = parsePlateString(t.plateNumber);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setPickTruck(t.id)}
                  className={`w-full flex items-center gap-3 rounded-lg border p-2.5 text-start transition-colors
                    ${pickTruck === t.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                >
                  <div className="w-[96px] shrink-0">
                    <SaudiLicensePlate letters={parsed.letters} numbers={parsed.numbers} plateType="transport" size="fill" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="num text-sm font-medium">{t.code}</span>
                      <OwnershipBadge ownership={t.ownership} />
                    </div>
                    <div className="truncate text-xs text-muted-foreground">{drv ? drv.fullName : 'بدون سائق'}</div>
                  </div>
                  {pickTruck === t.id && <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />}
                </button>
              );
            })}
          </div>

          {isFreelancerPick && (
            <div className="space-y-2 rounded-lg border border-[hsl(var(--mint))]/30 bg-[hsl(var(--mint))]/5 p-3">
              <Label htmlFor="tripFee" className="text-sm font-medium">أجرة الرحلة للفري‑لانسر</Label>
              <div className="relative">
                <Input
                  id="tripFee"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={tripFee}
                  onChange={(e) => setTripFee(e.target.value)}
                  placeholder="0"
                  className="num pe-12"
                />
                <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-xs text-muted-foreground">ر.س.</span>
              </div>
              <p className="text-xs text-muted-foreground">
                تُنشأ فاتورة رحلة بهذا المبلغ تُستحقّ للفري‑لانسر.
                {orderRevenue !== null && feeValid && (
                  <>
                    {' '}ربحك المتوقّع{' '}
                    <span className="num font-medium text-foreground" dir="ltr">
                      {(orderRevenue - feeNum).toLocaleString('en-US')}
                    </span>{' '}ر.س.
                  </>
                )}
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setAssignDriverOpen(false); setPickTruck(''); setTripFee(''); }}>إلغاء</Button>
            <Button disabled={assignBlocked} onClick={doAssignOrderTruck}>
              <CheckCircle2 className="h-4 w-4" /> إسناد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Open dispute */}
      <Dialog open={disputeOpen} onOpenChange={setDisputeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>فتح نزاع</DialogTitle>
            <DialogDescription>سيراجع فريق الدعم النزاع خلال 24 ساعة.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-muted-foreground">سيتم نقلك لصفحة النزاعات لإكمال البيانات.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisputeOpen(false)}>إلغاء</Button>
            <Button onClick={() => { router.push('/disputes'); }}>
              <Shield className="h-4 w-4" /> الانتقال لصفحة النزاعات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Status header + pickup→delivery progress for the carrier. Surfaces what the
 * carrier most needs to see after acceptance: where the shipment is in the
 * workflow + the dates they committed to. Tracking events still live in the
 * dedicated "سجل الأحداث" card below — this is the at-a-glance summary.
 */
function ShipmentStatusCard({
  order, effectivePickup, effectiveDelivery, fromCarrierBid, events, titles,
}: {
  order: any;
  effectivePickup: string | undefined;
  effectiveDelivery: string | null;
  fromCarrierBid: boolean;
  events: Array<{ kind: string; at: string | Date; note?: string; by?: string }>;
  titles: Record<string, string>;
}) {
  const meta: Record<string, { text: string; step: 1 | 2 | 3; tone: 'info' | 'warning' | 'success' }> = {
    ASSIGNED:   { text: 'الطلب أُسند إليك، توجّه لنقطة الاستلام في الموعد المتفق', step: 1, tone: 'info' },
    CONFIRMED:  { text: 'أكّدت الموعد، توجّه إلى نقطة الاستلام',                  step: 1, tone: 'info' },
    IN_TRANSIT: { text: 'الشحنة في طريقها إلى الوجهة',                              step: 2, tone: 'warning' },
    DELIVERED:  { text: 'تم تسليم الشحنة، بانتظار تأكيد العميل',                    step: 3, tone: 'warning' },
    COMPLETED:  { text: 'مكتمل، تم الإفراج عن المبلغ',                              step: 3, tone: 'success' },
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
            <CardTitle className="flex items-center gap-2">حالة الشحنة <StatusBadge status={order.status} /></CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{m.text}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center gap-2">
          {[
            { s: 1 as const, label: 'الاستلام',  icon: MapPin },
            { s: 2 as const, label: 'في الطريق', icon: Truck },
            { s: 3 as const, label: 'التسليم',  icon: CheckCircle2 },
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
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Calendar className="h-3.5 w-3.5" /> موعد الاستلام</div>
            <div className="mt-0.5 font-medium">
              {effectivePickup ? formatDate(effectivePickup, 'EEEE d MMM') : '—'}
            </div>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Package className="h-3.5 w-3.5" /> موعد التسليم</div>
            <div className="mt-0.5 font-medium">
              {effectiveDelivery ? formatDate(effectiveDelivery, 'EEEE d MMM') : 'سيُحدَّد لاحقا'}
            </div>
            {fromCarrierBid && (
              <Badge variant="outline" className="mt-1 h-4 text-[10px]">حسب عرضك</Badge>
            )}
          </div>
        </div>

        {/* Inline tracking events — matches client portal's ShipmentProgressCard
            layout so both sides see the same visual treatment after acceptance. */}
        {events && events.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase mb-2">تتبّع الشحنة</div>
            <ol className="relative space-y-3">
              {events.map((ev, i) => (
                <li key={i} className="relative ps-7">
                  {i < events.length - 1 && <span aria-hidden className="absolute top-5 bottom-[-12px] start-[9px] w-px bg-border" />}
                  <span className="absolute start-0 top-1 grid place-items-center h-5 w-5 rounded-full bg-primary border-2 border-background">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
                  </span>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">{titles[ev.kind] ?? ev.kind}</div>
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

function MapSection({ order }: { order: any }) {
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
        origin={{ ...o, label: order.originCity }}
        destination={{ ...d, label: order.destinationCity }}
        progress={isConsolidated ? undefined : progress}
        trucks={isConsolidated ? trucks : undefined}
        live={order.status === 'IN_TRANSIT'}
        height={300}
        className="rounded-b-none border-b"
      />
      <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
        <RouteStat icon={MapPin} label="المسافة" value={<span className="num">{(km ?? 0).toLocaleString('en-US')} كم</span>} />
        <RouteStat icon={Timer} label="المدة المتوقعة" value={duration} />
        <RouteStat icon={Navigation} label="الطريق" value={road} />
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

'use client';
import { useMemo, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { CheckCircle2, Layers, Link2Off, MapPin, Truck as TruckIcon, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SaudiLicensePlate, parsePlateString } from '@/components/saudi-plate';
import { OwnershipBadge } from '@/components/fleet-bits';
import { Currency } from '@/components/currency';
import { useFleetStore } from '@/stores/fleet-store';
import { useConsolidatedStore, effectiveLegs } from '@/stores/consolidated-store';
import { useFreelancerStore } from '@/stores/freelancer-store';
import { api, fetcher } from '@/lib/api';
import { notify } from '@/lib/notify';
import {
  CURRENT_CARRIER_ID, DRIVERS, TRUCKS, localizeCity, normalizeTruckList, normalizeDriverList,
  type ConsolidatedLeg, type ConsolidatedLegStatus, type Driver, type Order, type Truck,
} from '@naqla/shared-utils';

type LegsResponse = { truckCount: number; status: string; heterogeneous?: boolean; legs: ConsolidatedLeg[] };

const LEG_LABEL: Record<ConsolidatedLegStatus, string> = {
  PENDING: 'لم تُوزَّع',
  ASSIGNED: 'موزّعة',
  IN_TRANSIT: 'في الطريق',
  DELIVERED: 'سُلّمت',
};
const LEG_TONE: Record<ConsolidatedLegStatus, string> = {
  PENDING: 'bg-muted text-muted-foreground',
  ASSIGNED: 'bg-[hsl(var(--mint))]/15 text-[hsl(var(--mint))]',
  IN_TRANSIT: 'bg-[hsl(var(--mint))]/15 text-[hsl(var(--mint))]',
  DELIVERED: 'bg-[hsl(var(--mint))]/15 text-[hsl(var(--mint))]',
};

export function ConsolidatedPanel({ order, canDistribute = false }: { order: Order; canDistribute?: boolean }) {
  const overrides = useConsolidatedStore((s) => s.overrides[order.id] ?? {});
  const distribute = useConsolidatedStore((s) => s.distribute);
  const clearLeg = useConsolidatedStore((s) => s.clearLeg);
  const assignMap = useFleetStore((s) => s.assign);
  const addFreelancerInvoice = useFreelancerStore((s) => s.addInvoice);
  const invoiceForOrderTruck = useFreelancerStore((s) => s.invoiceForOrderTruck);

  const [openLeg, setOpenLeg] = useState<number | null>(null);
  const [pick, setPick] = useState('');
  const [tripFee, setTripFee] = useState('');

  // Live legs + fleet from the API (mock fallback when the backend is down).
  const { data: legsData } = useSWR<LegsResponse>(`/orders/${order.id}/legs`, fetcher);
  const { data: trucksRaw } = useSWR<unknown>('/fleet/trucks', fetcher);
  const { data: driversRaw } = useSWR<unknown>('/fleet/drivers', fetcher);
  const { mutate } = useSWRConfig();
  const apiMode = !!legsData && Array.isArray(legsData.legs);

  const srcTrucks = useMemo<Truck[]>(() => {
    const api2 = normalizeTruckList<Truck>(trucksRaw);
    return api2.length ? api2 : TRUCKS;
  }, [trucksRaw]);
  const srcDrivers = useMemo<Driver[]>(() => {
    const api2 = normalizeDriverList<Driver>(driversRaw);
    return api2.length ? api2 : DRIVERS;
  }, [driversRaw]);

  const legs = apiMode ? legsData!.legs : effectiveLegs(order.legs ?? [], overrides);
  const count = apiMode ? legsData!.truckCount : (order.truckCount ?? legs.length);
  const distributed = legs.filter((l) => l.truckId).length;
  const heterogeneous = !!legsData?.heterogeneous;
  const legPriceSum = legs.reduce((s, l) => s + (l.price ?? 0), 0);
  const perLeg = Math.round((order.agreedPrice ?? 0) / Math.max(1, count));
  const invoiceTotal = heterogeneous && legPriceSum > 0 ? legPriceSum : (order.agreedPrice ?? 0);
  // The leg currently being distributed — used to constrain the truck picker to
  // the leg's required type for a heterogeneous order.
  const openLegSpec = openLeg != null ? legs.find((l) => l.index === openLeg) : undefined;
  const pct = count > 0 ? Math.round((distributed / count) * 100) : 0;

  const revalidate = () => { mutate(`/orders/${order.id}/legs`); mutate(`/orders/${order.id}`); };

  // trucks already used by other legs of THIS order
  const usedTrucks = new Set(legs.filter((l) => l.truckId).map((l) => l.truckId));

  const driverForTruck = (truckId: string) =>
    (truckId in assignMap ? assignMap[truckId] : srcTrucks.find((t) => t.id === truckId)?.assignedDriverId) ?? '';

  const pickedTruck = srcTrucks.find((t) => t.id === pick);
  const isFreelancerPick = pickedTruck?.ownership === 'FREELANCER';
  const feeNum = Number(tripFee);
  const feeValid = Number.isFinite(feeNum) && feeNum > 0;
  const distributeBlocked = openLeg == null || !pick || (isFreelancerPick && !feeValid);

  const doDistribute = async () => {
    if (distributeBlocked || !pickedTruck) return;
    const driverId = driverForTruck(pick);
    if (apiMode) {
      try {
        await api.post(`/orders/${order.id}/legs/${openLeg}/distribute`, { truckId: pick, driverId: driverId || undefined });
        revalidate();
      } catch (e) { notify.error(e); return; }
    } else {
      distribute(order.id, openLeg!, pick, driverId);
    }
    const legOrderId = `${order.orderNumber ?? order.id}-L${openLeg}`;
    if (isFreelancerPick) {
      // Per-leg freelancer invoice — orderRevenue snapshots the leg's share.
      const payload = {
        orderId: legOrderId,
        orderNumber: `${order.orderNumber ?? order.id} · شاحنة ${openLeg}`,
        truckId: pick,
        driverId: driverId || undefined,
        amount: feeNum,
        orderRevenue: perLeg,
      };
      try {
        await api.post('/freelancer-invoices', payload);
      } catch {
        if (!invoiceForOrderTruck(legOrderId, pick)) {
          addFreelancerInvoice((order as { carrierId?: string }).carrierId ?? CURRENT_CARRIER_ID, payload);
        }
      }
      notify.success('تم توزيع الرِجل للفري‑لانسر', `أُنشئت فاتورة رحلة بمبلغ ${feeNum.toLocaleString('en-US')} ر.س.`);
    } else {
      notify.success('تم توزيع الرِجل', `شاحنة ${openLeg} → ${pickedTruck.code ?? ''}`);
    }
    setOpenLeg(null);
    setPick('');
    setTripFee('');
  };

  const doClearLeg = async (index: number) => {
    if (apiMode) {
      try {
        await api.delete(`/orders/${order.id}/legs/${index}`);
        revalidate();
      } catch (e) { notify.error(e); }
    } else {
      clearLeg(order.id, index);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-[hsl(var(--mint))]" /> طلب مجمّع · {count} شاحنات
              </CardTitle>
              <CardDescription className="mt-1 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> {localizeCity(order.originCity)} ← {heterogeneous ? 'وجهات متعددة' : localizeCity(order.destinationCity)}
              </CardDescription>
            </div>
            <div className="text-end">
              <div className="num text-sm font-bold">{distributed} / {count}</div>
              <div className="text-xs text-muted-foreground">موزّعة على شاحناتك</div>
            </div>
          </div>
          {/* progress */}
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-[hsl(var(--mint))] transition-all" style={{ width: `${pct}%` }} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {canDistribute && distributed < count && (
            <p className="text-xs text-muted-foreground">وزّع كل رِجل على شاحنة من أسطولك — السائق المربوط بها يُضاف تلقائيا.</p>
          )}
          {legs.map((leg) => {
            const truck = srcTrucks.find((t) => t.id === leg.truckId);
            const driver = srcDrivers.find((d) => d.id === leg.driverId);
            const plate = truck ? parsePlateString(truck.plateNumber) : null;
            return (
              <div key={leg.index} className="flex items-center gap-3 rounded-lg border p-3">
                <span className="num flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold">{leg.index}</span>
                {truck && plate ? (
                  <>
                    <div className="w-[120px] shrink-0">
                      <SaudiLicensePlate letters={plate.letters} numbers={plate.numbers} plateType="transport" size="fill" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium num">{truck.code}</div>
                      {heterogeneous && (
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground flex-wrap">
                          <TruckIcon className="h-3 w-3" />{leg.requiredTruckType}
                          {leg.destinationCity && <>· <MapPin className="h-3 w-3" />{localizeCity(leg.destinationCity)}</>}
                        </div>
                      )}
                      {driver && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="h-3 w-3" /> {driver.fullName}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <TruckIcon className="h-4 w-4 opacity-40" /> لم تُوزَّع بعد
                    </div>
                    {heterogeneous && (
                      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground flex-wrap">
                        <TruckIcon className="h-3 w-3" />{leg.requiredTruckType}
                        {leg.destinationCity && <>· <MapPin className="h-3 w-3" />{localizeCity(leg.destinationCity)}</>}
                      </div>
                    )}
                  </div>
                )}
                {heterogeneous && leg.price != null && (
                  <span className="shrink-0 text-xs font-semibold"><Currency amount={leg.price} /></span>
                )}
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${LEG_TONE[leg.status]}`}>
                  {LEG_LABEL[leg.status]}
                </span>
                {canDistribute && (
                  leg.truckId ? (
                    leg.status === 'PENDING' || leg.status === 'ASSIGNED' ? (
                      <Button variant="ghost" size="sm" className="shrink-0" onClick={() => doClearLeg(leg.index)}>
                        <Link2Off className="h-4 w-4" />
                      </Button>
                    ) : null
                  ) : (
                    <Button size="sm" className="shrink-0" onClick={() => { setPick(''); setOpenLeg(leg.index); }}>
                      توزيع
                    </Button>
                  )
                )}
              </div>
            );
          })}

          {/* Consolidated invoice */}
          <div className="mt-2 rounded-lg border bg-muted/20 p-4">
            <div className="mb-2 text-sm font-semibold">الفاتورة المجمّعة</div>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground num">{heterogeneous ? <>{count} شاحنات · تسعير لكل ساق</> : <>{count} شاحنات × <Currency amount={perLeg} /></>}</dt>
                <dd><Currency amount={invoiceTotal} /></dd>
              </div>
              {order.commission != null && (
                <div className="flex justify-between text-muted-foreground">
                  <dt>عمولة المنصة</dt>
                  <dd>− <Currency amount={order.commission} /></dd>
                </div>
              )}
              <div className="flex justify-between border-t pt-1.5 font-semibold">
                <dt>صافي مستحقّك</dt>
                <dd><Currency amount={order.carrierAmount ?? order.agreedPrice ?? 0} /></dd>
              </div>
            </dl>
            <p className="mt-2 text-[11px] text-muted-foreground">فاتورة واحدة مجمّعة برقم الطلب {order.orderNumber}.</p>
          </div>
        </CardContent>
      </Card>

      {/* Distribute dialog */}
      <Dialog open={openLeg != null} onOpenChange={(o) => { if (!o) { setOpenLeg(null); setPick(''); setTripFee(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>توزيع الشاحنة رقم {openLeg}</DialogTitle>
            <DialogDescription>
              اختر شاحنة من أسطولك — السائق المربوط بها يُسنَد تلقائيا.
              {heterogeneous && openLegSpec?.requiredTruckType && (
                <span className="mt-1 block">هذه الساق تتطلّب نوع شاحنة: <span className="font-medium text-foreground">{openLegSpec.requiredTruckType}</span></span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <Select value={pick} onValueChange={setPick}>
              <SelectTrigger><SelectValue placeholder="اختر شاحنة" /></SelectTrigger>
              <SelectContent>
                {srcTrucks.map((t) => {
                  const used = usedTrucks.has(t.id);
                  // Heterogeneous legs require a matching truck type (also enforced server-side).
                  const typeMismatch = heterogeneous && !!openLegSpec?.requiredTruckType && t.truckType !== openLegSpec.requiredTruckType;
                  const drv = srcDrivers.find((d) => d.id === driverForTruck(t.id))?.fullName;
                  const tag = t.ownership === 'FREELANCER' ? ' · فري‑لانسر' : '';
                  return (
                    <SelectItem key={t.id} value={t.id} disabled={used || typeMismatch}>
                      {t.code} · {t.plateNumber}{drv ? ` · ${drv}` : ''}{tag}{used ? ' (مستخدمة بهذا الطلب)' : typeMismatch ? ' (نوع غير مطابق)' : ''}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            {pickedTruck && (
              <div className="flex items-center justify-between text-xs">
                <OwnershipBadge ownership={pickedTruck.ownership} />
                <span className="text-muted-foreground">
                  حصّة الرِجل من الإيراد{' '}
                  <span className="num font-medium text-foreground" dir="ltr">{perLeg.toLocaleString('en-US')}</span>{' '}ر.س.
                </span>
              </div>
            )}

            {isFreelancerPick && (
              <div className="space-y-2 rounded-lg border border-[hsl(var(--mint))]/30 bg-[hsl(var(--mint))]/5 p-3">
                <Label htmlFor="legTripFee" className="text-sm font-medium">أجرة الرحلة للفري‑لانسر</Label>
                <div className="relative">
                  <Input
                    id="legTripFee"
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
                {feeValid && (
                  <p className="text-xs text-muted-foreground">
                    ربح الرِجل المتوقّع{' '}
                    <span className="num font-medium text-foreground" dir="ltr">{(perLeg - feeNum).toLocaleString('en-US')}</span>{' '}ر.س.
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpenLeg(null); setPick(''); setTripFee(''); }}>إلغاء</Button>
            <Button onClick={doDistribute} disabled={distributeBlocked}><CheckCircle2 className="h-4 w-4" /> توزيع</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

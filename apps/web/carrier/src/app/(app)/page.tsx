'use client';
import { useMemo } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import {
  ArrowLeft, Clock, Compass, Package, Star, TrendingUp, Truck, Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/page-header';
import { StatsCard } from '@/components/stats-card';
import { StatusBadge } from '@/components/status-badge';
import { Currency } from '@/components/currency';
import { fetcher } from '@/lib/api';
import {
  CURRENT_CARRIER_ID, DRIVERS, TRUCKS, companyById, formatDate,
  openOpportunitiesForCarrier, ordersForCarrier, paymentsForCarrier,
  normalizeOrderList, type Order,
} from '@naqla/shared-utils';

export default function CarrierDashboard() {
  const me = companyById(CURRENT_CARRIER_ID)!;

  // GET /orders → list filtered by role: includes both marketplace
  // opportunities AND orders assigned to this carrier. GET /orders?mine=true
  // returns only the carrier's own orders. Mocks fall back if API down.
  const { data: oppsData }  = useSWR<unknown>('/orders', fetcher);
  const { data: mineData }  = useSWR<unknown>('/orders?mine=true', fetcher);
  const { data: trucksData } = useSWR<unknown>('/fleet/trucks', fetcher);
  const { data: paysData }  = useSWR<unknown>('/payments', fetcher);

  const opps: Order[] = useMemo(() => {
    const arr = normalizeOrderList(oppsData);
    return arr.length > 0 ? arr : openOpportunitiesForCarrier(CURRENT_CARRIER_ID);
  }, [oppsData]);
  const myOrders: Order[] = useMemo(() => {
    const arr = normalizeOrderList(mineData);
    return arr.length > 0 ? arr : ordersForCarrier(CURRENT_CARRIER_ID);
  }, [mineData]);
  const activeOrders = myOrders.filter((o) => ['ASSIGNED', 'CONFIRMED', 'IN_TRANSIT'].includes(o.status));

  const trucks = useMemo(() => {
    const arr =
      Array.isArray(trucksData) ? trucksData :
      Array.isArray((trucksData as { items?: unknown[] })?.items) ? (trucksData as { items: unknown[] }).items :
      [];
    return arr.length > 0 ? arr as typeof TRUCKS : TRUCKS;
  }, [trucksData]);
  const available = trucks.filter((t) => t.status === 'AVAILABLE').length;

  const payments = useMemo(() => {
    const arr =
      Array.isArray(paysData) ? paysData :
      Array.isArray((paysData as { items?: unknown[] })?.items) ? (paysData as { items: unknown[] }).items :
      [];
    return arr.length > 0 ? arr as ReturnType<typeof paymentsForCarrier> : paymentsForCarrier(CURRENT_CARRIER_ID);
  }, [paysData]);
  const monthlyNet = payments
    .filter((p) => p.state === 'RELEASED')
    .reduce((s, p) => s + (p.amount - p.commission - p.vat), 0);

  return (
    <>
      <PageHeader
        title="مرحباً بعودتك 👋"
        subtitle={`${opps.length} فرصة متاحة · ${activeOrders.length} طلب نشط`}
        actions={
          <Link href="/opportunities">
            <Button>
              <Compass className="h-4 w-4" />
              استكشف الفرص
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard label="فرص متاحة" value={opps.length} hint="مفتوحة + موجّهة لشركتك" icon={Compass} tone="default" />
        <StatsCard label="طلباتي النشطة" value={activeOrders.length} hint="قيد التنفيذ" icon={Package} tone="warning" />
        <StatsCard label="شاحنات متاحة" value={`${available}/${trucks.length}`} hint={`${DRIVERS.length} سائق`} icon={Truck} tone="default" />
        <StatsCard
          label="أرباح الشهر"
          value={<Currency amount={monthlyNet} />}
          hint="صافي بعد العمولة"
          icon={Wallet}
          tone="success"
        />
      </div>

      {/* KPI band */}
      <Card>
        <CardContent className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-5 divide-y sm:divide-y-0 sm:divide-x">
          <Kpi icon={Star} label="تقييم الشركة" value={`${me.rating?.toFixed(1)} ⭐`} hint={`${(me.completedTrips ?? 0).toLocaleString('en-US')} رحلة`} />
          <Kpi icon={TrendingUp} label="رحلات منجزة" value={(me.completedTrips ?? 0).toLocaleString('en-US')} hint="على المنصة" />
          <Kpi icon={Clock} label="متوسّط الاستجابة" value={`${me.responseTimeMins} دقيقة`} hint="من نشر الطلب" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>فرص نقل جديدة</CardTitle>
                <CardDescription className="mt-1">{opps.length} فرصة متاحة الآن</CardDescription>
              </div>
              <Link href="/opportunities">
                <Button variant="ghost" size="sm" className="gap-1">
                  الكل
                  <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المسار</TableHead>
                  <TableHead>الاستلام</TableHead>
                  <TableHead className="text-end">الوزن</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {opps.slice(0, 5).map((o) => (
                  <TableRow key={o.id} className="cursor-pointer" onClick={() => (window.location.href = `/opportunities/${o.id}`)}>
                    <TableCell>
                      <div>
                        <div className="text-sm">{o.originCity} ← {o.destinationCity}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[220px]">{o.cargoDescription}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(o.pickupDate)}</TableCell>
                    <TableCell className="text-end num text-sm">{o.weightKg.toLocaleString('en-US')} كجم</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>طلباتي الجارية</CardTitle>
                <CardDescription className="mt-1">{myOrders.length} طلب</CardDescription>
              </div>
              <Link href="/orders">
                <Button variant="ghost" size="sm" className="gap-1">
                  الكل
                  <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم</TableHead>
                  <TableHead>المسار</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead className="text-end">الأجرة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myOrders.slice(0, 5).map((o) => (
                  <TableRow key={o.id} className="cursor-pointer" onClick={() => (window.location.href = `/orders/${o.id}`)}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{o.orderNumber}</TableCell>
                    <TableCell>{o.originCity} ← {o.destinationCity}</TableCell>
                    <TableCell><StatusBadge status={o.status} /></TableCell>
                    <TableCell className="text-end"><Currency amount={o.carrierAmount ?? o.agreedPrice} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Kpi({ icon: Icon, label, value, hint }: { icon: any; label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-center gap-3 px-4 sm:px-6 py-3 first:ps-0">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-xl font-bold num mt-0.5">{value}</div>
        {hint && <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>}
      </div>
    </div>
  );
}

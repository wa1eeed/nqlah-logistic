'use client';
import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import {
  CheckCircle2, Gauge, Package, Star, TrendingUp, Truck, Wallet, X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/page-header';
import { StatsCard } from '@/components/stats-card';
import { Currency } from '@/components/currency';
import {
  CURRENT_CARRIER_ID, bidsForCarrier, carrierById, driversForCarrier,
  ordersForCarrier, trucksForCarrier,
} from '@naqla/shared-utils';

export default function CarrierReportsPage() {
  const t = useTranslations('payments');
  const carrier = carrierById(CURRENT_CARRIER_ID);
  const orders = ordersForCarrier(CURRENT_CARRIER_ID);
  const bids = bidsForCarrier(CURRENT_CARRIER_ID);
  const trucks = trucksForCarrier(CURRENT_CARRIER_ID);
  const drivers = driversForCarrier(CURRENT_CARRIER_ID);

  const stats = useMemo(() => {
    const completed = orders.filter((o) => o.status === 'COMPLETED' || o.status === 'DELIVERED');
    const totalRevenue = completed.reduce((s, o) => s + (o.carrierAmount ?? o.agreedPrice ?? 0), 0);
    const inTransit = orders.filter((o) => o.status === 'IN_TRANSIT').length;
    const acceptedBids = bids.filter((b) => b.status === 'ACCEPTED').length;
    const totalBids = bids.length;
    const winRate = totalBids > 0 ? (acceptedBids / totalBids) * 100 : 0;
    const trucksOnTrip = trucks.filter((t) => t.status === 'ON_TRIP').length;
    const utilization = trucks.length > 0 ? (trucksOnTrip / trucks.length) * 100 : 0;
    return { completed: completed.length, totalRevenue, inTransit, winRate, utilization, acceptedBids, totalBids };
  }, [orders, bids, trucks]);

  // Monthly revenue trend (mock)
  const monthly = [
    { month: 'jan', rev: 184000 },
    { month: 'feb', rev: 211000 },
    { month: 'mar', rev: 197000 },
    { month: 'apr', rev: 248000 },
    { month: 'may', rev: 285000 },
  ];
  const maxRev = Math.max(...monthly.map((m) => m.rev));

  // Top routes
  const topRoutes = useMemo(() => {
    const map = new Map<string, { count: number; revenue: number }>();
    for (const o of orders) {
      const key = `${o.originCity} ← ${o.destinationCity}`;
      const cur = map.get(key) ?? { count: 0, revenue: 0 };
      cur.count += 1;
      cur.revenue += o.carrierAmount ?? o.agreedPrice ?? 0;
      map.set(key, cur);
    }
    return Array.from(map.entries())
      .map(([route, v]) => ({ route, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [orders]);

  // Top drivers by trips
  const topDrivers = useMemo(() => {
    return [...drivers].sort((a, b) => b.totalTrips - a.totalTrips).slice(0, 4);
  }, [drivers]);

  return (
    <>
      <PageHeader
        title={t('reports.title')}
        subtitle={t('reports.subtitle')}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatsCard
          label={t('reports.totalRevenue')}
          value={<Currency amount={stats.totalRevenue} />}
          icon={Wallet}
          tone="success"
        />
        <StatsCard
          label={t('reports.completedTrips')}
          value={stats.completed.toLocaleString('en-US')}
          icon={CheckCircle2}
        />
        <StatsCard
          label={t('reports.bidWinRate')}
          value={`${stats.winRate.toFixed(0)}%`}
          icon={TrendingUp}
          tone="success"
          hint={t('reports.winRateHint', { accepted: stats.acceptedBids, total: stats.totalBids })}
        />
        <StatsCard
          label={t('reports.fleetUtilization')}
          value={`${stats.utilization.toFixed(0)}%`}
          icon={Gauge}
          hint={t('reports.trucksCount', { count: trucks.length })}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Revenue trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('reports.monthlyRevenue')}</CardTitle>
            <CardDescription>{t('reports.last5Months')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3 sm:gap-4">
              {monthly.map((m) => (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-2">
                  <div className="text-xs font-semibold num"><Currency amount={m.rev} /></div>
                  <div
                    className="w-full rounded-t-lg bg-[hsl(var(--mint))]/85 transition-all hover:bg-[hsl(var(--mint))]"
                    style={{ height: `${Math.round((m.rev / maxRev) * 150) + 8}px` }}
                  />
                  <div className="text-xs text-muted-foreground">{t(`reports.months.${m.month}`)}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-success" />
              <span className="text-success font-medium">+15%</span>
              <span className="text-muted-foreground">{t('reports.vsPrevMonth')}</span>
            </div>
          </CardContent>
        </Card>

        {/* Profile snapshot */}
        <Card>
          <CardHeader>
            <CardTitle>{t('reports.companyPerformance')}</CardTitle>
            <CardDescription>{carrier?.nameAr}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm flex items-center gap-2">
                <Star className="h-4 w-4 fill-warning text-warning" />
                {t('reports.rating')}
              </span>
              <span className="font-bold num">{carrier?.rating?.toFixed(1)} / 5.0</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm flex items-center gap-2">
                <Truck className="h-4 w-4 text-muted-foreground" />
                {t('reports.fleetSize')}
              </span>
              <span className="font-bold num">{t('reports.trucksCount', { count: trucks.length })}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                {t('reports.totalTrips')}
              </span>
              <span className="font-bold num">{carrier?.completedTrips?.toLocaleString('en-US')}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm text-muted-foreground">{t('reports.responseTime')}</span>
              <span className="font-bold num">{carrier?.responseTimeMins} {t('reports.minutesShort')}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('reports.topRoutes')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topRoutes.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-6">{t('reports.noDataYet')}</div>
            ) : (
              topRoutes.map((r, i) => (
                <div key={r.route} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-7 w-7 rounded-md bg-primary/10 text-primary grid place-items-center text-xs font-bold shrink-0">
                      {i + 1}
                    </div>
                    <span className="text-sm truncate">{r.route}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge variant="outline" className="num">{r.count}</Badge>
                    <span className="text-xs num font-medium"><Currency amount={r.revenue} /></span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('reports.topDrivers')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {topDrivers.map((d, i) => (
              <div key={d.id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-full bg-primary/10 text-primary grid place-items-center text-sm font-bold shrink-0">
                    {i + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{d.fullName}</div>
                    <div className="text-xs text-muted-foreground">{d.licenseClass}</div>
                  </div>
                </div>
                <Badge variant="outline" className="num">{t('reports.tripsCount', { count: d.totalTrips })}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

'use client';
import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import {
  ArrowLeft, BarChart2, Clock, Compass, FileText, Package,
  Star, TrendingUp, Truck, Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/page-header';
import { StatsCard } from '@/components/stats-card';
import { StatusBadge } from '@/components/status-badge';
import { Currency } from '@/components/currency';
import { Skeleton, SkeletonStatCards, SkeletonRows } from '@/components/ui/skeleton';
import { fetcher } from '@/lib/api';
import {
  CURRENT_CARRIER_ID, DRIVERS, TRUCKS, companyById, formatDate, formatRelative,
  localizeCity,
  openOpportunitiesForCarrier, ordersForCarrier, paymentsForCarrier,
  normalizeOrderList, type Order,
} from '@naqla/shared-utils';

const STATUS_EVENT: Record<string, { labelKey: string; color: string }> = {
  ASSIGNED:   { labelKey: 'dashboard.statusEvent.ASSIGNED',   color: 'bg-success/10 text-success' },
  CONFIRMED:  { labelKey: 'dashboard.statusEvent.CONFIRMED',  color: 'bg-primary/10 text-primary' },
  IN_TRANSIT: { labelKey: 'dashboard.statusEvent.IN_TRANSIT', color: 'bg-warning/10 text-warning' },
  COMPLETED:  { labelKey: 'dashboard.statusEvent.COMPLETED',  color: 'bg-success/10 text-success' },
  DELIVERED:  { labelKey: 'dashboard.statusEvent.DELIVERED',  color: 'bg-success/10 text-success' },
};

const QUICK_ACTIONS = [
  { labelKey: 'dashboard.quickActionOpportunities', href: '/opportunities',    Icon: Compass,   color: 'bg-primary/10 text-primary' },
  { labelKey: 'dashboard.quickActionFleet',          href: '/fleet/trucks',     Icon: Truck,     color: 'bg-success/10 text-success' },
  { labelKey: 'dashboard.quickActionDocuments',      href: '/documents',        Icon: FileText,  color: 'bg-warning/10 text-warning' },
  { labelKey: 'dashboard.quickActionReports',        href: '/reports',          Icon: BarChart2, color: 'bg-muted text-muted-foreground' },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item      = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

export default function CarrierDashboard() {
  const t = useTranslations('carrier');
  const me = companyById(CURRENT_CARRIER_ID)!;

  const { data: oppsData, isLoading }   = useSWR<unknown>('/orders', fetcher);
  const { data: mineData }   = useSWR<unknown>('/orders?mine=true', fetcher);
  const { data: trucksData } = useSWR<unknown>('/fleet/trucks', fetcher);
  const { data: paysData }   = useSWR<unknown>('/payments', fetcher);

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

  const feedEvents = useMemo(() => {
    return myOrders
      .slice(0, 6)
      .filter((o) => STATUS_EVENT[o.status])
      .map((o) => ({
        id:    o.id,
        href:  `/orders/${o.id}`,
        label: t(STATUS_EVENT[o.status].labelKey),
        color: STATUS_EVENT[o.status].color,
        sub:   `${o.orderNumber} · ${localizeCity(o.originCity)} ← ${localizeCity(o.destinationCity)}`,
        time:  formatRelative(o.createdAt),
      }));
  }, [myOrders, t]);

  // First load with nothing from the API yet: show the dashboard shape as a
  // skeleton instead of flashing fallback data that then jumps to real values.
  if (isLoading && !oppsData) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-56" />
        <SkeletonStatCards count={4} />
        <SkeletonRows rows={6} />
      </div>
    );
  }

  return (
    <motion.div className="space-y-6" variants={container} initial="hidden" animate="show">

      {/* ── Header ── */}
      <motion.div variants={item} className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t('dashboard.welcomeBack')}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            <span className="num font-semibold text-foreground">{opps.length}</span> {t('dashboard.heroOpportunities')}
            <span className="mx-1.5 text-border">•</span>
            <span className="num font-semibold text-foreground">{activeOrders.length}</span> {t('dashboard.heroActiveOrders')}
          </p>
        </div>
        <Link href="/opportunities">
          <Button size="lg" className="rounded-full">
            <Compass className="h-4 w-4" />
            {t('dashboard.exploreOpportunities')}
          </Button>
        </Link>
      </motion.div>

      {/* ── Stats ── */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard label={t('dashboard.statOpportunities')}      value={opps.length}        hint={t('dashboard.statOpportunitiesHint')}  icon={Compass} tone="default" />
        <StatsCard label={t('dashboard.statActiveOrders')}  value={activeOrders.length} hint={t('dashboard.statActiveOrdersHint')}             icon={Package} tone="warning" />
        <StatsCard label={t('dashboard.statAvailableTrucks')}   value={`${available}/${trucks.length}`} hint={`${DRIVERS.length} ${t('dashboard.driversUnit')}`} icon={Truck} tone="default" />
        <StatsCard label={t('dashboard.statMonthlyEarnings')}    value={<Currency amount={monthlyNet} />} hint={t('dashboard.statMonthlyEarningsHint')} icon={Wallet} tone="success" />
      </motion.div>

      {/* ── KPI band ── */}
      <motion.div variants={item}>
        <Card>
          <CardContent className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-5 divide-y sm:divide-y-0 sm:divide-x rtl:divide-x-reverse">
            <Kpi icon={Star}       label={t('dashboard.kpiRating')}       value={(me.rating ?? 0).toFixed(1)}                           hint={`${(me.completedTrips ?? 0).toLocaleString('en-US')} ${t('dashboard.tripsUnit')}`} />
            <Kpi icon={TrendingUp} label={t('dashboard.kpiCompletedTrips')}        value={(me.completedTrips ?? 0).toLocaleString('en-US')}       hint={t('dashboard.kpiCompletedTripsHint')} />
            <Kpi icon={Clock}      label={t('dashboard.kpiResponseTime')}   value={`${me.responseTimeMins} ${t('dashboard.minutesUnit')}`}                         hint={t('dashboard.kpiResponseTimeHint')} />
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Quick Actions ── */}
      <motion.div variants={item}>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t('dashboard.quickActions')}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {QUICK_ACTIONS.map(({ labelKey, href, Icon, color }) => (
            <Link key={href} href={href}>
              <motion.div
                whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
                whileTap={{ scale: 0.97 }}
                className="flex flex-col items-center gap-2.5 rounded-2xl border bg-card p-5 cursor-pointer transition-colors hover:border-border/80"
              >
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-center">{t(labelKey)}</span>
              </motion.div>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* ── Tables + Activity Feed ── */}
      <motion.div variants={item} className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Opportunities table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t('dashboard.newOpportunities')}</CardTitle>
                <CardDescription className="mt-1">{t('dashboard.opportunitiesNow', { count: opps.length })}</CardDescription>
              </div>
              <Link href="/opportunities">
                <Button variant="ghost" size="sm" className="gap-1">
                  {t('dashboard.viewAll')}
                  <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Mobile: app-like card list */}
            <div className="md:hidden divide-y">
              {opps.slice(0, 5).map((o) => (
                <Link key={o.id} href={`/opportunities/${o.id}`} className="block p-4 transition-colors active:bg-muted/60">
                  <div className="text-sm font-medium">{localizeCity(o.originCity)} ← {localizeCity(o.destinationCity)}</div>
                  <div className="text-xs text-muted-foreground truncate">{o.cargoDescription}</div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="num text-xs text-muted-foreground">{formatDate(o.pickupDate)}</span>
                    <span className="num text-sm font-medium">{o.weightKg.toLocaleString('en-US')} {t('dashboard.weightUnit')}</span>
                  </div>
                </Link>
              ))}
            </div>
            {/* Desktop: table */}
            <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('dashboard.colRoute')}</TableHead>
                  <TableHead>{t('dashboard.colPickup')}</TableHead>
                  <TableHead className="text-end">{t('dashboard.colWeight')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {opps.slice(0, 5).map((o) => (
                  <TableRow key={o.id} className="cursor-pointer" onClick={() => (window.location.href = `/opportunities/${o.id}`)}>
                    <TableCell>
                      <div>
                        <div className="text-sm">{localizeCity(o.originCity)} ← {localizeCity(o.destinationCity)}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[180px]">{o.cargoDescription}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(o.pickupDate)}</TableCell>
                    <TableCell className="text-end num text-sm">{o.weightKg.toLocaleString('en-US')} {t('dashboard.weightUnit')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>

        {/* My Orders table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t('dashboard.myOngoingOrders')}</CardTitle>
                <CardDescription className="mt-1">{t('dashboard.ordersCount', { count: myOrders.length })}</CardDescription>
              </div>
              <Link href="/orders">
                <Button variant="ghost" size="sm" className="gap-1">
                  {t('dashboard.viewAll')}
                  <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Mobile: app-like card list */}
            <div className="md:hidden divide-y">
              {myOrders.slice(0, 5).map((o) => (
                <Link key={o.id} href={`/orders/${o.id}`} className="block p-4 transition-colors active:bg-muted/60">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{o.orderNumber}</span>
                    <StatusBadge status={o.status} />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{localizeCity(o.originCity)} ← {localizeCity(o.destinationCity)}</span>
                    <span className="text-sm font-semibold"><Currency amount={o.carrierAmount ?? o.agreedPrice} /></span>
                  </div>
                </Link>
              ))}
            </div>
            {/* Desktop: table */}
            <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('dashboard.colNumber')}</TableHead>
                  <TableHead>{t('dashboard.colRoute')}</TableHead>
                  <TableHead>{t('dashboard.colStatus')}</TableHead>
                  <TableHead className="text-end">{t('dashboard.colFare')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myOrders.slice(0, 5).map((o) => (
                  <TableRow key={o.id} className="cursor-pointer" onClick={() => (window.location.href = `/orders/${o.id}`)}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{o.orderNumber}</TableCell>
                    <TableCell>{localizeCity(o.originCity)} ← {localizeCity(o.destinationCity)}</TableCell>
                    <TableCell><StatusBadge status={o.status} /></TableCell>
                    <TableCell className="text-end"><Currency amount={o.carrierAmount ?? o.agreedPrice} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>

        {/* Activity Feed timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('dashboard.recentActivity')}</CardTitle>
            <CardDescription>{t('dashboard.recentActivitySubtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            {feedEvents.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground flex flex-col items-center gap-2">
                <Package className="h-8 w-8 text-muted-foreground/40" />
                {t('dashboard.noRecentActivity')}
              </div>
            ) : (
              <div className="relative space-y-1">
                <div className="absolute start-[14px] top-2 bottom-2 w-px bg-border" />
                {feedEvents.map((ev, i) => (
                  <motion.div
                    key={ev.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                  >
                    <Link href={ev.href}>
                      <div className="flex gap-3 rounded-lg px-1 py-2 hover:bg-muted/40 transition-colors cursor-pointer">
                        <div className={`relative z-10 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${ev.color}`}>
                          {i + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-snug">{ev.label}</p>
                          <p className="text-xs text-muted-foreground truncate">{ev.sub}</p>
                          <p className="text-xs text-muted-foreground/60 mt-0.5">{ev.time}</p>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </motion.div>

    </motion.div>
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

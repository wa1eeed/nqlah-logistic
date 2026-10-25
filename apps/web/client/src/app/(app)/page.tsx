'use client';
import { useMemo } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import {
  AlertTriangle, ArrowLeft, CheckCircle, Clock, FileText, Headphones,
  MapPin, Package, Plus, Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { StatsCard } from '@/components/stats-card';
import { StatusBadge } from '@/components/status-badge';
import { Currency } from '@/components/currency';
import { Skeleton, SkeletonStatCards, SkeletonRows } from '@/components/ui/skeleton';
import { fetcher } from '@/lib/api';
import {
  CURRENT_CLIENT_ID, formatRelative, invoicesForClient, ordersForClient,
  normalizeOrderList, type Order,
} from '@naqla/shared-utils';

const STATUS_EVENT: Record<string, { color: string }> = {
  PUBLISHED:  { color: 'bg-primary/10 text-primary' },
  BIDDING:    { color: 'bg-[hsl(var(--mint))]/12 text-[hsl(var(--mint))]' },
  ASSIGNED:   { color: 'bg-success/10 text-success' },
  IN_TRANSIT: { color: 'bg-primary/10 text-primary' },
  COMPLETED:  { color: 'bg-success/10 text-success' },
  DELIVERED:  { color: 'bg-success/10 text-success' },
};

const QUICK_ACTIONS = [
  { key: 'newOrder',    href: '/orders/new',  Icon: Plus,        color: 'bg-[hsl(var(--mint))]/12 text-[hsl(var(--mint))]' },
  { key: 'trackOrders', href: '/tracking',    Icon: MapPin,      color: 'bg-primary/10 text-primary' },
  { key: 'invoices',    href: '/invoices',    Icon: FileText,    color: 'bg-success/12 text-success' },
  { key: 'support',     href: '/support',     Icon: Headphones,  color: 'bg-muted text-muted-foreground' },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item      = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

export default function ClientDashboard() {
  const t = useTranslations('client');
  const { data: ordersData, isLoading } = useSWR<unknown>('/orders', fetcher);
  const all: Order[] = useMemo(() => {
    const normalized = normalizeOrderList(ordersData);
    return normalized.length > 0 ? normalized : ordersForClient(CURRENT_CLIENT_ID);
  }, [ordersData]);

  const { data: invoicesData } = useSWR<unknown>('/invoices', fetcher);
  const invoices = useMemo(() => {
    const arr =
      Array.isArray(invoicesData) ? invoicesData :
      Array.isArray((invoicesData as { items?: unknown[] })?.items) ? (invoicesData as { items: unknown[] }).items :
      [];
    return arr.length > 0 ? arr as ReturnType<typeof invoicesForClient> : invoicesForClient(CURRENT_CLIENT_ID);
  }, [invoicesData]);

  const active    = all.filter((o) => ['PUBLISHED', 'BIDDING', 'ASSIGNED', 'CONFIRMED', 'IN_TRANSIT'].includes(o.status));
  const completed = all.filter((o) => o.status === 'COMPLETED' || o.status === 'DELIVERED');
  const overdue   = invoices.filter((i) => i.status === 'OVERDUE');
  const totalSpent = invoices.filter((i) => i.status === 'PAID').reduce((s, i) => s + (Number(i.total) || 0), 0);

  const feedEvents = useMemo(() => {
    return all
      .slice(0, 6)
      .filter((o) => STATUS_EVENT[o.status])
      .map((o) => ({
        id:    o.id,
        href:  `/orders/${o.id}`,
        label: t(`dashboard.event.${o.status}`),
        color: STATUS_EVENT[o.status].color,
        sub:   `${o.orderNumber} · ${o.originCity} ← ${o.destinationCity}`,
        time:  formatRelative(o.createdAt),
      }));
  }, [all]);

  // First load with nothing from the API yet: show the dashboard shape as a
  // skeleton instead of flashing fallback data that then jumps to real values.
  if (isLoading && !ordersData) {
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
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{t('dashboard.greeting')}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            <span className="num font-semibold text-foreground">{active.length}</span> {t('dashboard.activeUnit')}
            <span className="mx-1.5 text-border">•</span>
            {overdue.length > 0
              ? <><span className="num font-semibold text-destructive">{overdue.length}</span> {t('dashboard.overdueUnit')}</>
              : t('dashboard.noOverdue')}
          </p>
        </div>
        <Link href="/orders/new">
          <Button size="lg" className="rounded-full">
            <Plus className="h-4 w-4" />
            {t('dashboard.newShipment')}
          </Button>
        </Link>
      </motion.div>

      {/* ── Stats ── */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard label={t('dashboard.totalOrders')} value={all.length}        hint={t('dashboard.hintSinceStart')}  icon={Package}     tone="default" />
        <StatsCard label={t('dashboard.activeOrders')} value={active.length}     hint={t('dashboard.hintInProgress')}  icon={Clock}       tone="default" />
        <StatsCard label={t('dashboard.completed')}    value={completed.length}  hint={t('dashboard.hintDelivered')}   icon={CheckCircle} tone="success" />
        <StatsCard label={t('dashboard.totalSpent')}   value={<Currency amount={totalSpent} />} hint={t('dashboard.hintPaidInvoices')} icon={Wallet} tone="default" />
      </motion.div>

      {/* ── Quick Actions ── */}
      <motion.div variants={item}>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t('dashboard.quickActions')}</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {QUICK_ACTIONS.map(({ key, href, Icon, color }) => (
            <Link key={href} href={href}>
              <motion.div
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-4 cursor-pointer transition-colors hover:border-[hsl(var(--mint))]/40 hover:bg-[hsl(var(--mint))]/[0.03]"
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-semibold">{t(`dashboard.action.${key}`)}</span>
                <ArrowLeft className="ms-auto h-4 w-4 text-muted-foreground/50 rtl:rotate-180" />
              </motion.div>
            </Link>
          ))}
        </div>
      </motion.div>

      {/* ── Orders table + Activity Feed ── */}
      <motion.div variants={item} className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Orders table */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t('dashboard.recentOrders')}</CardTitle>
                <CardDescription className="mt-1">{t('dashboard.recentOrdersSubtitle')}</CardDescription>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('dashboard.colNumber')}</TableHead>
                  <TableHead>{t('dashboard.colRoute')}</TableHead>
                  <TableHead>{t('dashboard.colType')}</TableHead>
                  <TableHead>{t('dashboard.colStatus')}</TableHead>
                  <TableHead className="text-center">{t('dashboard.colBids')}</TableHead>
                  <TableHead className="text-end">{t('dashboard.colPrice')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {all.slice(0, 7).map((o) => (
                  <TableRow key={o.id} className="cursor-pointer" onClick={() => (window.location.href = `/orders/${o.id}`)}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{o.orderNumber}</TableCell>
                    <TableCell>{o.originCity} ← {o.destinationCity}</TableCell>
                    <TableCell>
                      <Badge variant={o.mode === 'DIRECT' ? 'warning' : 'secondary'}>
                        {o.mode === 'OPEN' ? t('dashboard.modeOpen') : t('dashboard.modeDirect')}
                      </Badge>
                    </TableCell>
                    <TableCell><StatusBadge status={o.status} /></TableCell>
                    <TableCell className="text-center num">{o.bidCount || '—'}</TableCell>
                    <TableCell className="text-end"><Currency amount={o.agreedPrice ?? o.clientBudget} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
                <CheckCircle className="h-8 w-8 text-success/60" />
                {t('dashboard.noActivity')}
              </div>
            ) : (
              <div className="relative space-y-1">
                {/* vertical line */}
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

      {/* ── Overdue alert ── */}
      {overdue.length > 0 && (
        <motion.div variants={item}>
          <Card className="bg-destructive/5 border-destructive/30">
            <CardContent className="p-6 flex items-start gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-destructive/15 text-destructive shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{t('dashboard.overdueAlertTitle', { count: overdue.length })}</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('dashboard.overdueTotal')}<Currency amount={overdue.reduce((s, i) => s + (Number(i.total) || 0), 0)} />
                </p>
              </div>
              <Link href="/invoices">
                <Button variant="outline" size="sm">{t('dashboard.viewInvoices')}</Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      )}

    </motion.div>
  );
}

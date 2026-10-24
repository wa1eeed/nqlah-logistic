'use client';
import { useMemo } from 'react';
import Link from 'next/link';
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

const STATUS_EVENT: Record<string, { label: string; color: string }> = {
  PUBLISHED:  { label: 'تم نشر طلب جديد',       color: 'bg-primary/10 text-primary' },
  BIDDING:    { label: 'وصلت عروض جديدة',        color: 'bg-[hsl(var(--mint))]/12 text-[hsl(var(--mint))]' },
  ASSIGNED:   { label: 'تم تعيين ناقل',          color: 'bg-success/10 text-success' },
  IN_TRANSIT: { label: 'الطلب قيد التوصيل',      color: 'bg-primary/10 text-primary' },
  COMPLETED:  { label: 'تم إتمام الطلب',         color: 'bg-success/10 text-success' },
  DELIVERED:  { label: 'تم التسليم',             color: 'bg-success/10 text-success' },
};

const QUICK_ACTIONS = [
  { label: 'طلب نقل جديد',  href: '/orders/new',  Icon: Plus,        color: 'bg-[hsl(var(--mint))]/12 text-[hsl(var(--mint))]' },
  { label: 'تتبع طلباتي',   href: '/tracking',    Icon: MapPin,      color: 'bg-primary/10 text-primary' },
  { label: 'فواتيري',        href: '/invoices',    Icon: FileText,    color: 'bg-success/12 text-success' },
  { label: 'الدعم',          href: '/support',     Icon: Headphones,  color: 'bg-muted text-muted-foreground' },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item      = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

export default function ClientDashboard() {
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
        label: STATUS_EVENT[o.status].label,
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
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">مرحبا بعودتك 👋</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            <span className="num font-semibold text-foreground">{active.length}</span> طلب نشط
            <span className="mx-1.5 text-border">•</span>
            {overdue.length > 0
              ? <><span className="num font-semibold text-destructive">{overdue.length}</span> فاتورة متأخرة</>
              : 'لا فواتير متأخرة'}
          </p>
        </div>
        <Link href="/orders/new">
          <Button size="lg" className="rounded-full">
            <Plus className="h-4 w-4" />
            طلب نقل جديد
          </Button>
        </Link>
      </motion.div>

      {/* ── Stats ── */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard label="إجمالي الطلبات" value={all.length}        hint="منذ بداية حسابك"  icon={Package}     tone="default" />
        <StatsCard label="طلبات نشطة"     value={active.length}     hint="قيد التنفيذ"       icon={Clock}       tone="default" />
        <StatsCard label="مكتملة"          value={completed.length}  hint="تم التسليم"        icon={CheckCircle} tone="success" />
        <StatsCard label="إجمالي الإنفاق" value={<Currency amount={totalSpent} />} hint="فواتير مدفوعة" icon={Wallet} tone="default" />
      </motion.div>

      {/* ── Quick Actions ── */}
      <motion.div variants={item}>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">إجراءات سريعة</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {QUICK_ACTIONS.map(({ label, href, Icon, color }) => (
            <Link key={href} href={href}>
              <motion.div
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-4 cursor-pointer transition-colors hover:border-[hsl(var(--mint))]/40 hover:bg-[hsl(var(--mint))]/[0.03]"
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-semibold">{label}</span>
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
                <CardTitle>آخر طلباتي</CardTitle>
                <CardDescription className="mt-1">آخر 7 طلبات أنشأتها</CardDescription>
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
                  <TableHead>النوع</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead className="text-center">عروض</TableHead>
                  <TableHead className="text-end">السعر</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {all.slice(0, 7).map((o) => (
                  <TableRow key={o.id} className="cursor-pointer" onClick={() => (window.location.href = `/orders/${o.id}`)}>
                    <TableCell className="font-mono text-xs text-muted-foreground">{o.orderNumber}</TableCell>
                    <TableCell>{o.originCity} ← {o.destinationCity}</TableCell>
                    <TableCell>
                      <Badge variant={o.mode === 'DIRECT' ? 'warning' : 'secondary'}>
                        {o.mode === 'OPEN' ? 'مفتوح' : 'مباشر'}
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
            <CardTitle className="text-base">آخر الأنشطة</CardTitle>
            <CardDescription>سجل تحديثات طلباتك</CardDescription>
          </CardHeader>
          <CardContent>
            {feedEvents.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground flex flex-col items-center gap-2">
                <CheckCircle className="h-8 w-8 text-success/60" />
                لا توجد أنشطة حديثة
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
                <h3 className="font-semibold">لديك {overdue.length} فاتورة متأخرة</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  المجموع المتأخر: <Currency amount={overdue.reduce((s, i) => s + (Number(i.total) || 0), 0)} />
                </p>
              </div>
              <Link href="/invoices">
                <Button variant="outline" size="sm">عرض الفواتير</Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      )}

    </motion.div>
  );
}

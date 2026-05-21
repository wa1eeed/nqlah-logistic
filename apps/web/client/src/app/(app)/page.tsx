'use client';
import { useMemo } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import {
  AlertTriangle, ArrowLeft, CheckCircle, Clock, Package, Plus, Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/page-header';
import { StatsCard } from '@/components/stats-card';
import { StatusBadge } from '@/components/status-badge';
import { Currency } from '@/components/currency';
import { fetcher } from '@/lib/api';
import {
  CURRENT_CLIENT_ID, formatRelative, invoicesForClient, ordersForClient,
  normalizeOrderList, type Order,
} from '@naqla/shared-utils';

export default function ClientDashboard() {
  // GET /orders → filtered to "mine" by the role-aware list endpoint.
  // Mock fallback ensures the dashboard never looks empty offline.
  const { data: ordersData } = useSWR<unknown>('/orders', fetcher);
  const all: Order[] = useMemo(() => {
    const normalized = normalizeOrderList(ordersData);
    return normalized.length > 0 ? normalized : ordersForClient(CURRENT_CLIENT_ID);
  }, [ordersData]);
  // Invoices — same pattern.
  const { data: invoicesData } = useSWR<unknown>('/invoices', fetcher);
  const invoices = useMemo(() => {
    const arr =
      Array.isArray(invoicesData) ? invoicesData :
      Array.isArray((invoicesData as { items?: unknown[] })?.items) ? (invoicesData as { items: unknown[] }).items :
      [];
    return arr.length > 0 ? arr as ReturnType<typeof invoicesForClient> : invoicesForClient(CURRENT_CLIENT_ID);
  }, [invoicesData]);

  const active = all.filter((o) => ['PUBLISHED', 'BIDDING', 'ASSIGNED', 'CONFIRMED', 'IN_TRANSIT'].includes(o.status));
  const completed = all.filter((o) => o.status === 'COMPLETED' || o.status === 'DELIVERED');
  const overdue = invoices.filter((i) => i.status === 'OVERDUE');
  const totalSpent = invoices.filter((i) => i.status === 'PAID').reduce((s, i) => s + i.total, 0);

  return (
    <>
      <PageHeader
        title="مرحباً بعودتك 👋"
        subtitle={`${active.length} طلب نشط · ${overdue.length} فاتورة متأخرة`}
        actions={
          <Link href="/orders/new">
            <Button>
              <Plus className="h-4 w-4" />
              طلب نقل جديد
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard label="إجمالي الطلبات" value={all.length} hint="منذ بداية حسابك" icon={Package} tone="default" />
        <StatsCard label="طلبات نشطة" value={active.length} hint="قيد التنفيذ" icon={Clock} tone="warning" />
        <StatsCard label="مكتملة" value={completed.length} hint="تم التسليم" icon={CheckCircle} tone="success" />
        <StatsCard
          label="إجمالي الإنفاق"
          value={<Currency amount={totalSpent} />}
          hint="فواتير مدفوعة"
          icon={Wallet}
          tone="default"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
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

        <Card>
          <CardHeader>
            <CardTitle className="text-base">مهام تستحق الانتباه</CardTitle>
            <CardDescription>أولوياتك اليوم</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {overdue.slice(0, 1).map((inv) => (
              <div key={inv.id} className="flex items-center gap-3 rounded-lg bg-muted/30 p-3 border-s-4 border-s-destructive">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl ring-1 bg-destructive/15 text-destructive ring-destructive/30">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">فاتورة متأخرة</div>
                  <div className="text-xs text-muted-foreground">
                    {inv.invoiceNumber} · استحقاق {formatRelative(inv.dueAt)}
                  </div>
                </div>
              </div>
            ))}
            {active.filter((o) => o.status === 'BIDDING').slice(0, 1).map((o) => (
              <div key={o.id} className="flex items-center gap-3 rounded-lg bg-muted/30 p-3 border-s-4 border-s-warning">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl ring-1 bg-warning/15 text-warning ring-warning/30">
                  <Clock className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{o.bidCount} عروض بحاجة لمراجعة</div>
                  <div className="text-xs text-muted-foreground">{o.orderNumber}</div>
                </div>
              </div>
            ))}
            {overdue.length === 0 && active.filter((o) => o.status === 'BIDDING').length === 0 && (
              <div className="text-center py-6 text-sm text-muted-foreground flex flex-col items-center gap-2">
                <CheckCircle className="h-8 w-8 text-success/60" />
                لا توجد مهام عاجلة الآن
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {overdue.length > 0 && (
        <Card className="bg-destructive/5 border-destructive/30">
          <CardContent className="p-6 flex items-start gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-destructive/15 text-destructive shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">لديك {overdue.length} فاتورة متأخرة</h3>
              <p className="text-sm text-muted-foreground mt-1">
                المجموع المتأخر: <Currency amount={overdue.reduce((s, i) => s + i.total, 0)} />
              </p>
            </div>
            <Link href="/invoices">
              <Button variant="outline" size="sm">عرض الفواتير</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </>
  );
}

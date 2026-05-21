'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { Currency } from '@/components/currency';
import {
  CURRENT_CLIENT_ID, formatDate, ordersForClient,
  normalizeOrderList, type Order,
} from '@naqla/shared-utils';
import { fetcher } from '@/lib/api';

export default function ClientOrdersPage() {
  const [tab, setTab] = useState('ALL');
  // SWR drives the data layer. When the API is reachable, `data` holds real
  // orders. The `api.ts` interceptor returns `getMockResponse` on network
  // failure, so mock data still flows in pure UI-demo mode.
  // `normalizeOrderList` adapts API field names (weight, requiredTruckType,
  // _count.bids) to the mock shape the table expects (weightKg, truckType,
  // bidCount) — avoiding crashes on direct property accesses.
  const { data, isLoading } = useSWR<unknown>('/orders', fetcher);
  const all: Order[] = useMemo(() => {
    const normalized = normalizeOrderList(data);
    if (normalized.length > 0) return normalized;
    return ordersForClient(CURRENT_CLIENT_ID);
  }, [data]);

  const rows = useMemo(() => {
    if (tab === 'ALL') return all;
    if (tab === 'ACTIVE') {
      return all.filter((o) => ['PUBLISHED', 'BIDDING', 'ASSIGNED', 'CONFIRMED', 'IN_TRANSIT'].includes(o.status));
    }
    return all.filter((o) => o.status === tab);
  }, [tab, all]);

  const TABS = [
    { key: 'ALL',        label: 'الكل',         count: all.length },
    { key: 'ACTIVE',     label: 'نشطة',         count: all.filter((o) => ['PUBLISHED', 'BIDDING', 'ASSIGNED', 'CONFIRMED', 'IN_TRANSIT'].includes(o.status)).length },
    { key: 'BIDDING',    label: 'قيد العروض',   count: all.filter((o) => o.status === 'BIDDING').length },
    { key: 'IN_TRANSIT', label: 'في الطريق',    count: all.filter((o) => o.status === 'IN_TRANSIT').length },
    { key: 'COMPLETED',  label: 'مكتملة',       count: all.filter((o) => o.status === 'COMPLETED').length },
    { key: 'CANCELLED',  label: 'ملغاة',        count: all.filter((o) => o.status === 'CANCELLED').length },
  ];

  return (
    <>
      <PageHeader
        title="طلباتي"
        subtitle="جميع طلبات النقل التي أنشأتها"
        actions={
          <Link href="/orders/new">
            <Button>
              <Plus className="h-4 w-4" />
              طلب جديد
            </Button>
          </Link>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="overflow-x-auto">
          {TABS.map((t) => (
            <TabsTrigger key={t.key} value={t.key}>
              {t.label}
              <Badge variant="secondary" className="ms-1 num">{t.count}</Badge>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading && !data && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          جاري التحميل...
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم</TableHead>
                <TableHead>المسار</TableHead>
                <TableHead>النوع</TableHead>
                <TableHead>الاستلام</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead className="text-center">عروض</TableHead>
                <TableHead className="text-end">السعر</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-10">لا توجد طلبات</TableCell>
                </TableRow>
              ) : (
                rows.map((o) => (
                  <TableRow key={o.id} className="cursor-pointer" onClick={() => (window.location.href = `/orders/${o.id}`)}>
                    <TableCell>
                      <Link href={`/orders/${o.id}`} className="font-mono text-xs text-primary hover:underline">{o.orderNumber}</Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm">{o.originCity} ← {o.destinationCity}</span>
                        <span className="text-xs text-muted-foreground truncate max-w-[280px]">{o.cargoDescription}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={o.mode === 'DIRECT' ? 'warning' : 'secondary'}>
                        {o.mode === 'OPEN' ? 'مفتوح' : 'مباشر'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(o.pickupDate)}</TableCell>
                    <TableCell><StatusBadge status={o.status} /></TableCell>
                    <TableCell className="text-center num">
                      {/* Mock orders use `bidCount`; API responses use `_count.bids`. Handle both. */}
                      {(o as Order & { _count?: { bids: number } })._count?.bids ?? o.bidCount ?? '—'}
                    </TableCell>
                    <TableCell className="text-end"><Currency amount={o.agreedPrice ?? o.clientBudget} /></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

'use client';
import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { Currency } from '@/components/currency';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import {
  CURRENT_CARRIER_ID, formatDate, ordersForCarrier,
  normalizeOrderList, type Order,
} from '@naqla/shared-utils';

export default function CarrierOrdersPage() {
  const [tab, setTab] = useState('ALL');
  // GET /orders?mine=true → only orders assigned to this carrier.
  // Mock fallback when API is down: `ordersForCarrier(CURRENT_CARRIER_ID)`.
  const { data } = useSWR<unknown>('/orders?mine=true', fetcher);
  const all: Order[] = useMemo(() => {
    const normalized = normalizeOrderList(data);
    return normalized.length > 0 ? normalized : ordersForCarrier(CURRENT_CARRIER_ID);
  }, [data]);

  const rows = useMemo(() => {
    if (tab === 'ALL') return all;
    if (tab === 'ACTIVE') return all.filter((o) => ['CONFIRMED', 'IN_TRANSIT'].includes(o.status));
    return all.filter((o) => o.status === tab);
  }, [tab, all]);

  const TABS = [
    { key: 'ALL',        label: 'الكل',        count: all.length },
    { key: 'ACTIVE',     label: 'نشطة',         count: all.filter((o) => ['CONFIRMED', 'IN_TRANSIT'].includes(o.status)).length },
    { key: 'IN_TRANSIT', label: 'في الطريق',    count: all.filter((o) => o.status === 'IN_TRANSIT').length },
    { key: 'DELIVERED',  label: 'تم التسليم',   count: all.filter((o) => o.status === 'DELIVERED').length },
    { key: 'COMPLETED',  label: 'مكتملة',       count: all.filter((o) => o.status === 'COMPLETED').length },
  ];

  return (
    <>
      <PageHeader title="طلباتي" subtitle="جميع الطلبات التي قبلت عرضك عليها" />

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

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم</TableHead>
                <TableHead>المسار</TableHead>
                <TableHead>الاستلام</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead className="text-end">صافي الأجرة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-10">لا توجد طلبات</TableCell>
                </TableRow>
              ) : (
                rows.map((o) => (
                  <TableRow key={o.id} className="cursor-pointer" onClick={() => (window.location.href = `/orders/${o.id}`)}>
                    <TableCell className="font-mono text-xs font-medium">{o.orderNumber}</TableCell>
                    <TableCell>
                      <div>
                        <div className="text-sm">{o.originCity} ← {o.destinationCity}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[280px]">{o.cargoDescription}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(o.pickupDate)}</TableCell>
                    <TableCell><StatusBadge status={o.status} /></TableCell>
                    <TableCell className="text-end"><Currency amount={o.carrierAmount} /></TableCell>
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

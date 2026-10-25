'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { MapPin, Package, Plus, Search, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { StatusBadge } from '@/components/status-badge';
import { Currency } from '@/components/currency';
import { PageTransition, FadeItem } from '@/components/page-transition';
import {
  CURRENT_CLIENT_ID, formatDate, ordersForClient,
  normalizeOrderList, type Order,
} from '@naqla/shared-utils';
import { fetcher } from '@/lib/api';

export default function ClientOrdersPage() {
  const [tab, setTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('ALL');
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

  // Cities present across all orders (origin or destination) for the filter.
  const cities = useMemo(
    () => Array.from(new Set(all.flatMap((o) => [o.originCity, o.destinationCity]).filter(Boolean))).sort(),
    [all],
  );

  const rows = useMemo(() => {
    let arr = all;
    if (tab === 'ACTIVE') {
      arr = arr.filter((o) => ['PUBLISHED', 'BIDDING', 'ASSIGNED', 'CONFIRMED', 'IN_TRANSIT'].includes(o.status));
    } else if (tab !== 'ALL') {
      arr = arr.filter((o) => o.status === tab);
    }
    if (cityFilter !== 'ALL') {
      arr = arr.filter((o) => o.originCity === cityFilter || o.destinationCity === cityFilter);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      arr = arr.filter((o) =>
        [o.orderNumber, o.originCity, o.destinationCity, o.cargoDescription]
          .some((v) => v?.toString().toLowerCase().includes(q)),
      );
    }
    return arr;
  }, [tab, all, cityFilter, search]);

  const TABS = [
    { key: 'ALL',        label: 'الكل',         count: all.length },
    { key: 'ACTIVE',     label: 'نشطة',         count: all.filter((o) => ['PUBLISHED', 'BIDDING', 'ASSIGNED', 'CONFIRMED', 'IN_TRANSIT'].includes(o.status)).length },
    { key: 'BIDDING',    label: 'قيد العروض',   count: all.filter((o) => o.status === 'BIDDING').length },
    { key: 'IN_TRANSIT', label: 'في الطريق',    count: all.filter((o) => o.status === 'IN_TRANSIT').length },
    { key: 'COMPLETED',  label: 'مكتملة',       count: all.filter((o) => o.status === 'COMPLETED').length },
    { key: 'CANCELLED',  label: 'ملغاة',        count: all.filter((o) => o.status === 'CANCELLED').length },
  ];

  return (
    <PageTransition>
      <FadeItem>
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
      </FadeItem>

      <FadeItem>
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
      </FadeItem>

      <FadeItem>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ابحث برقم الطلب، المدينة، أو وصف الشحنة..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-9 pe-9"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute top-1/2 -translate-y-1/2 end-3 text-muted-foreground hover:text-foreground"
                aria-label="مسح البحث"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger className="w-full sm:w-56">
              <span className="flex items-center gap-2 min-w-0">
                <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                <SelectValue placeholder="كل المدن" />
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">كل المدن</SelectItem>
              {cities.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </FadeItem>

      <FadeItem>
        <Card>
          <CardContent className="p-0">
            {rows.length === 0 && !isLoading ? (
              (search.trim() || cityFilter !== 'ALL') ? (
                <EmptyState
                  icon={Search}
                  title="لا توجد نتائج مطابقة"
                  description="جرّب تعديل البحث أو تغيير فلتر المدينة"
                />
              ) : (
                <EmptyState
                  icon={Package}
                  title="لا توجد طلبات"
                  description="لم تنشئ أي طلبات نقل بعد في هذه الفئة"
                  action={{ label: 'إنشاء طلب جديد', href: '/orders/new' }}
                />
              )
            ) : (
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
                  {isLoading && !data ? (
                    Array.from({ length: 5 }).map((_, r) => (
                      <TableRow key={r}>
                        {Array.from({ length: 7 }).map((_, c) => (
                          <TableCell key={c}>
                            <motion.div
                              animate={{ opacity: [0.4, 0.9, 0.4] }}
                              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut', delay: r * 0.1 }}
                              className={`h-3 rounded-md bg-muted ${c === 0 ? 'w-20' : c === 6 ? 'w-16' : 'w-full'}`}
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
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
            )}
          </CardContent>
        </Card>
      </FadeItem>
    </PageTransition>
  );
}

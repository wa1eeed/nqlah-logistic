'use client';
import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
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
  normalizeOrderList, localizeCity, type Order,
} from '@naqla/shared-utils';
import { fetcher } from '@/lib/api';

export default function ClientOrdersPage() {
  const t = useTranslations('orders');
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
    { key: 'ALL',        label: t('list.tabs.all'),        count: all.length },
    { key: 'ACTIVE',     label: t('list.tabs.active'),      count: all.filter((o) => ['PUBLISHED', 'BIDDING', 'ASSIGNED', 'CONFIRMED', 'IN_TRANSIT'].includes(o.status)).length },
    { key: 'BIDDING',    label: t('list.tabs.bidding'),     count: all.filter((o) => o.status === 'BIDDING').length },
    { key: 'IN_TRANSIT', label: t('list.tabs.inTransit'),   count: all.filter((o) => o.status === 'IN_TRANSIT').length },
    { key: 'COMPLETED',  label: t('list.tabs.completed'),   count: all.filter((o) => o.status === 'COMPLETED').length },
    { key: 'CANCELLED',  label: t('list.tabs.cancelled'),   count: all.filter((o) => o.status === 'CANCELLED').length },
  ];

  return (
    <PageTransition>
      <FadeItem>
        <PageHeader
          title={t('list.title')}
          subtitle={t('list.subtitle')}
          actions={
            <Link href="/orders/new">
              <Button>
                <Plus className="h-4 w-4" />
                {t('list.newOrder')}
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
              placeholder={t('list.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-9 pe-9"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute top-1/2 -translate-y-1/2 end-3 text-muted-foreground hover:text-foreground"
                aria-label={t('list.clearSearch')}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Select value={cityFilter} onValueChange={setCityFilter}>
            <SelectTrigger className="w-full sm:w-56">
              <span className="flex items-center gap-2 min-w-0">
                <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
                <SelectValue placeholder={t('list.allCities')} />
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t('list.allCities')}</SelectItem>
              {cities.map((c) => (
                <SelectItem key={c} value={c}>{localizeCity(c)}</SelectItem>
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
                  title={t('list.noResults.title')}
                  description={t('list.noResults.desc')}
                />
              ) : (
                <EmptyState
                  icon={Package}
                  title={t('list.empty.title')}
                  description={t('list.empty.desc')}
                  action={{ label: t('list.empty.action'), href: '/orders/new' }}
                />
              )
            ) : (
             <>
              {/* Mobile: app-like card list */}
              <div className="md:hidden divide-y">
                {isLoading && !data ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="p-4"><div className="h-20 rounded-xl bg-muted animate-pulse" /></div>
                  ))
                ) : (
                  rows.map((o) => (
                    <Link key={o.id} href={`/orders/${o.id}`} className="block p-4 transition-colors active:bg-muted/60">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs text-primary">{o.orderNumber}</span>
                        <StatusBadge status={o.status} />
                      </div>
                      <div className="mt-1.5 text-sm font-medium">{localizeCity(o.originCity)} ← {localizeCity(o.destinationCity)}</div>
                      <div className="text-xs text-muted-foreground truncate">{o.cargoDescription}</div>
                      <div className="mt-2.5 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={o.mode === 'DIRECT' ? 'warning' : 'secondary'}>
                            {o.mode === 'OPEN' ? t('list.modeOpen') : t('list.modeDirect')}
                          </Badge>
                          <span className="num text-xs text-muted-foreground">{formatDate(o.pickupDate)}</span>
                        </div>
                        <span className="text-sm font-semibold"><Currency amount={o.agreedPrice ?? o.clientBudget} /></span>
                      </div>
                    </Link>
                  ))
                )}
              </div>

              {/* Desktop: table */}
              <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('list.cols.number')}</TableHead>
                    <TableHead>{t('list.cols.route')}</TableHead>
                    <TableHead>{t('list.cols.type')}</TableHead>
                    <TableHead>{t('list.cols.pickup')}</TableHead>
                    <TableHead>{t('list.cols.status')}</TableHead>
                    <TableHead className="text-center">{t('list.cols.bids')}</TableHead>
                    <TableHead className="text-end">{t('list.cols.price')}</TableHead>
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
                            <span className="text-sm">{localizeCity(o.originCity)} ← {localizeCity(o.destinationCity)}</span>
                            <span className="text-xs text-muted-foreground truncate max-w-[280px]">{o.cargoDescription}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={o.mode === 'DIRECT' ? 'warning' : 'secondary'}>
                            {o.mode === 'OPEN' ? t('list.modeOpen') : t('list.modeDirect')}
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
              </div>
             </>
            )}
          </CardContent>
        </Card>
      </FadeItem>
    </PageTransition>
  );
}

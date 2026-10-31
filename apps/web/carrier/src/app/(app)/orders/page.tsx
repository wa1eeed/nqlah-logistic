'use client';
import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, PackageCheck, Truck } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { Currency } from '@/components/currency';
import { PageTransition, FadeItem } from '@/components/page-transition';
import { EmptyState } from '@/components/empty-state';
import { OrderFilterBar } from '@/components/order-filter-bar';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import {
  CURRENT_CARRIER_ID, formatDate, localizeCity, ordersForCarrier,
  normalizeOrderList, type Order,
} from '@naqla/shared-utils';

// Assignments that are in-progress work for the carrier. ASSIGNED = carrier
// assigned, awaiting a driver (active but not yet moving); CONFIRMED = driver
// assigned, en route to pick up; IN_TRANSIT = cargo on board, en route to
// deliver; DELIVERED = delivered, awaiting close-out.
const ACTIVE_STATUSES = ['ASSIGNED', 'CONFIRMED', 'IN_TRANSIT', 'DELIVERED'];
// "On the way" is the moving subset of active: either leg currently driving.
const PICKUP_STATUSES = ['CONFIRMED'];     // heading to origin to pick up
const DELIVERY_STATUSES = ['IN_TRANSIT'];  // carrying cargo to destination
const ON_THE_WAY_STATUSES = [...PICKUP_STATUSES, ...DELIVERY_STATUSES];

type TabKey = 'ALL' | 'ACTIVE' | 'ON_THE_WAY' | 'DELIVERED' | 'COMPLETED' | 'DIRECT';

export default function CarrierOrdersPage() {
  const t = useTranslations('orders');
  const [tab, setTab] = useState<TabKey>('ALL');
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('ALL');

  const authedCompanyId = useAuthStore((s) => s.user?.companyId);
  const myCompanyId = authedCompanyId ?? CURRENT_CARRIER_ID;

  // The backend `/orders` list bundles three buckets filtered by visibility:
  // OPEN marketplace, DIRECT-to-this-carrier, and orders already assigned to
  // this carrier. SWR dedupes this fetch with the sidebar + market pages.
  // Mock fallback keeps demo mode usable offline.
  const { data, isLoading } = useSWR<unknown>('/orders', fetcher);
  const visible: Order[] = useMemo(() => {
    const normalized = normalizeOrderList(data);
    return normalized.length > 0 ? normalized : ordersForCarrier(CURRENT_CARRIER_ID);
  }, [data]);

  // Orders already assigned to me — the carrier's own work. Everything that is
  // still DRAFT/PUBLISHED/BIDDING is an opportunity, not a committed order.
  const mine = useMemo(
    () => visible.filter(
      (o) => (o as { carrierId?: string }).carrierId === myCompanyId
        && !['DRAFT', 'PUBLISHED', 'BIDDING'].includes(o.status),
    ),
    [visible, myCompanyId],
  );
  // «طلبات خاصة» — private orders directed to this carrier that are still open
  // (awaiting our bid / the client's decision). Moved here from the market
  // page so the carrier manages direct requests alongside their own orders.
  const direct = useMemo(
    () => visible.filter(
      (o) => o.mode === 'DIRECT' && ['PUBLISHED', 'BIDDING'].includes(o.status),
    ),
    [visible],
  );

  // City options from every order in view (both buckets), origin or dest.
  const cities = useMemo(
    () => Array.from(new Set(
      [...mine, ...direct].flatMap((o) => [o.originCity, o.destinationCity]).filter(Boolean),
    )).sort(),
    [mine, direct],
  );

  const matchesFilters = (o: Order) => {
    if (city !== 'ALL' && o.originCity !== city && o.destinationCity !== city) return false;
    const q = search.trim().toLowerCase();
    if (q && ![o.orderNumber, o.originCity, o.destinationCity, o.cargoDescription]
      .some((v) => v?.toString().toLowerCase().includes(q))) return false;
    return true;
  };

  // Pools are the buckets after search + city, so tab counts always match the
  // rows shown inside each tab.
  const poolMine = useMemo(() => mine.filter(matchesFilters), [mine, search, city]);
  const poolDirect = useMemo(() => direct.filter(matchesFilters), [direct, search, city]);

  const byStatus = (list: Order[], statuses: string[]) => list.filter((o) => statuses.includes(o.status));

  const rows = useMemo(() => {
    switch (tab) {
      case 'ALL':        return poolMine;
      case 'ACTIVE':     return byStatus(poolMine, ACTIVE_STATUSES);
      case 'ON_THE_WAY': return byStatus(poolMine, ON_THE_WAY_STATUSES);
      case 'DELIVERED':  return byStatus(poolMine, ['DELIVERED']);
      case 'COMPLETED':  return byStatus(poolMine, ['COMPLETED']);
      case 'DIRECT':     return poolDirect;
      default:           return poolMine;
    }
  }, [tab, poolMine, poolDirect]);

  const pickupLeg = useMemo(() => byStatus(poolMine, PICKUP_STATUSES), [poolMine]);
  const deliveryLeg = useMemo(() => byStatus(poolMine, DELIVERY_STATUSES), [poolMine]);

  const TABS: { key: TabKey; label: string; count: number }[] = [
    { key: 'ALL',        label: t('list.tabs.all'),       count: poolMine.length },
    { key: 'ACTIVE',     label: t('list.tabs.active'),     count: byStatus(poolMine, ACTIVE_STATUSES).length },
    { key: 'ON_THE_WAY', label: t('list.tabs.onTheWay'),   count: byStatus(poolMine, ON_THE_WAY_STATUSES).length },
    { key: 'DELIVERED',  label: t('list.tabs.delivered'),  count: byStatus(poolMine, ['DELIVERED']).length },
    { key: 'COMPLETED',  label: t('list.tabs.completed'),  count: byStatus(poolMine, ['COMPLETED']).length },
    { key: 'DIRECT',     label: t('list.tabs.direct'),     count: poolDirect.length },
  ];

  const isGrouped = tab === 'ON_THE_WAY';

  return (
    <PageTransition>
      <FadeItem>
        <PageHeader title={t('list.title')} subtitle={t('list.subtitle')} />
      </FadeItem>

      <FadeItem>
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
          <TabsList className="overflow-x-auto">
            {TABS.map((it) => (
              <TabsTrigger key={it.key} value={it.key}>
                {it.label}
                <Badge variant="secondary" className="ms-1 num">{it.count}</Badge>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </FadeItem>

      <FadeItem>
        <OrderFilterBar
          search={search}
          onSearchChange={setSearch}
          city={city}
          onCityChange={setCity}
          cities={cities}
          searchPlaceholder={t('list.searchPlaceholder')}
          allCitiesLabel={t('list.allCities')}
          clearSearchLabel={t('list.clearSearch')}
        />
      </FadeItem>

      <FadeItem>
        <Card>
          <CardContent className="p-0">
            {rows.length === 0 && !isLoading ? (
              <EmptyState
                icon={tab === 'DIRECT' ? PackageCheck : Package}
                title={t('list.emptyTitle')}
                description={tab === 'DIRECT' ? t('list.emptyDirectDesc') : t('list.emptyDesc')}
              />
            ) : isGrouped ? (
              <div className="divide-y">
                <LegGroup
                  icon={Truck}
                  label={t('list.legs.pickup')}
                  hint={t('list.legs.pickupHint')}
                  tone="warning"
                  orders={pickupLeg}
                  isLoading={isLoading && !data}
                  t={t}
                />
                <LegGroup
                  icon={PackageCheck}
                  label={t('list.legs.delivery')}
                  hint={t('list.legs.deliveryHint')}
                  tone="success"
                  orders={deliveryLeg}
                  isLoading={isLoading && !data}
                  t={t}
                />
              </div>
            ) : (
              <OrderList orders={rows} isLoading={isLoading && !data} t={t} />
            )}
          </CardContent>
        </Card>
      </FadeItem>
    </PageTransition>
  );
}

type T = ReturnType<typeof useTranslations>;

function LegGroup({
  icon: Icon, label, hint, tone, orders, isLoading, t,
}: {
  icon: typeof Truck; label: string; hint: string;
  tone: 'warning' | 'success'; orders: Order[]; isLoading: boolean; t: T;
}) {
  const dot = tone === 'warning' ? 'bg-warning' : 'bg-success';
  return (
    <div>
      <div className="flex items-center gap-2 px-4 py-3 bg-muted/40">
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-semibold">{label}</span>
        <Badge variant="secondary" className="num">{orders.length}</Badge>
        <span className="hidden sm:inline text-xs text-muted-foreground">{hint}</span>
      </div>
      {orders.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-muted-foreground">{t('list.legs.none')}</div>
      ) : (
        <OrderList orders={orders} isLoading={isLoading} t={t} />
      )}
    </div>
  );
}

function OrderList({ orders, isLoading, t }: { orders: Order[]; isLoading: boolean; t: T }) {
  return (
    <>
      {/* Mobile: app-like card list */}
      <div className="md:hidden divide-y">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-4"><div className="h-20 rounded-xl bg-muted animate-pulse" /></div>
          ))
        ) : (
          orders.map((o) => (
            <Link key={o.id} href={`/orders/${o.id}`} className="block p-4 transition-colors active:bg-muted/60">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-medium">{o.orderNumber}</span>
                <StatusBadge status={o.status} />
              </div>
              <div className="mt-1.5 text-sm font-medium">{localizeCity(o.originCity)} ← {localizeCity(o.destinationCity)}</div>
              <div className="text-xs text-muted-foreground truncate">{o.cargoDescription}</div>
              <div className="mt-2.5 flex items-center justify-between gap-2">
                <span className="num text-xs text-muted-foreground">{formatDate(o.pickupDate)}</span>
                <span className="text-sm font-semibold"><Currency amount={o.carrierAmount} /></span>
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
              <TableHead>{t('list.colNumber')}</TableHead>
              <TableHead>{t('list.colRoute')}</TableHead>
              <TableHead>{t('list.colPickup')}</TableHead>
              <TableHead>{t('list.colStatus')}</TableHead>
              <TableHead className="text-end">{t('list.colNetFare')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, r) => (
                  <TableRow key={r}>
                    {Array.from({ length: 5 }).map((_, c) => (
                      <TableCell key={c}>
                        <motion.div
                          animate={{ opacity: [0.4, 0.9, 0.4] }}
                          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut', delay: r * 0.1 }}
                          className={`h-3 rounded-md bg-muted ${c === 0 ? 'w-20' : 'w-full'}`}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : orders.map((o) => (
                  <TableRow key={o.id} className="cursor-pointer" onClick={() => (window.location.href = `/orders/${o.id}`)}>
                    <TableCell className="font-mono text-xs font-medium">{o.orderNumber}</TableCell>
                    <TableCell>
                      <div>
                        <div className="text-sm">{localizeCity(o.originCity)} ← {localizeCity(o.destinationCity)}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[280px]">{o.cargoDescription}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(o.pickupDate)}</TableCell>
                    <TableCell><StatusBadge status={o.status} /></TableCell>
                    <TableCell className="text-end"><Currency amount={o.carrierAmount} /></TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

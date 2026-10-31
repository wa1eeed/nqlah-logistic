'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { Currency } from '@/components/currency';
import { OrderFilterBar } from '@/components/order-filter-bar';
import { MiniStat } from '@/components/ui/mini-stat';
import { FadeIn } from '@/components/ui/fade-in';
import { FileText, Truck, Gavel, Wallet } from 'lucide-react';
import useSWR from 'swr';
import { useTranslations } from 'next-intl';
import { fetcher } from '@/lib/api';
import { ORDERS, companyById, formatDate, normalizeOrderList, localizeCity, type Order } from '@naqla/shared-utils';

export default function AdminOrdersPage() {
  const t = useTranslations('orders');
  const [tab, setTab] = useState('ALL');
  const [city, setCity] = useState('ALL');
  const [search, setSearch] = useState('');

  // GET /admin/orders → all orders on the platform. Falls back to mock ORDERS
  // when the API is unreachable (the api.ts interceptor handles that).
  const { data } = useSWR<unknown>('/admin/orders', fetcher);
  const all: Order[] = useMemo(() => {
    const normalized = normalizeOrderList(data);
    return normalized.length > 0 ? normalized : ORDERS;
  }, [data]);

  // City options are populated from the orders actually in view (origin or
  // destination), so the dropdown never offers a city with zero matches.
  const cities = useMemo(
    () => Array.from(new Set(all.flatMap((o) => [o.originCity, o.destinationCity]).filter(Boolean))).sort(),
    [all],
  );

  const rows = useMemo(() => {
    let arr = all;
    if (tab !== 'ALL') arr = arr.filter((o) => o.status === tab);
    if (city !== 'ALL') arr = arr.filter((o) => o.originCity === city || o.destinationCity === city);
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter((o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        o.cargoDescription.includes(search) ||
        o.originCity.includes(search) ||
        o.destinationCity.includes(search) ||
        (companyById(o.clientId)?.nameAr ?? '').includes(search),
      );
    }
    return arr;
  }, [all, tab, city, search]);

  const TABS = [
    { key: 'ALL',        label: t('adminList.tabAll') },
    { key: 'PUBLISHED',  label: t('status.published') },
    { key: 'BIDDING',    label: t('status.bidding') },
    { key: 'IN_TRANSIT', label: t('status.inTransit') },
    { key: 'COMPLETED',  label: t('status.completed') },
    { key: 'CANCELLED',  label: t('status.cancelled') },
  ];

  const inTransit = all.filter((o) => o.status === 'IN_TRANSIT').length;
  const bidding = all.filter((o) => o.status === 'BIDDING' || o.status === 'PUBLISHED').length;
  const gmv = all.reduce((s, o) => s + (o.agreedPrice ?? o.clientBudget ?? 0), 0);

  return (
    <>
      <PageHeader eyebrow={t('adminList.eyebrow')} title={t('title')} subtitle={t('adminList.subtitle')} />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MiniStat label={t('adminList.statTotal')} value={all.length} icon={FileText} index={0} />
        <MiniStat label={t('status.inTransit')} value={inTransit} icon={Truck} tone="success" index={1} />
        <MiniStat label={t('adminList.statActiveBids')} value={bidding} icon={Gavel} tone="warning" index={2} />
        <MiniStat label={t('adminList.statGmv')} value={<Currency amount={gmv} />} icon={Wallet} tone="default" index={3} />
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            {TABS.map((t) => (
              <TabsTrigger key={t.key} value={t.key}>
                {t.label}
                {' '}
                <Badge variant="secondary" className="ms-1 num">
                  {t.key === 'ALL' ? all.length : all.filter((o) => o.status === t.key).length}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <OrderFilterBar
          className="w-full md:w-auto"
          search={search}
          onSearchChange={setSearch}
          city={city}
          onCityChange={setCity}
          cities={cities}
          searchPlaceholder={t('adminList.searchPlaceholder')}
          allCitiesLabel={t('adminList.allCities')}
          clearSearchLabel={t('adminList.clearSearch')}
        />
      </div>

      <FadeIn delay={0.08}>
      <Card>
        <CardContent className="p-0">
          {/* Mobile: app-like card list */}
          <div className="md:hidden divide-y">
            {rows.length === 0 ? (
              <div className="text-center text-muted-foreground py-10">{t('noOrders')}</div>
            ) : (
              rows.map((o) => (
                <Link key={o.id} href={`/orders/${o.id}`} className="block p-4 transition-colors active:bg-muted/60">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-primary">{o.orderNumber}</span>
                    <StatusBadge status={o.status} />
                  </div>
                  <div className="mt-1.5 text-sm font-medium">{localizeCity(o.originCity)} ← {localizeCity(o.destinationCity)}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {companyById(o.clientId)?.nameAr ?? '—'}
                    {companyById(o.carrierId)?.nameAr ? ` · ${companyById(o.carrierId)?.nameAr}` : ''}
                  </div>
                  <div className="mt-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={o.mode === 'DIRECT' ? 'warning' : 'secondary'}>
                        {o.mode === 'OPEN' ? t('adminList.modeOpen') : t('adminList.modeDirect')}
                      </Badge>
                      <span className="num text-xs text-muted-foreground">{formatDate(o.createdAt)}</span>
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
                <TableHead>{t('adminList.colNumber')}</TableHead>
                <TableHead>{t('fields.client')}</TableHead>
                <TableHead>{t('fields.carrier')}</TableHead>
                <TableHead>{t('fields.route')}</TableHead>
                <TableHead>{t('adminList.colType')}</TableHead>
                <TableHead>{t('adminList.colStatus')}</TableHead>
                <TableHead className="text-center">{t('adminList.colBids')}</TableHead>
                <TableHead className="text-end">{t('fields.amount')}</TableHead>
                <TableHead>{t('fields.date')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-10">{t('noOrders')}</TableCell>
                </TableRow>
              ) : (
                rows.map((o) => (
                  <TableRow key={o.id} className="cursor-pointer" onClick={() => (window.location.href = `/orders/${o.id}`)}>
                    <TableCell>
                      <Link href={`/orders/${o.id}`} className="font-mono text-xs text-primary hover:underline">
                        {o.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell>{companyById(o.clientId)?.nameAr ?? '—'}</TableCell>
                    <TableCell>{companyById(o.carrierId)?.nameAr ?? <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>{localizeCity(o.originCity)} ← {localizeCity(o.destinationCity)}</TableCell>
                    <TableCell>
                      <Badge variant={o.mode === 'DIRECT' ? 'warning' : 'secondary'}>
                        {o.mode === 'OPEN' ? t('adminList.modeOpen') : t('adminList.modeDirect')}
                      </Badge>
                    </TableCell>
                    <TableCell><StatusBadge status={o.status} /></TableCell>
                    <TableCell className="text-center num">{o.bidCount || '—'}</TableCell>
                    <TableCell className="text-end"><Currency amount={o.agreedPrice ?? o.clientBudget} /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(o.createdAt)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
      </FadeIn>
    </>
  );
}

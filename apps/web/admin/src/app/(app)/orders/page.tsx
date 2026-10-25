'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { Currency } from '@/components/currency';
import { MiniStat } from '@/components/ui/mini-stat';
import { FadeIn } from '@/components/ui/fade-in';
import { FileText, Truck, Gavel, Wallet } from 'lucide-react';
import useSWR from 'swr';
import { useTranslations } from 'next-intl';
import { fetcher } from '@/lib/api';
import { ORDERS, companyById, formatDate, normalizeOrderList, SAUDI_CITIES, localizeCity, type Order } from '@naqla/shared-utils';

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
                  {t.key === 'ALL' ? ORDERS.length : ORDERS.filter((o) => o.status === t.key).length}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger className="w-full md:w-[180px]"><SelectValue placeholder={t('adminList.allCities')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">{t('adminList.allCities')}</SelectItem>
              {SAUDI_CITIES.slice(0, 20).map((c) => <SelectItem key={c} value={c}>{localizeCity(c)}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="relative w-full md:w-80">
            <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder={t('adminList.searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} className="ps-9" />
          </div>
        </div>
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

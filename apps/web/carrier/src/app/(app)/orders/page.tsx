'use client';
import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { Currency } from '@/components/currency';
import { PageTransition, FadeItem } from '@/components/page-transition';
import { EmptyState } from '@/components/empty-state';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import {
  CURRENT_CARRIER_ID, formatDate, localizeCity, ordersForCarrier,
  normalizeOrderList, type Order,
} from '@naqla/shared-utils';

export default function CarrierOrdersPage() {
  const t = useTranslations('orders');
  const [tab, setTab] = useState('ALL');
  // GET /orders?mine=true → only orders assigned to this carrier.
  // Mock fallback when API is down: `ordersForCarrier(CURRENT_CARRIER_ID)`.
  const { data, isLoading } = useSWR<unknown>('/orders?mine=true', fetcher);
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
    { key: 'ALL',        label: t('list.tabs.all'),        count: all.length },
    { key: 'ACTIVE',     label: t('list.tabs.active'),      count: all.filter((o) => ['CONFIRMED', 'IN_TRANSIT'].includes(o.status)).length },
    { key: 'IN_TRANSIT', label: t('list.tabs.inTransit'),   count: all.filter((o) => o.status === 'IN_TRANSIT').length },
    { key: 'DELIVERED',  label: t('list.tabs.delivered'),   count: all.filter((o) => o.status === 'DELIVERED').length },
    { key: 'COMPLETED',  label: t('list.tabs.completed'),   count: all.filter((o) => o.status === 'COMPLETED').length },
  ];

  return (
    <PageTransition>
      <FadeItem>
        <PageHeader title={t('list.title')} subtitle={t('list.subtitle')} />
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
        <Card>
          <CardContent className="p-0">
            {rows.length === 0 && !isLoading ? (
              <EmptyState
                icon={Package}
                title={t('list.emptyTitle')}
                description={t('list.emptyDesc')}
              />
            ) : (
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
                  {isLoading && !data
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
                    : rows.map((o) => (
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
                      ))
                  }
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </FadeItem>
    </PageTransition>
  );
}

'use client';
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Check, Clock, Gavel, Search, TrendingUp, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { PageHeader } from '@/components/page-header';
import { PageTransition, FadeItem } from '@/components/page-transition';
import { StatsCard } from '@/components/stats-card';
import { Currency } from '@/components/currency';
import {
  CURRENT_CARRIER_ID, ORDERS, bidsForCarrier, formatRelative, localizeCity,
  type Bid,
} from '@naqla/shared-utils';

const STATUS_BADGE: Record<Bid['status'], 'default' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  PENDING: 'warning', ACCEPTED: 'success', REJECTED: 'destructive',
  WITHDRAWN: 'outline', EXPIRED: 'outline',
};

export default function CarrierBidsPage() {
  const t = useTranslations('orders');
  const STATUS_LABELS: Record<Bid['status'], string> = {
    PENDING: t('bids.status.PENDING'), ACCEPTED: t('bids.status.ACCEPTED'), REJECTED: t('bids.status.REJECTED'),
    WITHDRAWN: t('bids.status.WITHDRAWN'), EXPIRED: t('bids.status.EXPIRED'),
  };
  const bids = bidsForCarrier(CURRENT_CARRIER_ID);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string>('ALL');

  const filtered = useMemo(() => {
    return bids.filter((b) => {
      if (status !== 'ALL' && b.status !== status) return false;
      if (q) {
        const order = ORDERS.find((o) => o.id === b.orderId);
        const hay = `${b.id} ${b.orderId} ${order?.originCity ?? ''} ${order?.destinationCity ?? ''}`;
        if (!hay.toLowerCase().includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [bids, q, status]);

  const total = bids.length;
  const accepted = bids.filter((b) => b.status === 'ACCEPTED').length;
  const pending = bids.filter((b) => b.status === 'PENDING').length;
  const winRate = total > 0 ? (accepted / total) * 100 : 0;

  return (
    <PageTransition>
      <FadeItem>
        <PageHeader
          title={t('bids.title')}
          subtitle={t('bids.subtitle')}
        />
      </FadeItem>

      <FadeItem>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatsCard label={t('bids.statTotal')} value={total.toLocaleString('en-US')} icon={Gavel} />
          <StatsCard label={t('bids.statAccepted')} value={accepted.toLocaleString('en-US')} icon={Check} tone="success" />
          <StatsCard label={t('bids.statPending')}  value={pending.toLocaleString('en-US')} icon={Clock} tone="warning" />
          <StatsCard label={t('bids.statWinRate')}  value={`${winRate.toFixed(0)}%`}        icon={TrendingUp} hint={t('bids.winRateHint')} />
        </div>
      </FadeItem>

      <FadeItem>
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('bids.searchPlaceholder')} className="pe-10" />
              </div>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{t('bids.allStatuses')}</SelectItem>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Mobile: app-like card list */}
            <div className="md:hidden -mx-4 -mb-4 border-t divide-y">
              {filtered.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <X className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  {t('bids.noMatches')}
                </div>
              ) : (
                filtered.map((b) => {
                  const order = ORDERS.find((o) => o.id === b.orderId);
                  return (
                    <div key={b.id} className="p-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs">{b.id}</span>
                        <Badge variant={STATUS_BADGE[b.status]}>{STATUS_LABELS[b.status]}</Badge>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">
                          {order ? `${localizeCity(order.originCity)} ← ${localizeCity(order.destinationCity)}` : '—'}
                        </span>
                        <span className="text-sm font-semibold"><Currency amount={b.price} /></span>
                      </div>
                      <Link href={`/orders/${b.orderId}`} className="font-mono text-xs text-primary">{b.orderId}</Link>
                      {b.notes && <div className="text-xs text-muted-foreground truncate mt-1">{b.notes}</div>}
                      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span className="num">{b.estimatedDays} {b.estimatedDays === 1 ? t('bids.day') : t('bids.days')}</span>
                        <span>{formatRelative(b.createdAt)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Desktop: table */}
            <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('bids.colBidNumber')}</TableHead>
                  <TableHead>{t('bids.colOrder')}</TableHead>
                  <TableHead>{t('bids.colRoute')}</TableHead>
                  <TableHead className="text-end">{t('bids.colPrice')}</TableHead>
                  <TableHead>{t('bids.colDuration')}</TableHead>
                  <TableHead>{t('bids.colNotes')}</TableHead>
                  <TableHead>{t('bids.colDate')}</TableHead>
                  <TableHead>{t('bids.colStatus')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-12 text-center text-muted-foreground">
                      <X className="h-8 w-8 mx-auto mb-2 opacity-40" />
                      {t('bids.noMatches')}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((b) => {
                    const order = ORDERS.find((o) => o.id === b.orderId);
                    return (
                      <TableRow key={b.id}>
                        <TableCell className="font-mono text-xs">{b.id}</TableCell>
                        <TableCell>
                          <Link href={`/orders/${b.orderId}`} className="font-mono text-xs text-primary">{b.orderId}</Link>
                        </TableCell>
                        <TableCell className="text-sm">
                          {order ? `${localizeCity(order.originCity)} ← ${localizeCity(order.destinationCity)}` : '—'}
                        </TableCell>
                        <TableCell className="text-end font-medium"><Currency amount={b.price} /></TableCell>
                        <TableCell className="num text-sm">{b.estimatedDays} {b.estimatedDays === 1 ? t('bids.day') : t('bids.days')}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{b.notes ?? '—'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatRelative(b.createdAt)}</TableCell>
                        <TableCell>
                          <Badge variant={STATUS_BADGE[b.status]}>{STATUS_LABELS[b.status]}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      </FadeItem>
    </PageTransition>
  );
}

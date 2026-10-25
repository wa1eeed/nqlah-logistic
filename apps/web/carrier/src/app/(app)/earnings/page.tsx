'use client';
import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import useSWR from 'swr';
import { ArrowDownRight, Calendar, ShieldCheck, TrendingUp, Wallet } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/page-header';
import { PageTransition, FadeItem } from '@/components/page-transition';
import { StatsCard } from '@/components/stats-card';
import { StatusBadge } from '@/components/status-badge';
import { Currency } from '@/components/currency';
import { fetcher } from '@/lib/api';
import {
  CURRENT_CARRIER_ID, companyById, formatDate, normalizePaymentList,
  paymentsForCarrier,
} from '@naqla/shared-utils';

// API includes an `order` relation with embedded client info — we prefer it
// over `companyById` lookups since DB cuids don't match mock IDs.
type ApiPayment = ReturnType<typeof paymentsForCarrier>[number] & {
  order?: { orderNumber?: string; client?: { nameAr?: string } };
  carrierAmount?: number;
  createdAt?: string;
};

export default function CarrierEarningsPage() {
  const t = useTranslations('payments');
  // GET /payments — role-aware (carrier sees only their own payments).
  // normalizePaymentList aliases Prisma fields (status/totalAmount/
  // commissionAmount) to the mock shape (state/amount/commission) and zeroes
  // out the missing `vat` so arithmetic doesn't produce NaN.
  const { data } = useSWR<unknown>('/payments', fetcher);
  const all = useMemo<ApiPayment[]>(() => {
    const normalized = normalizePaymentList<ApiPayment>(data);
    return normalized.length > 0 ? normalized : (paymentsForCarrier(CURRENT_CARRIER_ID) as ApiPayment[]);
  }, [data]);
  const released = all.filter((p) => p.state === 'RELEASED');
  const held = all.filter((p) => p.state === 'HELD');

  // Carrier-side net = whatever ends up in the carrier's wallet. Prefer the
  // backend's pre-computed `carrierAmount` (Prisma field) when present,
  // otherwise compute from amount − commission − vat (mock data path).
  const carrierNetOf = (p: ApiPayment): number => {
    if (typeof p.carrierAmount === 'number') return p.carrierAmount;
    const amount = p.amount ?? 0;
    const commission = p.commission ?? 0;
    const vat = p.vat ?? 0;
    return amount - commission - vat;
  };
  const totalNet = released.reduce((s, p) => s + carrierNetOf(p), 0);
  const totalPending = held.reduce((s, p) => s + carrierNetOf(p), 0);
  const totalCommission = released.reduce((s, p) => s + (p.commission ?? 0), 0);

  return (
    <PageTransition>
      <FadeItem>
        <PageHeader title={t('earnings.title')} subtitle={t('earnings.subtitle')} />
      </FadeItem>

      <FadeItem>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatsCard label={t('earnings.netReceived')} value={<Currency amount={totalNet} />} hint={t('earnings.operationsCount', { count: released.length })} icon={ArrowDownRight} tone="success" />
          <StatsCard label={t('earnings.awaitingDelivery')} value={<Currency amount={totalPending} />} hint={t('earnings.inEscrowCount', { count: held.length })} icon={ShieldCheck} tone="warning" />
          <StatsCard label={t('earnings.platformCommissions')} value={<Currency amount={totalCommission} />} hint={t('earnings.onCompleted')} icon={TrendingUp} tone="default" />
          <StatsCard label={t('earnings.totalTrips')} value={released.length + held.length} hint={t('earnings.paidPlusEscrow')} icon={Wallet} tone="default" />
        </div>
      </FadeItem>

      <FadeItem>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t('earnings.movementStatement')}</CardTitle>
                <CardDescription className="mt-1">{t('earnings.movementDesc')}</CardDescription>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                {t('earnings.last30Days')}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* Mobile: app-like card list */}
            <div className="md:hidden divide-y">
              {all.map((p) => {
                const clientName =
                  p.order?.client?.nameAr
                  ?? (p.clientId ? companyById(p.clientId)?.nameAr : null)
                  ?? '—';
                const orderRef = p.order?.orderNumber ?? p.orderId;
                return (
                  <div key={p.id} className="p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-primary">{orderRef}</span>
                      <StatusBadge status={p.state} />
                    </div>
                    <div className="mt-1 text-sm font-medium">{clientName}</div>
                    <div className="text-xs text-muted-foreground font-mono">{p.id}</div>
                    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      <span className="text-muted-foreground">{t('fields.price')}</span>
                      <span className="text-end"><Currency amount={p.amount ?? 0} /></span>
                      <span className="text-muted-foreground">{t('fields.commission')}</span>
                      <span className="text-end text-destructive"><Currency amount={-(p.commission ?? 0)} /></span>
                      <span className="text-muted-foreground">{t('fields.net')}</span>
                      <span className="text-end font-medium"><Currency amount={carrierNetOf(p)} /></span>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">{formatDate(p.releasedAt ?? p.paidAt ?? p.createdAt)}</div>
                  </div>
                );
              })}
            </div>
            {/* Desktop: table */}
            <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('fields.operation')}</TableHead>
                  <TableHead>{t('fields.order')}</TableHead>
                  <TableHead>{t('fields.client')}</TableHead>
                  <TableHead className="text-end">{t('fields.price')}</TableHead>
                  <TableHead className="text-end">{t('fields.commission')}</TableHead>
                  <TableHead className="text-end">{t('fields.net')}</TableHead>
                  <TableHead>{t('fields.status')}</TableHead>
                  <TableHead>{t('fields.date')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {all.map((p) => {
                  // Prefer embedded `order.client.nameAr` (API response) over
                  // looking up by mock id — DB cuids don't match the mock array.
                  // Fall back to companyById only when the embedded relation is
                  // missing (offline mock path).
                  const clientName =
                    p.order?.client?.nameAr
                    ?? (p.clientId ? companyById(p.clientId)?.nameAr : null)
                    ?? '—';
                  // Same idea for the order: show the human-readable order
                  // number rather than the cuid.
                  const orderRef = p.order?.orderNumber ?? p.orderId;
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs font-medium">{p.id}</TableCell>
                      <TableCell className="font-mono text-xs text-primary">{orderRef}</TableCell>
                      <TableCell>{clientName}</TableCell>
                      <TableCell className="text-end"><Currency amount={p.amount ?? 0} /></TableCell>
                      <TableCell className="text-end text-destructive"><Currency amount={-(p.commission ?? 0)} /></TableCell>
                      <TableCell className="text-end font-medium"><Currency amount={carrierNetOf(p)} /></TableCell>
                      <TableCell><StatusBadge status={p.state} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(p.releasedAt ?? p.paidAt ?? p.createdAt)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      </FadeItem>
    </PageTransition>
  );
}

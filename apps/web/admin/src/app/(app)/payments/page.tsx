'use client';
import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowDownRight, RotateCcw, ShieldCheck, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { PageHeader } from '@/components/page-header';
import { StatsCard } from '@/components/stats-card';
import { StatusBadge } from '@/components/status-badge';
import { Currency } from '@/components/currency';
import { FadeIn } from '@/components/ui/fade-in';
import useSWR from 'swr';
import { Loader2 } from 'lucide-react';
import { api, fetcher } from '@/lib/api';
import { notify } from '@/lib/notify';
import { PAYMENTS, companyById, formatDate, type Payment } from '@naqla/shared-utils';

export default function AdminPaymentsPage() {
  const t = useTranslations('payments');
  const [tab, setTab] = useState('ALL');
  const [releasingId, setReleasingId] = useState<string | null>(null);

  // GET /payments — list of escrow + released payments. Falls back to mock.
  const { data, mutate } = useSWR<unknown>('/payments', fetcher);

  // Admin can force-release a HELD payment to the carrier (overrides the
  // 72h auto-release). Backend: POST /payments/:id/release — atomically
  // flips state HELD → RELEASED and credits the carrier's wallet.
  const release = async (id: string) => {
    if (releasingId) return;
    setReleasingId(id);
    try {
      await api.post(`/payments/${id}/release`, {});
      await mutate();
      notify.success(t('adminPayments.releaseSuccessTitle'), t('adminPayments.releaseSuccessBody'));
    } catch (err) {
      notify.error(err, t('adminPayments.releaseErrorTitle'));
    } finally {
      setReleasingId(null);
    }
  };
  const all: Payment[] = useMemo(() => {
    const arr =
      Array.isArray(data) ? data :
      Array.isArray((data as { items?: unknown[] })?.items) ? (data as { items: unknown[] }).items :
      [];
    return (arr.length > 0 ? arr : PAYMENTS) as Payment[];
  }, [data]);

  const rows = useMemo(
    () => (tab === 'ALL' ? all : all.filter((p) => p.state === tab)),
    [all, tab],
  );

  const totalHeld = all.filter((p) => p.state === 'HELD').reduce((s, p) => s + p.amount, 0);
  const totalReleased = all.filter((p) => p.state === 'RELEASED').reduce((s, p) => s + p.amount, 0);
  const totalCommission = all.reduce((s, p) => s + p.commission, 0);

  return (
    <>
      <PageHeader eyebrow={t('adminPayments.eyebrow')} title={t('title')} subtitle={t('adminPayments.subtitle')} />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard
          label={t('adminPayments.heldInEscrow')}
          value={<Currency amount={totalHeld} />}
          hint={t('adminPayments.transactionsCount', { count: PAYMENTS.filter((p) => p.state === 'HELD').length })}
          icon={ShieldCheck}
          tone="warning"
          index={0}
        />
        <StatsCard
          label={t('adminPayments.releasedCard')}
          value={<Currency amount={totalReleased} />}
          hint={t('adminPayments.transactionsCount', { count: PAYMENTS.filter((p) => p.state === 'RELEASED').length })}
          icon={ArrowDownRight}
          tone="success"
          index={1}
        />
        <StatsCard
          label={t('adminPayments.platformCommission')}
          value={<Currency amount={totalCommission} />}
          hint={t('adminPayments.onAllTransactions')}
          icon={Wallet}
          tone="default"
          index={2}
        />
        <StatsCard
          label={t('adminPayments.refunded')}
          value={PAYMENTS.filter((p) => p.state === 'REFUNDED').length}
          hint={t('adminPayments.refund')}
          icon={RotateCcw}
          tone="danger"
          index={3}
        />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="ALL">{t('adminPayments.tabAll', { count: PAYMENTS.length })}</TabsTrigger>
          <TabsTrigger value="HELD">{t('adminPayments.tabHeld', { count: PAYMENTS.filter((p) => p.state === 'HELD').length })}</TabsTrigger>
          <TabsTrigger value="RELEASED">{t('adminPayments.tabReleased', { count: PAYMENTS.filter((p) => p.state === 'RELEASED').length })}</TabsTrigger>
          <TabsTrigger value="REFUNDED">{t('adminPayments.tabRefunded', { count: PAYMENTS.filter((p) => p.state === 'REFUNDED').length })}</TabsTrigger>
        </TabsList>
      </Tabs>

      <FadeIn delay={0.08}>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('adminPayments.colTransaction')}</TableHead>
                <TableHead>{t('adminPayments.colOrder')}</TableHead>
                <TableHead>{t('adminPayments.colClient')}</TableHead>
                <TableHead>{t('adminPayments.colCarrier')}</TableHead>
                <TableHead className="text-end">{t('adminPayments.colAmount')}</TableHead>
                <TableHead className="text-end">{t('adminPayments.colCommission')}</TableHead>
                <TableHead>{t('adminPayments.colStatus')}</TableHead>
                <TableHead>{t('adminPayments.colPayment')}</TableHead>
                <TableHead className="text-end"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs font-medium">{p.id}</TableCell>
                  <TableCell className="font-mono text-xs text-primary">{p.orderId}</TableCell>
                  <TableCell>{companyById(p.clientId)?.nameAr ?? '—'}</TableCell>
                  <TableCell>{companyById(p.carrierId)?.nameAr ?? '—'}</TableCell>
                  <TableCell className="text-end"><Currency amount={p.amount} /></TableCell>
                  <TableCell className="text-end"><Currency amount={p.commission} /></TableCell>
                  <TableCell><StatusBadge status={p.state} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(p.paidAt)}</TableCell>
                  <TableCell className="text-end">
                    {p.state === 'HELD' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => release(p.id)}
                        disabled={releasingId === p.id}
                      >
                        {releasingId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                        {t('adminPayments.release')}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      </FadeIn>
    </>
  );
}

'use client';
import { useMemo, useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import useSWR, { useSWRConfig } from 'swr';
import { BadgeCheck, Coins, HandCoins, RotateCcw, TrendingUp, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/page-header';
import { PageTransition, FadeItem } from '@/components/page-transition';
import { StatsCard } from '@/components/stats-card';
import { Currency } from '@/components/currency';
import { SaudiLicensePlate, parsePlateString } from '@/components/saudi-plate';
import { ConfirmDialog } from '@/components/fleet-bits';
import { useFreelancerStore, resolveInvoices } from '@/stores/freelancer-store';
import { api, fetcher } from '@/lib/api';
import { notify } from '@/lib/notify';
import {
  CURRENT_CARRIER_ID, driverById, truckById, revenueForOrder, formatDate,
  normalizeTruckList, normalizeDriverList,
  type Driver, type Truck,
} from '@naqla/shared-utils';

/** A freelancer invoice as rendered — API rows carry `orderRevenue`; mock rows
 *  resolve revenue from the trip table. */
interface Row {
  id: string;
  orderId: string;
  orderNumber: string;
  truckId: string;
  driverId?: string | null;
  amount: number;
  status: 'DUE' | 'PAID';
  issuedAt: string;
  paidAt?: string | null;
  revenue: number | undefined;
  profit: number | undefined;
  marginPct: number | undefined;
  driverName: string;
  plate: string;
}

type ApiInvoice = {
  id: string; orderId: string; orderNumber: string; truckId: string; driverId?: string | null;
  amount: number; status: 'DUE' | 'PAID'; issuedAt: string; paidAt?: string | null; orderRevenue?: number | null;
};

export default function CarrierProfitabilityPage() {
  const t = useTranslations('payments');
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Mock fallback (used only when the API is unavailable).
  const created = useFreelancerStore((s) => s.created);
  const statusOverride = useFreelancerStore((s) => s.statusOverride);
  const paidAt = useFreelancerStore((s) => s.paidAt);
  const storeMarkPaid = useFreelancerStore((s) => s.markPaid);
  const storeMarkDue = useFreelancerStore((s) => s.markDue);
  const resetInvoices = useFreelancerStore((s) => s.resetInvoices);

  // Live data from the API.
  const { data: invRaw, error: invError } = useSWR<unknown>('/freelancer-invoices', fetcher);
  const { data: trucksRaw } = useSWR<unknown>('/fleet/trucks', fetcher);
  const { data: driversRaw } = useSWR<unknown>('/fleet/drivers', fetcher);
  const { mutate } = useSWRConfig();
  const apiMode = Array.isArray(invRaw);
  // Only treat the page as offline (and offer the local-reset) once the fetch
  // has actually failed — avoids a flash of the fallback UI while it loads.
  const offline = !apiMode && !!invError;

  const [payTarget, setPayTarget] = useState<Row | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const rows = useMemo<Row[]>(() => {
    // Resolve truck plate + driver name from the live fleet (fallback to mock).
    const truckMap = new Map(normalizeTruckList<Truck>(trucksRaw).map((t) => [t.id, t]));
    const driverMap = new Map(normalizeDriverList<Driver>(driversRaw).map((d) => [d.id, d]));
    const plateOf = (id: string) => truckMap.get(id)?.plateNumber ?? truckById(id)?.plateNumber ?? '';
    const nameOf = (id?: string | null) =>
      (id ? driverMap.get(id)?.fullName : undefined) ?? driverById(id)?.fullName ?? '—';

    const source: Array<{ inv: Omit<Row, 'revenue' | 'profit' | 'marginPct' | 'driverName' | 'plate'>; revenue: number | undefined }> =
      apiMode
        ? (invRaw as ApiInvoice[]).map((i) => ({
            inv: { ...i },
            revenue: i.orderRevenue ?? revenueForOrder(i.orderId),
          }))
        : resolveInvoices(CURRENT_CARRIER_ID, { created, statusOverride, paidAt }).map((i) => ({
            inv: { ...i },
            revenue: revenueForOrder(i.orderId),
          }));

    return source.map(({ inv, revenue }) => {
      const profit = revenue === undefined ? undefined : revenue - inv.amount;
      const marginPct = revenue && revenue > 0 && profit !== undefined ? (profit / revenue) * 100 : undefined;
      return { ...inv, revenue, profit, marginPct, driverName: nameOf(inv.driverId), plate: plateOf(inv.truckId) };
    });
  }, [apiMode, invRaw, trucksRaw, driversRaw, created, statusOverride, paidAt]);

  const totals = useMemo(() => {
    const revenue = rows.reduce((s, r) => s + (r.revenue ?? 0), 0);
    const cost = rows.reduce((s, r) => s + r.amount, 0);
    const due = rows.filter((r) => r.status === 'DUE').reduce((s, r) => s + r.amount, 0);
    return { revenue, cost, profit: revenue - cost, due };
  }, [rows]);

  const doMarkPaid = async (id: string) => {
    if (apiMode) {
      try { await api.patch(`/freelancer-invoices/${id}/pay`); mutate('/freelancer-invoices'); }
      catch (e) { notify.error(e); return; }
    } else {
      storeMarkPaid(id);
    }
    notify.success(t('profitability.toastPaymentRecorded'));
  };
  const doMarkDue = async (id: string) => {
    if (apiMode) {
      try { await api.patch(`/freelancer-invoices/${id}/reopen`); mutate('/freelancer-invoices'); }
      catch (e) { notify.error(e); return; }
    } else {
      storeMarkDue(id);
    }
  };

  if (!mounted) {
    return (
      <PageTransition>
        <PageHeader title={t('profitability.title')} subtitle={t('profitability.subtitle')} />
        <div className="h-64 rounded-xl border bg-muted/20 animate-pulse" />
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <FadeItem>
        <div className="flex items-start justify-between gap-4">
          <PageHeader
            title={t('profitability.title')}
            subtitle={t('profitability.subtitleFull')}
          />
          {offline && (
            <Button variant="outline" size="sm" className="shrink-0 gap-2" onClick={() => setConfirmReset(true)}>
              <RotateCcw className="h-4 w-4" />
              {t('profitability.reset')}
            </Button>
          )}
        </div>
      </FadeItem>

      <FadeItem>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatsCard label={t('profitability.orderRevenue')} value={<Currency amount={totals.revenue} />} hint={t('profitability.fromClients')} icon={Wallet} tone="default" />
          <StatsCard label={t('profitability.freelancerCost')} value={<Currency amount={totals.cost} />} hint={t('profitability.tripFares')} icon={HandCoins} tone="warning" />
          <StatsCard label={t('profitability.netProfit')} value={<Currency amount={totals.profit} />} hint={t('profitability.revenueMinusCost')} icon={TrendingUp} tone="success" />
          <StatsCard label={t('profitability.dueToFreelancer')} value={<Currency amount={totals.due} />} hint={t('profitability.unpaidInvoices')} icon={Coins} tone="danger" />
        </div>
      </FadeItem>

      <FadeItem>
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">{t('profitability.invoicesTitle')}</CardTitle>
            <CardDescription>
              {t('profitability.invoicesDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                {t('profitability.noInvoices')}
              </div>
            ) : (
              <div className="-mx-6 overflow-x-auto px-6">
              <Table className="min-w-[640px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-start">{t('fields.order')}</TableHead>
                    <TableHead className="text-start">{t('profitability.colFreelancer')}</TableHead>
                    <TableHead className="text-start">{t('profitability.colClientRevenue')}</TableHead>
                    <TableHead className="text-start">{t('profitability.colTripFare')}</TableHead>
                    <TableHead className="text-start">{t('profitability.colProfit')}</TableHead>
                    <TableHead className="text-start">{t('fields.status')}</TableHead>
                    <TableHead className="text-end">{t('profitability.colAction')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => {
                    const parsed = parsePlateString(r.plate);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="align-top">
                          <div className="font-medium num" dir="ltr">{r.orderNumber}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {t('profitability.issuedOn', { date: formatDate(r.issuedAt) })}
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          <div className="flex items-center gap-2">
                            {parsed.letters.length > 0 && (
                              <SaudiLicensePlate
                                letters={parsed.letters}
                                numbers={parsed.numbers}
                                size="thumbnail"
                              />
                            )}
                            <span className="text-sm">{r.driverName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="align-top"><Currency amount={r.revenue} /></TableCell>
                        <TableCell className="align-top"><Currency amount={r.amount} /></TableCell>
                        <TableCell className="align-top">
                          <div className="flex flex-col gap-0.5">
                            <Currency amount={r.profit} className={r.profit !== undefined && r.profit < 0 ? 'text-destructive' : 'text-success'} />
                            {r.marginPct !== undefined && (
                              <span className="num text-xs text-muted-foreground" dir="ltr">
                                {r.marginPct.toFixed(1)}%
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="align-top">
                          {r.status === 'PAID' ? (
                            <Badge variant="outline" className="gap-1 border-success/30 bg-success/10 text-success">
                              <BadgeCheck className="h-3 w-3" />
                              {t('profitability.paid')}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning">
                              {t('profitability.due')}
                            </Badge>
                          )}
                          {r.status === 'PAID' && r.paidAt && (
                            <div className="text-xs text-muted-foreground mt-1">{t('profitability.paidOn', { date: formatDate(r.paidAt) })}</div>
                          )}
                        </TableCell>
                        <TableCell className="align-top text-end">
                          {r.status === 'DUE' ? (
                            <Button size="sm" onClick={() => setPayTarget(r)}>
                              {t('profitability.recordPayment')}
                            </Button>
                          ) : (
                            <Button size="sm" variant="ghost" onClick={() => doMarkDue(r.id)}>
                              {t('profitability.reopen')}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </FadeItem>

      <ConfirmDialog
        open={!!payTarget}
        onOpenChange={(o) => !o && setPayTarget(null)}
        title={t('profitability.payDialogTitle')}
        description={
          payTarget
            ? t('profitability.payDialogDesc', { order: payTarget.orderNumber, amount: payTarget.amount.toLocaleString('en-US') })
            : ''
        }
        confirmLabel={t('profitability.confirmPay')}
        onConfirm={() => {
          if (payTarget) {
            doMarkPaid(payTarget.id);
            setPayTarget(null);
          }
        }}
      />

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        destructive
        title={t('profitability.resetTitle')}
        description={t('profitability.resetDesc')}
        confirmLabel={t('profitability.reset')}
        onConfirm={() => {
          resetInvoices();
          notify.success(t('profitability.toastInvoicesReset'));
          setConfirmReset(false);
        }}
      />
    </PageTransition>
  );
}

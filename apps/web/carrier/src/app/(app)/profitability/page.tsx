'use client';
import { useMemo, useState, useEffect } from 'react';
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
  const { data: invRaw } = useSWR<unknown>('/freelancer-invoices', fetcher);
  const { data: trucksRaw } = useSWR<unknown>('/fleet/trucks', fetcher);
  const { data: driversRaw } = useSWR<unknown>('/fleet/drivers', fetcher);
  const { mutate } = useSWRConfig();
  const apiMode = Array.isArray(invRaw);

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
    notify.success('تم تسجيل دفع الفاتورة');
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
        <PageHeader title="الربحية" subtitle="إيراد الطلبات مقابل فواتير الفري‑لانسر" />
        <div className="h-64 rounded-xl border bg-muted/20 animate-pulse" />
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <FadeItem>
        <div className="flex items-start justify-between gap-4">
          <PageHeader
            title="الربحية"
            subtitle="ربح المزوّد على الطلبات المُسندة للفري‑لانسر = إيراد العميل ناقص أجرة الرحلة"
          />
          {!apiMode && (
            <Button variant="outline" size="sm" className="shrink-0 gap-2" onClick={() => setConfirmReset(true)}>
              <RotateCcw className="h-4 w-4" />
              إعادة الضبط
            </Button>
          )}
        </div>
      </FadeItem>

      <FadeItem>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatsCard label="إيراد الطلبات" value={<Currency amount={totals.revenue} />} hint="من العملاء" icon={Wallet} tone="default" />
          <StatsCard label="تكلفة الفري‑لانسر" value={<Currency amount={totals.cost} />} hint="أجرة الرحلات" icon={HandCoins} tone="warning" />
          <StatsCard label="صافي الربح" value={<Currency amount={totals.profit} />} hint="إيراد ناقص التكلفة" icon={TrendingUp} tone="success" />
          <StatsCard label="مستحقّ للفري‑لانسر" value={<Currency amount={totals.due} />} hint="فواتير غير مدفوعة" icon={Coins} tone="danger" />
        </div>
      </FadeItem>

      <FadeItem>
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">فواتير الرحلات للفري‑لانسر</CardTitle>
            <CardDescription>
              كل رحلة تُسند لشاحنة أو سائق فري‑لانسر تُنشئ فاتورة بأجرة الرحلة. الربح هو الفرق بين إيراد العميل وأجرة الرحلة.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                لا توجد فواتير فري‑لانسر بعد. أسند طلباً لشاحنة فري‑لانسر لإنشاء فاتورة.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-start">الطلب</TableHead>
                    <TableHead className="text-start">الفري‑لانسر</TableHead>
                    <TableHead className="text-start">إيراد العميل</TableHead>
                    <TableHead className="text-start">أجرة الرحلة</TableHead>
                    <TableHead className="text-start">الربح</TableHead>
                    <TableHead className="text-start">الحالة</TableHead>
                    <TableHead className="text-end">إجراء</TableHead>
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
                            صدرت {formatDate(r.issuedAt)}
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
                              مدفوعة
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-warning/30 bg-warning/10 text-warning">
                              مستحقّة
                            </Badge>
                          )}
                          {r.status === 'PAID' && r.paidAt && (
                            <div className="text-xs text-muted-foreground mt-1">دُفعت {formatDate(r.paidAt)}</div>
                          )}
                        </TableCell>
                        <TableCell className="align-top text-end">
                          {r.status === 'DUE' ? (
                            <Button size="sm" onClick={() => setPayTarget(r)}>
                              تسجيل الدفع
                            </Button>
                          ) : (
                            <Button size="sm" variant="ghost" onClick={() => doMarkDue(r.id)}>
                              إعادة فتح
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </FadeItem>

      <ConfirmDialog
        open={!!payTarget}
        onOpenChange={(o) => !o && setPayTarget(null)}
        title="تسجيل دفع الفاتورة"
        description={
          payTarget
            ? `تأكيد دفع أجرة الرحلة للفري‑لانسر عن الطلب ${payTarget.orderNumber} بمبلغ ${payTarget.amount.toLocaleString('en-US')} ر.س.`
            : ''
        }
        confirmLabel="تأكيد الدفع"
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
        title="إعادة ضبط فواتير الفري‑لانسر"
        description="سيحذف هذا كل الفواتير المُنشأة في هذه الجلسة ويعيد الحالات إلى البيانات الأساسية."
        confirmLabel="إعادة الضبط"
        onConfirm={() => {
          resetInvoices();
          notify.success('تمت إعادة ضبط الفواتير');
          setConfirmReset(false);
        }}
      />
    </PageTransition>
  );
}

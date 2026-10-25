'use client';
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  type PieLabelRenderProps,
} from 'recharts';
import {
  Activity, AlertTriangle, ArrowDown, ArrowUp, BarChart2, Building2,
  CheckCircle, Clock, Download, Globe, Package, RefreshCw, Shield,
  Star, TrendingUp, Truck, Users, Wallet,
} from 'lucide-react';
import { fetcher } from '@/lib/api';

// ─── Theme tokens (premium LIGHT theme, mint-only palette) ──────────────────────
const BG     = '#EEF6F4'; // app background (hsl 178 30% 97.5% family)
const CARD   = '#FFFFFF';
const BORDER = '#DCE8E6';
const TEXT   = '#0C2522'; // deep foreground
const MUTED  = '#5F716E';
const GREEN  = '#00C9A7'; // mint (primary series)
const TEAL   = '#0D5C57'; // deep teal
const GOLD   = '#0F766E'; // retinted to teal (was orange #F59E0B)
const RED    = '#EF4444'; // destructive — kept for errors only
const BLUE   = '#2DD4BF'; // retinted to teal (was blue #3B82F6)

type Period = '7d' | '30d' | '90d' | '1y';

// Translator function provided by next-intl's useTranslations('payments').
type Translator = (key: string, values?: Record<string, string | number>) => string;

const PERIODS: { key: Period }[] = [
  { key: '7d' },
  { key: '30d' },
  { key: '90d' },
  { key: '1y' },
];

const TABS: { key: string; icon: React.ElementType }[] = [
  { key: 'market',    icon: TrendingUp },
  { key: 'financial', icon: Wallet },
  { key: 'ops',       icon: Activity },
  { key: 'growth',    icon: BarChart2 },
  { key: 'investor',  icon: Star },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number, decimals = 0) {
  return (n ?? 0).toLocaleString('en-US', { maximumFractionDigits: decimals });
}
function fmtSAR(n: number, unit = 'SAR') {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M ${unit}`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K ${unit}`;
  return `${fmt(n)} ${unit}`;
}
function fmtPct(n: number) { return `${(n ?? 0).toFixed(1)}%`; }
function delta(n: number) {
  if (n > 0) return { color: GREEN, icon: <ArrowUp className="h-3 w-3" />,   text: `+${fmtPct(n)}` };
  if (n < 0) return { color: RED,   icon: <ArrowDown className="h-3 w-3" />, text: fmtPct(n) };
  return { color: MUTED, icon: null, text: '0%' };
}
function trafficLight(val: number, good: number, ok: number) {
  if (val >= good) return GREEN;
  if (val >= ok)   return GOLD;
  return RED;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skel({ w = 'w-full', h = 'h-4' }: { w?: string; h?: string }) {
  return (
    <motion.div
      animate={{ opacity: [0.3, 0.7, 0.3] }}
      transition={{ duration: 1.4, repeat: Infinity }}
      className={`${w} ${h} rounded-md`}
      style={{ background: BORDER }}
    />
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, sub, change, icon: Icon, accent = GREEN, sparkData,
}: {
  label: string;
  value: string;
  sub?: string;
  change?: number;
  icon?: React.ElementType;
  accent?: string;
  sparkData?: number[];
}) {
  const d = change !== undefined ? delta(change) : null;
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3"
      style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: 'var(--shadow-card)' }}
    >
      <div className="flex items-center justify-between">
        <span style={{ color: MUTED, fontSize: 12 }}>{label}</span>
        {Icon && (
          <div
            className="h-8 w-8 rounded-lg flex items-center justify-center"
            style={{ background: `${accent}20` }}
          >
            <Icon className="h-4 w-4" style={{ color: accent }} />
          </div>
        )}
      </div>
      <div style={{ color: TEXT, fontSize: 26, fontWeight: 700, lineHeight: 1 }}>{value}</div>
      <div className="flex items-center justify-between">
        {sub && <span style={{ color: MUTED, fontSize: 11 }}>{sub}</span>}
        {d && (
          <div className="flex items-center gap-1" style={{ color: d.color, fontSize: 12 }}>
            {d.icon}{d.text}
          </div>
        )}
      </div>
      {sparkData && sparkData.length > 0 && (
        <div style={{ height: 32, marginTop: 4 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparkData.map((v, i) => ({ i, v }))}>
              <Line type="monotone" dataKey="v" stroke={accent} strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="h-4 w-1 rounded-full" style={{ background: GREEN }} />
      <h3 style={{ color: TEXT, fontSize: 14, fontWeight: 600 }}>{children}</h3>
    </div>
  );
}

// ─── Chart wrapper ────────────────────────────────────────────────────────────
function ChartCard({
  title, children, span = 1,
}: {
  title: string;
  children: React.ReactNode;
  span?: number;
}) {
  return (
    <div
      className={`rounded-2xl p-5 ${span === 2 ? 'col-span-2' : ''}`}
      style={{ background: CARD, border: `1px solid ${BORDER}`, boxShadow: 'var(--shadow-card)' }}
    >
      <div style={{ color: MUTED, fontSize: 12, marginBottom: 16 }}>{title}</div>
      {children}
    </div>
  );
}

// Mint→teal ramp so every series stays on-palette (no gold/blue/purple/pink).
const CHART_COLORS = ['#00C9A7', '#0D5C57', '#14B8A6', '#0F766E', '#2DD4BF', '#5EEAD4'];

// ─── PDF Export ───────────────────────────────────────────────────────────────
async function exportPDF(summary: Record<string, unknown> | undefined, period: string, t: Translator) {
  const { default: jsPDF } = await import('jspdf');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const autoTableModule = await import('jspdf-autotable') as any;
  const autoTable = autoTableModule.default ?? autoTableModule;

  const sar = t('reports.sar');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const today = new Date().toLocaleDateString('ar-SA-u-nu-latn');

  const addHeader = (page: number, total: number) => {
    doc.setFillColor(10, 61, 58);
    doc.rect(0, 0, pageW, 18, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text(t('reports.pdf.confidentialHeader'), pageW - 10, 12, { align: 'right' });
    doc.text(t('reports.pdf.pageOf', { page, total }), 10, 12);
  };
  const addFooter = () => {
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(t('reports.pdf.issueDate', { date: today }), pageW / 2, pageH - 8, { align: 'center' });
  };

  // ── Page 1: Cover ──
  doc.setFillColor(10, 61, 58);
  doc.rect(0, 0, pageW, pageH, 'F');
  doc.setFillColor(0, 201, 167);
  doc.rect(0, pageH / 2 - 2, pageW, 4, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.text(t('reports.pdf.brand'), pageW / 2, 80, { align: 'center' });
  doc.setFontSize(18);
  doc.text(t('reports.pdf.coverTitle'), pageW / 2, 100, { align: 'center' });
  doc.setFontSize(13);
  const pLabel: Record<string, string> = {
    '7d': t('reports.periods.7d'), '30d': t('reports.periods.30d'),
    '90d': t('reports.periods.90d'), '1y': t('reports.periods.1y'),
  };
  doc.text(t('reports.pdf.periodLine', { period: pLabel[period] ?? period }), pageW / 2, 120, { align: 'center' });
  doc.setFontSize(11);
  doc.text(t('reports.pdf.issueDate', { date: today }), pageW / 2, 140, { align: 'center' });
  doc.setFontSize(10);
  doc.setTextColor(0, 201, 167);
  doc.text(t('reports.pdf.confidentialCover'), pageW / 2, 160, { align: 'center' });

  // ── Page 2: Executive Summary ──
  doc.addPage();
  addHeader(2, 4);
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(16);
  doc.text(t('reports.pdf.execSummary'), pageW - 20, 35, { align: 'right' });

  const gmv            = Number(summary?.gmv ?? 0);
  const revenue        = Number(summary?.revenue ?? 0);
  const completionRate = Number(summary?.completionRate ?? 0);
  const onTimeRate     = Number(summary?.onTimeDeliveryRate ?? 0);
  const disputeRate    = Number(summary?.disputeRate ?? 0);
  const newClients     = Number(summary?.newClients ?? 0);
  const newCarriers    = Number(summary?.newCarriers ?? 0);
  const gmvMoM         = Number(summary?.gmvMoM ?? 0);
  const takeRate       = Number(summary?.takeRate ?? 0);

  autoTable(doc, {
    startY: 45,
    head: [[t('reports.pdf.colMetric'), t('reports.pdf.colValue'), t('reports.pdf.colRating')]],
    body: [
      [t('reports.pdf.gmvRow'), fmtSAR(gmv, sar), gmvMoM > 0 ? t('reports.pdf.growth') : '—'],
      [t('reports.pdf.revenueRow'), fmtSAR(revenue, sar), ''],
      [t('reports.pdf.completionRate'), fmtPct(completionRate), completionRate >= 90 ? t('reports.pdf.excellent') : t('reports.pdf.needsImprovement')],
      [t('reports.pdf.onTime'), fmtPct(onTimeRate), onTimeRate >= 95 ? t('reports.pdf.good') : t('reports.pdf.review')],
      [t('reports.pdf.disputeRate'), fmtPct(disputeRate), disputeRate <= 2 ? t('reports.pdf.good') : t('reports.pdf.review')],
      [t('reports.pdf.newClients'), fmt(newClients), ''],
      [t('reports.pdf.newCarriers'), fmt(newCarriers), ''],
    ],
    styles: { font: 'helvetica', fontSize: 10, halign: 'right' },
    headStyles: { fillColor: [10, 61, 58], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [245, 250, 248] },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const summaryY = (doc as any).lastAutoTable.finalY + 15;
  doc.setFontSize(11);
  doc.setTextColor(50, 50, 50);
  const summaryText = gmvMoM > 0
    ? t('reports.pdf.summaryGrowth', { growth: gmvMoM.toFixed(1), completion: fmtPct(completionRate), onTime: fmtPct(onTimeRate) })
    : t('reports.pdf.summaryStable', { gmv: fmtSAR(gmv, sar), completion: fmtPct(completionRate) });
  doc.text(summaryText, pageW - 20, summaryY, { align: 'right', maxWidth: pageW - 30 });
  addFooter();

  // ── Page 3: Market KPIs ──
  doc.addPage();
  addHeader(3, 4);
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(14);
  doc.text(t('reports.pdf.marketKpis'), pageW - 20, 35, { align: 'right' });

  const topRoutes  = Array.isArray(summary?.topRoutes)  ? (summary.topRoutes as Array<{ route: string }>)  : [];
  const topCarriers = Array.isArray(summary?.topCarriers) ? (summary.topCarriers as Array<{ name: string }>) : [];

  autoTable(doc, {
    startY: 45,
    head: [[t('reports.pdf.colMetric'), t('reports.pdf.colActual'), t('reports.pdf.colTarget'), t('reports.pdf.colStatus')]],
    body: [
      ['Take Rate', fmtPct(takeRate), '8%', Math.abs(takeRate - 8) <= 1 ? t('reports.pdf.good') : t('reports.pdf.review')],
      [t('reports.pdf.topRoute'), topRoutes[0]?.route ?? '—', '—', ''],
      [t('reports.pdf.topCarrier'), topCarriers[0]?.name ?? '—', '—', ''],
    ],
    styles: { halign: 'right', fontSize: 10 },
    headStyles: { fillColor: [10, 61, 58], textColor: [255, 255, 255] },
  });
  addFooter();

  // ── Page 4: Growth & Investor ──
  doc.addPage();
  addHeader(4, 4);
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(14);
  doc.text(t('reports.pdf.growthInvestors'), pageW - 20, 35, { align: 'right' });
  autoTable(doc, {
    startY: 45,
    head: [[t('reports.pdf.colMetric'), t('reports.pdf.colValue')]],
    body: [
      [t('reports.pdf.ordersMoM'), fmtPct(Number(summary?.ordersMoM ?? 0))],
      [t('reports.pdf.gmvMoM'),    fmtPct(gmvMoM)],
      [t('reports.pdf.newClients'), fmt(newClients)],
      [t('reports.pdf.newCarriers'), fmt(newCarriers)],
    ],
    styles: { halign: 'right', fontSize: 10 },
    headStyles: { fillColor: [13, 92, 87], textColor: [255, 255, 255] },
  });
  addFooter();

  doc.save(`naqla-report-${period}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ─── Tab components ───────────────────────────────────────────────────────────

function MarketTab({ period }: { period: Period }) {
  const t = useTranslations('payments');
  const sar = t('reports.sar');
  const { data, isLoading } = useSWR(`/admin/analytics/marketplace?period=${period}`, fetcher, { refreshInterval: 300_000 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = data as any;

  const statusData = useMemo(() => {
    if (!d?.ordersByStatus) return [];
    const labels: Record<string, string> = {
      COMPLETED: t('reports.market.status.COMPLETED'), IN_TRANSIT: t('reports.market.status.IN_TRANSIT'), BIDDING: t('reports.market.status.BIDDING'),
      PUBLISHED: t('reports.market.status.PUBLISHED'), ASSIGNED: t('reports.market.status.ASSIGNED'), CONFIRMED: t('reports.market.status.CONFIRMED'),
      CANCELLED: t('reports.market.status.CANCELLED'), DRAFT: t('reports.market.status.DRAFT'), DELIVERED: t('reports.market.status.DELIVERED'),
    };
    return Object.entries(d.ordersByStatus as Record<string, number>).map(([k, v]) => ({
      name: labels[k] ?? k,
      value: v,
    }));
  }, [d, t]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-4 gap-4">
        {Array(8).fill(0).map((_, i) => <Skel key={i} h="h-32" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="GMV" value={fmtSAR(d?.gmv, sar)} icon={Wallet} accent={GREEN} sparkData={(d?.gmvTrend ?? []).map((pt: { value: number }) => pt.value)} />
        <KpiCard label="Take Rate" value={fmtPct(d?.takeRate)} sub={t('reports.market.commissionOfGmv')} icon={TrendingUp} accent={TEAL} />
        <KpiCard label={t('reports.market.completionRate')} value={fmtPct(d?.completionRate)} icon={CheckCircle} accent={trafficLight(d?.completionRate ?? 0, 90, 75)} />
        <KpiCard label={t('reports.market.avgMatching')} value={`${(d?.avgMatchingHours ?? 0).toFixed(1)} ${t('reports.market.hours')}`} icon={Clock} accent={GOLD} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label={t('reports.market.carrierUtilization')} value={fmtPct(d?.carrierUtilization)} icon={Truck} accent={BLUE} />
        <KpiCard label={t('reports.market.supplyLiquidity')} value={`${(d?.supplyLiquidity ?? 0).toFixed(1)} ${t('reports.market.bidsPerOrder')}`} icon={Activity} accent={GREEN} />
        <KpiCard label={t('reports.market.repeatRate')} value={fmtPct(d?.repeatRate)} sub={t('reports.market.repeatSub')} icon={RefreshCw} accent={TEAL} />
        <KpiCard label={t('reports.market.commissions')} value={fmtSAR(d?.commission, sar)} icon={Wallet} accent={GOLD} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title={t('reports.market.ordersByStatus')}>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                dataKey="value"
                label={({ name, percent }: PieLabelRenderProps) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {statusData.map((_: unknown, i: number) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: CARD, border: `1px solid ${BORDER}`, color: TEXT }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title={t('reports.market.topRoutes')}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={(d?.topRoutes ?? []).slice(0, 6)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
              <XAxis type="number" tick={{ fill: MUTED, fontSize: 11 }} />
              <YAxis type="category" dataKey="route" width={120} tick={{ fill: MUTED, fontSize: 10 }} />
              <Tooltip contentStyle={{ background: CARD, border: `1px solid ${BORDER}`, color: TEXT }} />
              <Bar dataKey="count" fill={GREEN} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
        <div className="px-5 py-3" style={{ background: CARD }}>
          <span style={{ color: MUTED, fontSize: 12 }}>{t('reports.market.topCarriersByRevenue')}</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: `1px solid ${BORDER}`, background: CARD }}>
              {['#', t('reports.market.carrier'), t('reports.market.orders'), t('reports.market.revenue')].map((h) => (
                <th key={h} className="px-5 py-3 text-right" style={{ color: MUTED, fontSize: 11 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(d?.topCarriers ?? []).map((c: { carrierId: string; name: string; count: number; revenue: number }, i: number) => (
              <tr
                key={c.carrierId}
                style={{ borderBottom: `1px solid ${BORDER}20`, background: i % 2 ? `${CARD}80` : 'transparent' }}
              >
                <td className="px-5 py-3" style={{ color: MUTED }}>{i + 1}</td>
                <td className="px-5 py-3 font-medium" style={{ color: TEXT }}>{c.name}</td>
                <td className="px-5 py-3" style={{ color: MUTED }}>{fmt(c.count)}</td>
                <td className="px-5 py-3 font-semibold" style={{ color: GREEN }}>{fmtSAR(c.revenue, sar)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FinancialTab({ period }: { period: Period }) {
  const t = useTranslations('payments');
  const sar = t('reports.sar');
  const { data, isLoading } = useSWR(`/admin/analytics/financial?period=${period}`, fetcher, { refreshInterval: 300_000 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = data as any;
  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {Array(6).fill(0).map((_, i) => <Skel key={i} h="h-32" />)}
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KpiCard label="GMV" value={fmtSAR(d?.gmv, sar)} change={d?.gmvGrowth} icon={Wallet} accent={GREEN} sparkData={(d?.gmvTrend ?? []).map((pt: { value: number }) => pt.value)} />
        <KpiCard label={t('reports.financial.revenue')} value={fmtSAR(d?.revenue, sar)} change={d?.revenueGrowth} icon={TrendingUp} accent={TEAL} sparkData={(d?.revTrend ?? []).map((pt: { value: number }) => pt.value)} />
        <KpiCard label="Take Rate" value={fmtPct(d?.takeRate)} sub={t('reports.financial.target8')} icon={Activity} accent={GOLD} />
        <KpiCard label={t('reports.financial.avgOrderValue')} value={fmtSAR(d?.avgOrderValue, sar)} icon={Package} accent={BLUE} />
        <KpiCard label={t('vat')} value={fmtSAR(d?.vat, sar)} sub={t('reports.financial.vatSub')} icon={Building2} accent={MUTED} />
        <KpiCard label={t('reports.financial.gmvMoM')} value={fmtPct(d?.gmvGrowth)} change={d?.gmvGrowth} icon={TrendingUp} accent={(d?.gmvGrowth ?? 0) >= 0 ? GREEN : RED} />
      </div>
      <ChartCard title={t('reports.financial.gmvVsRevenue')} span={2}>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart
            data={(d?.gmvTrend ?? []).map((pt: { label: string; value: number }, i: number) => ({
              ...pt,
              revenue: (d?.revTrend ?? [])[i]?.value ?? 0,
            }))}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
            <XAxis dataKey="label" tick={{ fill: MUTED, fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
            <YAxis tick={{ fill: MUTED, fontSize: 10 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}K`} />
            <Tooltip
              contentStyle={{ background: CARD, border: `1px solid ${BORDER}`, color: TEXT }}
              formatter={(v: unknown) => fmtSAR(Number(v), sar)}
            />
            <Legend wrapperStyle={{ color: MUTED }} />
            <Line type="monotone" dataKey="value"   name="GMV"     stroke={GREEN} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="revenue" name={t('reports.financial.revenueSeries')} stroke={GOLD}  strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function OpsTab({ period }: { period: Period }) {
  const t = useTranslations('payments');
  const { data, isLoading } = useSWR(`/admin/analytics/operational?period=${period}`, fetcher, { refreshInterval: 300_000 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = data as any;
  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {Array(6).fill(0).map((_, i) => <Skel key={i} h="h-32" />)}
      </div>
    );
  }
  const onTimeColor = trafficLight(d?.onTimeDeliveryRate ?? 0, 95, 85);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KpiCard label={t('reports.ops.onTime')} value={fmtPct(d?.onTimeDeliveryRate)} sub={t('reports.ops.target95')} icon={CheckCircle} accent={onTimeColor} />
        <KpiCard label={t('reports.ops.disputeRate')} value={fmtPct(d?.disputeRate)} sub={t('reports.ops.target2')} icon={AlertTriangle} accent={trafficLight(100 - (d?.disputeRate ?? 100), 98, 90)} />
        <KpiCard label={t('reports.ops.fleetAvailability')} value={fmtPct(d?.fleetAvailability)} icon={Truck} accent={BLUE} />
        <KpiCard label={t('reports.ops.avgDelivery')} value={`${(d?.avgDeliveryDays ?? 0).toFixed(1)} ${t('reports.ops.days')}`} icon={Clock} accent={TEAL} />
        <KpiCard label={t('reports.ops.kycApproval')} value={fmtPct(d?.kycApprovalRate)} icon={Shield} accent={GREEN} />
        <KpiCard label={t('reports.ops.openDisputes')} value={fmt(d?.openDisputes)} icon={AlertTriangle} accent={(d?.openDisputes ?? 0) > 5 ? RED : GOLD} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: t('reports.ops.onTime'), val: d?.onTimeDeliveryRate, good: 95, ok: 85 },
          { label: t('reports.ops.disputeRate'),    val: 100 - (d?.disputeRate ?? 0), good: 98, ok: 95 },
          { label: t('reports.ops.fleetAvailability'),     val: d?.fleetAvailability, good: 70, ok: 50 },
        ].map(({ label, val, good, ok }) => {
          const color = trafficLight(val ?? 0, good, ok);
          return (
            <div
              key={label}
              className="rounded-2xl p-5 flex flex-col items-center gap-3"
              style={{ background: CARD, border: `1px solid ${BORDER}` }}
            >
              <span style={{ color: MUTED, fontSize: 12 }}>{label}</span>
              <div
                className="h-16 w-16 rounded-full flex items-center justify-center"
                style={{ background: `${color}20`, border: `3px solid ${color}` }}
              >
                <span style={{ color, fontSize: 18, fontWeight: 700 }}>{fmtPct(val ?? 0)}</span>
              </div>
              <span style={{ color, fontSize: 11 }}>
                {color === GREEN ? t('reports.ops.excellent') : color === GOLD ? t('reports.ops.acceptable') : t('reports.ops.needsImprovement')}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GrowthTab({ period }: { period: Period }) {
  const t = useTranslations('payments');
  const { data, isLoading } = useSWR(`/admin/analytics/growth?period=${period}`, fetcher, { refreshInterval: 300_000 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = data as any;
  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {Array(6).fill(0).map((_, i) => <Skel key={i} h="h-32" />)}
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KpiCard label={t('reports.growth.ordersMoM')} value={fmtPct(d?.ordersMoM)} change={d?.ordersMoM} icon={Package} accent={(d?.ordersMoM ?? 0) >= 0 ? GREEN : RED} />
        <KpiCard label={t('reports.growth.gmvMoM')} value={fmtPct(d?.gmvMoM)} change={d?.gmvMoM} icon={Wallet} accent={(d?.gmvMoM ?? 0) >= 0 ? GREEN : RED} />
        <KpiCard label={t('reports.growth.newClients')} value={fmt(d?.newClients)} sub={t('reports.growth.vsPrevClients', { count: fmt(d?.prevClients) })} change={d?.clientsMoM} icon={Users} accent={GREEN} />
        <KpiCard label={t('reports.growth.newCarriers')} value={fmt(d?.newCarriers)} change={d?.carriersMoM} icon={Truck} accent={TEAL} />
        <KpiCard label={t('reports.growth.geoCoverage')} value={`${fmt(d?.geographicCoverage)} ${t('reports.growth.cities')}`} icon={Globe} accent={BLUE} />
        <KpiCard label={t('reports.growth.totalOrders')} value={fmt(d?.ordersNow)} sub={t('reports.growth.vsPrev', { count: fmt(d?.ordersPrev) })} icon={Package} accent={GOLD} />
      </div>
      <ChartCard title={t('reports.growth.compareTitle')}>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={[
            { name: t('reports.growth.orders'),        current: d?.ordersNow   ?? 0, prev: d?.ordersPrev   ?? 0 },
            { name: t('reports.growth.newClientsShort'),  current: d?.newClients  ?? 0, prev: d?.prevClients  ?? 0 },
            { name: t('reports.growth.newCarriersShort'), current: d?.newCarriers ?? 0, prev: d?.prevCarriers ?? 0 },
          ]}>
            <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
            <XAxis dataKey="name" tick={{ fill: MUTED, fontSize: 11 }} />
            <YAxis tick={{ fill: MUTED, fontSize: 11 }} />
            <Tooltip contentStyle={{ background: CARD, border: `1px solid ${BORDER}`, color: TEXT }} />
            <Legend wrapperStyle={{ color: MUTED }} />
            <Bar dataKey="current" name={t('reports.growth.current')}  fill={GREEN}  radius={[4, 4, 0, 0]} />
            <Bar dataKey="prev"    name={t('reports.growth.previous')} fill={BORDER} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function InvestorTab({ period, summary }: { period: Period; summary: Record<string, unknown> | undefined }) {
  const t = useTranslations('payments');
  const sar = t('reports.sar');
  const { data, isLoading } = useSWR(`/admin/analytics/investor?period=${period}`, fetcher, { refreshInterval: 300_000 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = data as any;

  const summaryText = useMemo(() => {
    if (!summary) return '—';
    const growth    = Number(summary.gmvMoM ?? 0);
    const cr        = Number(summary.completionRate ?? 0);
    const ot        = Number(summary.onTimeDeliveryRate ?? 0);
    const gmv       = Number(summary.gmv ?? 0);
    const clients   = Number(summary.newClients ?? 0);
    const carriers  = Number(summary.newCarriers ?? 0);
    return growth > 0
      ? t('reports.investor.summaryGrowth', { growth: growth.toFixed(1), completion: cr.toFixed(1), onTime: ot.toFixed(1), clients: fmt(clients), carriers: fmt(carriers) })
      : t('reports.investor.summaryStable', { gmv: fmtSAR(gmv, sar), completion: cr.toFixed(1), clients: fmt(clients) });
  }, [summary, t, sar]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {Array(6).fill(0).map((_, i) => <Skel key={i} h="h-32" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KpiCard label={t('reports.investor.ltv')} value={fmtSAR(d?.ltv, sar)} icon={Star} accent={GOLD} />
        <KpiCard label="Cohort Retention" value={fmtPct(d?.cohortRetention)} sub={t('reports.investor.cohortSub')} icon={RefreshCw} accent={GREEN} />
        <KpiCard label="Network Effect Score" value={(d?.networkEffectScore ?? 0).toFixed(2)} sub={t('reports.investor.networkSub')} icon={Activity} accent={BLUE} />
        <KpiCard label={t('reports.investor.marketPenetration')} value={fmtPct(d?.marketPenetration)} sub={t('reports.investor.marketPenSub')} icon={Globe} accent={TEAL} />
        <KpiCard label={t('reports.investor.activeClients')} value={fmt(d?.activeClientsCount)} icon={Users} accent={GREEN} />
        <KpiCard label="Unit Economics" value={(d?.ltv ?? 0) > 0 ? `LTV: ${fmtSAR(d?.ltv, sar)}` : '—'} sub={t('reports.investor.cacSub')} icon={TrendingUp} accent={GOLD} />
      </div>
      <div className="rounded-2xl p-6" style={{ background: `${TEAL}20`, border: `1px solid ${TEAL}40` }}>
        <SectionTitle>{t('reports.investor.autoSummary')}</SectionTitle>
        <p style={{ color: TEXT, lineHeight: 1.8, fontSize: 14 }}>{summaryText}</p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminReportsPage() {
  const t = useTranslations('payments');
  const [period, setPeriod]       = useState<Period>('30d');
  const [activeTab, setActiveTab] = useState('market');
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [exporting, setExporting] = useState(false);

  const { data: summary } = useSWR(
    `/admin/analytics/summary?period=${period}`,
    fetcher<Record<string, unknown>>,
    { refreshInterval: 300_000 },
  );

  useEffect(() => {
    const t = setInterval(() => setLastRefresh(new Date()), 300_000);
    return () => clearInterval(t);
  }, []);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try { await exportPDF(summary, period, t); }
    finally { setExporting(false); }
  }, [summary, period, t]);

  return (
    <div className="min-h-screen -m-4 lg:-m-6 p-4 lg:p-6" style={{ background: BG }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 style={{ color: TEXT, fontSize: 22, fontWeight: 700 }}>{t('reports.dashboardTitle')}</h1>
          <p style={{ color: MUTED, fontSize: 12, marginTop: 4 }}>
            {t('reports.lastUpdated', { time: lastRefresh.toLocaleTimeString('ar-SA-u-nu-latn') })}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Period selector */}
          <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className="px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  background: period === p.key ? GREEN : 'transparent',
                  color:      period === p.key ? '#000' : MUTED,
                }}
              >
                {t(`reports.periods.${p.key}`)}
              </button>
            ))}
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors"
            style={{ background: TEAL, color: '#fff' }}
          >
            <Download className="h-3.5 w-3.5" />
            {exporting ? t('reports.exporting') : t('exportPDF')}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 mb-6 flex-wrap"
        style={{ borderBottom: `1px solid ${BORDER}`, paddingBottom: 0 }}
      >
        {TABS.map((tab) => {
          const Icon     = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors"
              style={{ color: isActive ? GREEN : MUTED }}
            >
              <Icon className="h-4 w-4" />
              {t(`reports.tabs.${tab.key}`)}
              {isActive && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ background: GREEN }}
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.35 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${activeTab}-${period}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'market'    && <MarketTab period={period} />}
          {activeTab === 'financial' && <FinancialTab period={period} />}
          {activeTab === 'ops'       && <OpsTab period={period} />}
          {activeTab === 'growth'    && <GrowthTab period={period} />}
          {activeTab === 'investor'  && <InvestorTab period={period} summary={summary} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

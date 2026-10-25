'use client';
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import {
  Activity, ArrowRight, BarChart2, Building2, Check, Crown, FileCheck, FileText, FileX,
  Gauge, Mail, MapPin, MinusCircle, MoreVertical, Package, Phone, PlusCircle, Printer,
  ShieldCheck, Star, Trash2, TrendingUp, Truck, User as UserIcon, Users, Wallet, X,
  type LucideIcon,
} from 'lucide-react';
import {
  Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import useSWR, { useSWRConfig } from 'swr';
import { Button } from '@/components/ui/button';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/page-header';
import { StatsCard } from '@/components/stats-card';
import { StatusBadge } from '@/components/status-badge';
import { SaudiLicensePlate, parsePlateString } from '@/components/saudi-plate';
import { Currency } from '@/components/currency';
import { Skeleton } from '@/components/ui/skeleton';
import { notify } from '@/lib/notify';
import { api, fetcher } from '@/lib/api';
import {
  COMPANIES, ORDERS, formatDate, teamMembersFor, permissionsFor,
  normalizeCompany, normalizeOrderList, localizeCity, localizeRegion,
  type Company, type CompanyRole, type Order, type TeamMember,
} from '@naqla/shared-utils';

interface CompanyStats {
  type: 'CLIENT' | 'CARRIER';
  totalOrders: number;
  statusBreakdown: Record<string, number>;
  completedOrders: number;
  cancelledOrders: number;
  disputedOrders: number;
  completionRate: number;
  gmv: number;
  revenue: number;
  commission: number;
  avgOrderValue: number;
  activeBids: number;
  totalBids: number;
  wonBids: number;
  winRate: number;
  rating: number | null;
  reviewsCount: number;
  fleetSize: number;
  driversCount: number;
  teamSize: number;
  freelancerDue: number;
  freelancerPaid: number;
  freelancerCount: number;
  trend: { month: string; orders: number; revenue: number }[];
}

export default function AdminCompanyDetail() {
  const t = useTranslations('companies');
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const { data: companyData, isLoading } = useSWR<unknown>(
    params.id ? `/companies/${params.id}` : null, fetcher);
  const company =
    normalizeCompany<Company>(companyData as Company | null | undefined)
    ?? COMPANIES.find((c) => c.id === params.id);

  const { data: statsData } = useSWR<CompanyStats>(
    params.id ? `/companies/${params.id}/stats` : null, fetcher);
  const { data: ordersData } = useSWR<unknown>('/admin/orders', fetcher);

  const isCarrier = company?.kind === 'CARRIER';
  const apiOrders = normalizeOrderList(ordersData);
  const sourceOrders: Order[] = apiOrders.length > 0 ? apiOrders : ORDERS;
  const orders = company
    ? sourceOrders.filter((o) => (isCarrier ? o.carrierId === company.id : o.clientId === company.id))
    : [];

  if (!company && isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (!company) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="font-semibold">{t('detail.notFound')}</h3>
          <Button onClick={() => router.push('/companies')} className="mt-4">{t('detail.backToList')}</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow={t('detail.eyebrow')}
        title={
          <span className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border border-border/70">
              <AvatarFallback>{company.nameAr.split(' ').slice(0, 2).map((w) => w[0]).join('')}</AvatarFallback>
            </Avatar>
            {company.nameAr}
          </span>
        }
        subtitle={t('detail.subtitle', { role: isCarrier ? t('kind.carrier') : t('kind.client'), city: localizeCity(company.city) })}
        actions={
          <>
            <StatusBadge status={company.kycStatus} />
            <Button variant="outline" onClick={() => router.push('/companies')}>
              <ArrowRight className="h-4 w-4 rtl:rotate-180" /> {t('detail.back')}
            </Button>
          </>
        }
      />

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="overflow-x-auto">
          <TabsTrigger value="overview"><Gauge className="h-4 w-4 me-1.5" /> {t('detail.tabs.overview')}</TabsTrigger>
          <TabsTrigger value="orders"><Package className="h-4 w-4 me-1.5" /> {t('detail.tabs.orders')}</TabsTrigger>
          {isCarrier && <TabsTrigger value="trucks"><Truck className="h-4 w-4 me-1.5" /> {t('detail.tabs.trucks')}</TabsTrigger>}
          {isCarrier && <TabsTrigger value="drivers"><UserIcon className="h-4 w-4 me-1.5" /> {t('detail.tabs.drivers')}</TabsTrigger>}
          <TabsTrigger value="financial"><Wallet className="h-4 w-4 me-1.5" /> {t('detail.tabs.financial')}</TabsTrigger>
          <TabsTrigger value="statement"><FileText className="h-4 w-4 me-1.5" /> {t('detail.tabs.statement')}</TabsTrigger>
          <TabsTrigger value="profile"><Building2 className="h-4 w-4 me-1.5" /> {t('detail.tabs.profile')}</TabsTrigger>
          <TabsTrigger value="team"><Users className="h-4 w-4 me-1.5" /> {t('detail.tabs.team')}</TabsTrigger>
        </TabsList>

        {/* ─── Overview: KPIs + charts ─── */}
        <TabsContent value="overview">
          <OverviewTab stats={statsData} isCarrier={isCarrier} />
        </TabsContent>

        {/* ─── Orders ─── */}
        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t('detail.orders.title')}</CardTitle>
                <Badge variant="secondary">{orders.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {orders.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">{t('detail.orders.empty')}</p>
              ) : (
                orders.slice(0, 20).map((o) => (
                  <button
                    key={o.id}
                    onClick={() => router.push(`/orders/${o.id}`)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-md hover:bg-muted transition-colors text-start"
                  >
                    <span className="font-mono text-xs text-muted-foreground shrink-0">{o.orderNumber}</span>
                    <span className="flex-1 text-sm truncate">{localizeCity(o.originCity)} ← {localizeCity(o.destinationCity)}</span>
                    <StatusBadge status={o.status} />
                    <Currency amount={o.agreedPrice ?? o.clientBudget} />
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Trucks (carrier) ─── */}
        {isCarrier && (
          <TabsContent value="trucks">
            <TrucksTab companyId={company.id} />
          </TabsContent>
        )}

        {/* ─── Drivers (carrier) ─── */}
        {isCarrier && (
          <TabsContent value="drivers">
            <DriversTab companyId={company.id} />
          </TabsContent>
        )}

        {/* ─── Financial ─── */}
        <TabsContent value="financial">
          <FinancialTab stats={statsData} isCarrier={isCarrier} />
        </TabsContent>

        {/* ─── Account statement ─── */}
        <TabsContent value="statement">
          <StatementTab companyId={company.id} companyName={company.nameAr} />
        </TabsContent>

        {/* ─── Profile + KYC ─── */}
        <TabsContent value="profile">
          <ProfileTab company={company} isCarrier={isCarrier} />
        </TabsContent>

        {/* ─── Team ─── */}
        <TabsContent value="team">
          <AdminTeamSection companyId={company.id} companyKind={company.kind} />
        </TabsContent>
      </Tabs>
    </>
  );
}

// ─── Overview tab ────────────────────────────────────────────────────
function OverviewTab({ stats, isCarrier }: { stats?: CompanyStats; isCarrier: boolean }) {
  const t = useTranslations('companies');
  if (!stats) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
    );
  }
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatsCard label={t('detail.overview.totalOrders')} value={stats.totalOrders} hint={t('detail.overview.totalOrdersHint')} icon={Package} index={0} />
        <StatsCard label={t('detail.overview.completionRate')} value={pct(stats.completionRate)} hint={t('detail.overview.completionRateHint', { count: String(stats.completedOrders) })} icon={Activity} tone="success" index={1} />
        <StatsCard label={t('detail.overview.gmv')} value={<Currency amount={stats.gmv} />} hint={t('detail.overview.gmvHint')} icon={TrendingUp} index={2} />
        <StatsCard
          label={isCarrier ? t('detail.overview.revenueCarrier') : t('detail.overview.revenueClient')}
          value={<Currency amount={stats.revenue} />}
          hint={isCarrier ? t('detail.overview.revenueHintCarrier') : t('detail.overview.revenueHintClient')}
          icon={Wallet} tone="success" index={3}
        />
        {isCarrier ? (
          <>
            <StatsCard label={t('detail.overview.activeBids')} value={stats.activeBids} hint={t('detail.overview.activeBidsHint', { rate: pct(stats.winRate) })} icon={BarChart2} tone="warning" index={4} />
            <StatsCard label={t('detail.overview.fleetSize')} value={stats.fleetSize} hint={t('detail.overview.fleetSizeHint', { count: String(stats.driversCount) })} icon={Truck} index={5} />
            <StatsCard
              label={t('detail.overview.rating')}
              value={stats.rating != null ? stats.rating.toFixed(1) : '—'}
              hint={t('detail.overview.ratingHint', { count: String(stats.reviewsCount) })} icon={Star} tone="success" index={6}
            />
            <StatsCard label={t('detail.overview.disputes')} value={stats.disputedOrders} hint={t('detail.overview.disputesHint')} icon={ShieldCheck} tone={stats.disputedOrders > 0 ? 'danger' : 'default'} index={7} />
          </>
        ) : (
          <>
            <StatsCard label={t('detail.overview.avgOrderValue')} value={<Currency amount={stats.avgOrderValue} />} hint={t('detail.overview.avgOrderValueHint')} icon={BarChart2} index={4} />
            <StatsCard label={t('detail.overview.cancelledOrders')} value={stats.cancelledOrders} hint={t('detail.overview.cancelledOrdersHint')} icon={X} tone={stats.cancelledOrders > 0 ? 'warning' : 'default'} index={5} />
            <StatsCard label={t('detail.overview.disputes')} value={stats.disputedOrders} hint={t('detail.overview.disputesHint')} icon={ShieldCheck} tone={stats.disputedOrders > 0 ? 'danger' : 'default'} index={6} />
            <StatsCard label={t('detail.overview.teamSize')} value={stats.teamSize} hint={t('detail.overview.teamSizeHint')} icon={Users} index={7} />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{t('detail.overview.activityTitle')}</CardTitle>
            <CardDescription>{t('detail.overview.activityDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendChart trend={stats.trend} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('detail.overview.distributionTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <StatusDistribution breakdown={stats.statusBreakdown} total={stats.totalOrders} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TrendChart({ trend }: { trend: CompanyStats['trend'] }) {
  const t = useTranslations('companies');
  if (!trend.some((pt) => pt.orders > 0 || pt.revenue > 0)) {
    return <p className="text-sm text-muted-foreground py-12 text-center">{t('detail.overview.noActivity')}</p>;
  }
  return (
    <div style={{ width: '100%', height: 260 }} dir="ltr">
      <ResponsiveContainer>
        <ComposedChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
          <YAxis yAxisId="left" tick={{ fontSize: 11 }} allowDecimals={false} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
          <Tooltip
            formatter={(v) => Number(v ?? 0).toLocaleString('en-US')}
            labelStyle={{ direction: 'ltr' }}
          />
          <Bar yAxisId="left" name={t('detail.overview.chartOrders')} dataKey="orders" fill="hsl(var(--mint))" radius={[4, 4, 0, 0]} maxBarSize={32} />
          <Line yAxisId="right" name={t('detail.overview.chartRevenue')} type="monotone" dataKey="revenue" stroke="#0A3D3A" strokeWidth={2} dot={{ r: 3 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function StatusDistribution({ breakdown, total }: { breakdown: Record<string, number>; total: number }) {
  const t = useTranslations('companies');
  const entries = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0 || total === 0) {
    return <p className="text-sm text-muted-foreground py-12 text-center">{t('detail.overview.noOrders')}</p>;
  }
  return (
    <div className="space-y-3">
      {entries.map(([status, count]) => {
        const p = Math.round((count / total) * 100);
        return (
          <div key={status}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">{t.has(`detail.overview.status.${status}`) ? t(`detail.overview.status.${status}`) : status}</span>
              <span className="num font-medium">{count} · {p}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-[hsl(var(--mint))]" style={{ width: `${p}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Financial tab ───────────────────────────────────────────────────
function FinancialTab({ stats, isCarrier }: { stats?: CompanyStats; isCarrier: boolean }) {
  const t = useTranslations('companies');
  if (!stats) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
    );
  }
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatsCard label={t('detail.financial.gmv')} value={<Currency amount={stats.gmv} />} icon={TrendingUp} index={0} />
        <StatsCard
          label={isCarrier ? t('detail.financial.revenueCarrier') : t('detail.financial.revenueClient')}
          value={<Currency amount={stats.revenue} />} icon={Wallet} tone="success" index={1}
        />
        <StatsCard label={t('detail.financial.commission')} value={<Currency amount={stats.commission} />} hint={t('detail.financial.commissionHint')} icon={BarChart2} index={2} />
        <StatsCard label={t('detail.financial.avgOrderValue')} value={<Currency amount={stats.avgOrderValue} />} icon={Package} index={3} />
        {isCarrier && (
          <>
            <StatsCard label={t('detail.financial.winRate')} value={pct(stats.winRate)} hint={t('detail.financial.winRateHint', { won: String(stats.wonBids), total: String(stats.totalBids) })} icon={Activity} index={4} />
            <StatsCard label={t('detail.financial.activeBids')} value={stats.activeBids} icon={BarChart2} tone="warning" index={5} />
          </>
        )}
      </div>

      {isCarrier && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('detail.financial.freelanceTitle')}</CardTitle>
            <CardDescription>{t('detail.financial.freelanceDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FinRow label={t('detail.financial.due')} value={stats.freelancerDue} tone="warning" />
              <FinRow label={t('detail.financial.paid')} value={stats.freelancerPaid} tone="success" />
              <FinRow label={t('detail.financial.invoiceCount')} value={stats.freelancerCount} count />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function FinRow({ label, value, tone, count }: { label: string; value: number; tone?: 'success' | 'warning'; count?: boolean }) {
  const color = tone === 'success' ? 'text-success' : tone === 'warning' ? 'text-warning' : 'text-foreground';
  return (
    <div className="rounded-xl border p-4">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className={`text-lg font-bold ${color}`}>
        {count ? <span className="num">{value.toLocaleString('en-US')}</span> : <Currency amount={value} />}
      </div>
    </div>
  );
}

// ─── Profile + KYC tab ───────────────────────────────────────────────
function ProfileTab({ company, isCarrier }: { company: Company; isCarrier: boolean }) {
  const t = useTranslations('companies');
  const { data: kycDocs } = useSWR<{ id: string; type: string; status: string; fileUrl: string; createdAt: string }[]>(
    `/companies/${company.id}/kyc`, fetcher);
  const docs = Array.isArray(kycDocs) ? kycDocs : [];
  const kycStatusText = company.kycStatus === 'APPROVED'
    ? t('detail.profile.kycApproved')
    : company.kycStatus === 'REJECTED'
      ? t('detail.profile.kycRejected')
      : t('detail.profile.kycPending');
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader><CardTitle>{t('detail.profile.basicInfo')}</CardTitle></CardHeader>
        <CardContent>
          <dl className="divide-y">
            <Row label={t('detail.profile.nameAr')} value={company.nameAr} />
            <Row label="Name (EN)" value={<span className="num">{company.nameEn || '—'}</span>} />
            <Row label={t('detail.profile.crNumber')} value={<span className="num">{company.crNumber || '—'}</span>} />
            <Row label={t('detail.profile.vatNumber')} value={<span className="num">{company.vatNumber || '—'}</span>} />
            <Row label={t('detail.profile.city')} icon={MapPin} value={t('detail.profile.cityValue', { city: localizeCity(company.city), region: localizeRegion(company.region) })} />
            <Row label={t('detail.profile.email')} icon={Mail} value={<span className="num">{company.contactEmail}</span>} />
            <Row label={t('detail.profile.phone')} icon={Phone} value={<span className="num" dir="ltr">{company.contactPhone}</span>} />
            <Row label={t('detail.profile.registeredAt')} value={formatDate(company.joinedAt, 'd MMMM yyyy')} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('detail.profile.kycTitle')}</CardTitle>
          <CardDescription className="mt-1">{t('detail.profile.kycStatusLabel', { status: kycStatusText })}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {docs.length === 0 ? (
            <KycDocRow label={t('detail.profile.noDocsUploaded')} state="missing" />
          ) : (
            docs.map((d) => (
              <KycDocRow
                key={d.id}
                label={t.has(`detail.profile.kycTypes.${d.type}`) ? t(`detail.profile.kycTypes.${d.type}`) : d.type}
                file={d.fileUrl}
                state={d.status === 'APPROVED' ? 'approved' : d.status === 'REJECTED' ? 'rejected' : 'pending'}
              />
            ))
          )}
          {isCarrier && docs.length > 0 && (
            <p className="text-[11px] text-muted-foreground pt-1">{t('detail.profile.carrierDocsNote')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({
  label, value, icon: Icon,
}: { label: string; value: React.ReactNode; icon?: LucideIcon }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <dt className="flex items-center gap-2 text-sm text-muted-foreground min-w-0">
        {Icon && <Icon className="h-4 w-4 shrink-0" />}
        <span className="truncate">{label}</span>
      </dt>
      <dd className="text-sm font-medium text-foreground text-end shrink-0 max-w-[60%]">{value ?? '—'}</dd>
    </div>
  );
}

function KycDocRow({
  label, file, state,
}: { label: string; file?: string; state: 'pending' | 'approved' | 'rejected' | 'missing' }) {
  const t = useTranslations('companies');
  const META = {
    pending:  { bg: 'bg-warning/15 text-warning',         label: t('detail.profile.statePending'),  icon: FileText },
    approved: { bg: 'bg-success/15 text-success',         label: t('detail.profile.stateApproved'), icon: FileCheck },
    rejected: { bg: 'bg-destructive/15 text-destructive', label: t('detail.profile.stateRejected'), icon: FileX },
    missing:  { bg: 'bg-muted text-muted-foreground',     label: t('detail.profile.stateMissing'),  icon: FileText },
  } as const;
  const m = META[state];
  const Icon = m.icon;
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border">
      <div className="h-10 w-10 rounded-md bg-muted text-muted-foreground grid place-items-center shrink-0">
        <FileText className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{label}</span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${m.bg}`}>
            <Icon className="h-3 w-3" />
            {m.label}
          </span>
        </div>
      </div>
      {state !== 'missing' && file && (
        <Button variant="ghost" size="sm" asChild>
          <a href={file} target="_blank" rel="noopener noreferrer">{t('detail.profile.view')}</a>
        </Button>
      )}
    </div>
  );
}

// ─── Trucks tab ──────────────────────────────────────────────────────
interface ApiTruck {
  id: string; plateNumber: string; type: string; capacity: number; status: string;
  ownership: string; currentDriver?: { user: { firstName: string; lastName: string } } | null;
}

function TrucksTab({ companyId }: { companyId: string }) {
  const t = useTranslations('companies');
  const { data } = useSWR<ApiTruck[]>(`/admin/companies/${companyId}/trucks`, fetcher);
  if (!data) return <TabSkeleton />;
  if (data.length === 0) return <EmptyCard icon={Truck} text={t('detail.trucks.empty')} />;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{t('detail.trucks.title')}</CardTitle>
          <Badge variant="secondary">{data.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Mobile: app-like card list */}
        <div className="md:hidden divide-y">
          {data.map((tk) => {
            const plate = parsePlateString(tk.plateNumber);
            const driver = tk.currentDriver ? `${tk.currentDriver.user.firstName} ${tk.currentDriver.user.lastName}`.trim() : '—';
            return (
              <div key={tk.id} className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="w-[96px]">
                    <SaudiLicensePlate letters={plate.letters} numbers={plate.numbers} plateType="transport" size="fill" />
                  </div>
                  <StatusBadge status={tk.status} />
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{t.has(`detail.trucks.types.${tk.type}`) ? t(`detail.trucks.types.${tk.type}`) : tk.type}</span>
                  <Badge variant={tk.ownership === 'OWNED' ? 'secondary' : 'outline'}>{tk.ownership === 'OWNED' ? t('detail.trucks.owned') : t('detail.trucks.independent')}</Badge>
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="num">{t('detail.trucks.capacityValue', { value: tk.capacity.toLocaleString('en-US') })}</span>
                  <span className="truncate max-w-[160px]">{driver}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop: table */}
        <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('detail.trucks.plate')}</TableHead>
              <TableHead>{t('detail.trucks.type')}</TableHead>
              <TableHead>{t('detail.trucks.capacity')}</TableHead>
              <TableHead>{t('detail.trucks.ownership')}</TableHead>
              <TableHead>{t('detail.trucks.currentDriver')}</TableHead>
              <TableHead>{t('detail.trucks.status')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((tk) => {
              const plate = parsePlateString(tk.plateNumber);
              const driver = tk.currentDriver ? `${tk.currentDriver.user.firstName} ${tk.currentDriver.user.lastName}`.trim() : '—';
              return (
                <TableRow key={tk.id}>
                  <TableCell><div className="w-[96px]"><SaudiLicensePlate letters={plate.letters} numbers={plate.numbers} plateType="transport" size="fill" /></div></TableCell>
                  <TableCell className="text-sm">{t.has(`detail.trucks.types.${tk.type}`) ? t(`detail.trucks.types.${tk.type}`) : tk.type}</TableCell>
                  <TableCell className="num text-sm">{t('detail.trucks.capacityValue', { value: tk.capacity.toLocaleString('en-US') })}</TableCell>
                  <TableCell><Badge variant={tk.ownership === 'OWNED' ? 'secondary' : 'outline'}>{tk.ownership === 'OWNED' ? t('detail.trucks.owned') : t('detail.trucks.independent')}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{driver}</TableCell>
                  <TableCell><StatusBadge status={tk.status} /></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Drivers tab ─────────────────────────────────────────────────────
interface ApiDriver {
  id: string; status: string; ownership: string; licenseNumber: string; licenseExpiry: string;
  licenseType: string; rating: number; totalTrips: number;
  user: { firstName: string; lastName: string; phone: string; nationalId?: string | null };
}

function DriversTab({ companyId }: { companyId: string }) {
  const t = useTranslations('companies');
  const { data } = useSWR<ApiDriver[]>(`/admin/companies/${companyId}/drivers`, fetcher);
  if (!data) return <TabSkeleton />;
  if (data.length === 0) return <EmptyCard icon={UserIcon} text={t('detail.drivers.empty')} />;
  const now = Date.now();
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{t('detail.drivers.title')}</CardTitle>
          <Badge variant="secondary">{data.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Mobile: app-like card list */}
        <div className="md:hidden divide-y">
          {data.map((d) => {
            const exp = new Date(d.licenseExpiry).getTime();
            const days = Math.round((exp - now) / 86400000);
            const expState = days < 0 ? 'expired' : days < 60 ? 'soon' : 'ok';
            return (
              <div key={d.id} className="p-4">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8"><AvatarFallback>{`${d.user.firstName?.[0] ?? ''}${d.user.lastName?.[0] ?? ''}`}</AvatarFallback></Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">{d.user.firstName} {d.user.lastName}</span>
                      <StatusBadge status={d.status} />
                    </div>
                    <span className="num text-xs text-muted-foreground" dir="ltr">{d.user.phone}</span>
                  </div>
                </div>
                <div className="mt-2 flex flex-col gap-0.5">
                  <span className="num text-xs" dir="ltr">{d.licenseNumber} · {d.licenseType}</span>
                  <span className={`text-[11px] ${expState === 'expired' ? 'text-destructive font-medium' : expState === 'soon' ? 'text-warning' : 'text-muted-foreground'}`}>
                    {expState === 'expired' ? t('detail.drivers.expired') : expState === 'soon' ? t('detail.drivers.expiresIn', { days: days.toLocaleString('en-US') }) : t('detail.drivers.validUntil', { date: formatDate(d.licenseExpiry, 'MMM yyyy') })}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <Badge variant={d.ownership === 'OWNED' ? 'secondary' : 'outline'}>{d.ownership === 'OWNED' ? t('detail.drivers.employed') : t('detail.drivers.freelance')}</Badge>
                  <span className="num text-xs text-muted-foreground">
                    {t('detail.drivers.trips')}: {d.totalTrips} · {t('detail.drivers.rating')}: {d.rating > 0 ? d.rating.toFixed(1) : '—'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop: table */}
        <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('detail.drivers.driver')}</TableHead>
              <TableHead>{t('detail.drivers.phone')}</TableHead>
              <TableHead>{t('detail.drivers.license')}</TableHead>
              <TableHead>{t('detail.drivers.ownership')}</TableHead>
              <TableHead className="text-center">{t('detail.drivers.trips')}</TableHead>
              <TableHead className="text-center">{t('detail.drivers.rating')}</TableHead>
              <TableHead>{t('detail.drivers.status')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((d) => {
              const exp = new Date(d.licenseExpiry).getTime();
              const days = Math.round((exp - now) / 86400000);
              const expState = days < 0 ? 'expired' : days < 60 ? 'soon' : 'ok';
              return (
                <TableRow key={d.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8"><AvatarFallback>{`${d.user.firstName?.[0] ?? ''}${d.user.lastName?.[0] ?? ''}`}</AvatarFallback></Avatar>
                      <span className="text-sm font-medium">{d.user.firstName} {d.user.lastName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="num text-sm" dir="ltr">{d.user.phone}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="num text-xs" dir="ltr">{d.licenseNumber} · {d.licenseType}</span>
                      <span className={`text-[11px] ${expState === 'expired' ? 'text-destructive font-medium' : expState === 'soon' ? 'text-warning' : 'text-muted-foreground'}`}>
                        {expState === 'expired' ? t('detail.drivers.expired') : expState === 'soon' ? t('detail.drivers.expiresIn', { days: days.toLocaleString('en-US') }) : t('detail.drivers.validUntil', { date: formatDate(d.licenseExpiry, 'MMM yyyy') })}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant={d.ownership === 'OWNED' ? 'secondary' : 'outline'}>{d.ownership === 'OWNED' ? t('detail.drivers.employed') : t('detail.drivers.freelance')}</Badge></TableCell>
                  <TableCell className="text-center num">{d.totalTrips}</TableCell>
                  <TableCell className="text-center num">{d.rating > 0 ? d.rating.toFixed(1) : '—'}</TableCell>
                  <TableCell><StatusBadge status={d.status} /></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Account statement tab ───────────────────────────────────────────
interface StatementLine {
  id: string; type: string; amount: number; balance: number; reference?: string | null;
  description: string; createdAt: string;
}
interface Statement {
  companyName: string; walletBalance: number; totalCredits: number; totalDebits: number; lines: StatementLine[];
}

function StatementTab({ companyId, companyName }: { companyId: string; companyName: string }) {
  const t = useTranslations('companies');
  const { data, mutate } = useSWR<Statement>(`/admin/companies/${companyId}/statement`, fetcher);
  const { mutate: globalMutate } = useSWRConfig();
  const [open, setOpen] = useState(false);

  const onIssued = () => {
    mutate();
    globalMutate(`/companies/${companyId}/stats`); // refresh the Financial tab too
  };

  const txLabel = (type: string) => (t.has(`detail.statement.txTypes.${type}`) ? t(`detail.statement.txTypes.${type}`) : type);

  if (!data) return <TabSkeleton />;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatsCard label={t('detail.statement.balance')} value={<Currency amount={data.walletBalance} />} hint={t('detail.statement.balanceHint')} icon={Wallet} tone={data.walletBalance >= 0 ? 'success' : 'danger'} index={0} />
        <StatsCard label={t('detail.statement.totalCredits')} value={<Currency amount={data.totalCredits} />} hint={t('detail.statement.totalCreditsHint')} icon={PlusCircle} tone="success" index={1} />
        <StatsCard label={t('detail.statement.totalDebits')} value={<Currency amount={data.totalDebits} />} hint={t('detail.statement.totalDebitsHint')} icon={MinusCircle} tone="warning" index={2} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-base">{t('detail.statement.title')}</CardTitle>
              <CardDescription className="mt-1">{t('detail.statement.desc')}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => printStatement(companyName, data, {
                statementTitle: t('detail.statement.printDoc.statementTitle'),
                brand: t('detail.statement.printDoc.brand'),
                balance: t('detail.statement.printDoc.balance'),
                totalCredits: t('detail.statement.printDoc.totalCredits'),
                totalDebits: t('detail.statement.printDoc.totalDebits'),
                sar: t('detail.statement.printDoc.sar'),
                hDate: t('detail.statement.printDoc.hDate'),
                hType: t('detail.statement.printDoc.hType'),
                hReference: t('detail.statement.printDoc.hReference'),
                hDescription: t('detail.statement.printDoc.hDescription'),
                hAmount: t('detail.statement.printDoc.hAmount'),
                hBalance: t('detail.statement.printDoc.hBalance'),
                noTransactions: t('detail.statement.printDoc.noTransactions'),
                popupBlocked: t('detail.statement.printDoc.popupBlocked'),
                txLabel,
              })} disabled={data.lines.length === 0}>
                <Printer className="h-4 w-4" /> {t('detail.statement.printBtn')}
              </Button>
              <Button size="sm" onClick={() => setOpen(true)}>
                <FileText className="h-4 w-4" /> {t('detail.statement.issueNote')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {data.lines.length === 0 ? (
            <p className="text-sm text-muted-foreground py-10 text-center">{t('detail.statement.noTransactions')}</p>
          ) : (
            <>
            {/* Mobile: app-like card list */}
            <div className="md:hidden divide-y">
              {data.lines.map((l) => (
                <div key={l.id} className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{txLabel(l.type)}</span>
                    <span className={`num font-medium ${l.amount >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {l.amount >= 0 ? '+' : '−'}<Currency amount={Math.abs(l.amount)} />
                    </span>
                  </div>
                  <div className="mt-1.5 text-sm">{l.description}</div>
                  <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="num">{formatDate(l.createdAt, 'd MMM yyyy')}{l.reference ? <span className="font-mono"> · {l.reference}</span> : null}</span>
                    <span className="num">{t('detail.statement.balanceCol')}: <Currency amount={l.balance} /></span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('detail.statement.date')}</TableHead>
                  <TableHead>{t('detail.statement.type')}</TableHead>
                  <TableHead>{t('detail.statement.reference')}</TableHead>
                  <TableHead>{t('detail.statement.description')}</TableHead>
                  <TableHead className="text-end">{t('detail.statement.amount')}</TableHead>
                  <TableHead className="text-end">{t('detail.statement.balanceCol')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.lines.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-xs text-muted-foreground num whitespace-nowrap">{formatDate(l.createdAt, 'd MMM yyyy')}</TableCell>
                    <TableCell className="text-sm">{txLabel(l.type)}</TableCell>
                    <TableCell className="num text-xs font-mono text-muted-foreground" dir="ltr">{l.reference ?? '—'}</TableCell>
                    <TableCell className="text-sm max-w-[280px] truncate">{l.description}</TableCell>
                    <TableCell className={`text-end num font-medium ${l.amount >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {l.amount >= 0 ? '+' : '−'}<Currency amount={Math.abs(l.amount)} />
                    </TableCell>
                    <TableCell className="text-end num"><Currency amount={l.balance} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
            </>
          )}
        </CardContent>
      </Card>

      <IssueNoteDialog companyId={companyId} open={open} onOpenChange={setOpen} onIssued={onIssued} />
    </div>
  );
}

function IssueNoteDialog({ companyId, open, onOpenChange, onIssued }: {
  companyId: string; open: boolean; onOpenChange: (v: boolean) => void; onIssued: () => void;
}) {
  const t = useTranslations('companies');
  const [type, setType] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const amt = Number(amount);
    if (!(amt > 0) || !reason.trim() || saving) return;
    setSaving(true);
    try {
      const r = await api.post(`/admin/companies/${companyId}/notes`, { type, amount: amt, reason: reason.trim() });
      const ref = r.data?.data?.reference ?? r.data?.reference;
      notify.success(t('detail.note.successTitle'), ref ? t('detail.note.successRef', { ref }) : undefined);
      setAmount(''); setReason(''); setType('CREDIT');
      onOpenChange(false);
      onIssued();
    } catch (err) {
      notify.error(err, t('detail.note.errorMsg'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('detail.note.title')}</DialogTitle>
          <DialogDescription>{t('detail.note.desc')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant={type === 'CREDIT' ? 'default' : 'outline'} onClick={() => setType('CREDIT')}>
              <PlusCircle className="h-4 w-4" /> {t('detail.note.credit')}
            </Button>
            <Button type="button" variant={type === 'DEBIT' ? 'default' : 'outline'} onClick={() => setType('DEBIT')}>
              <MinusCircle className="h-4 w-4" /> {t('detail.note.debit')}
            </Button>
          </div>
          <div className="space-y-1.5">
            <Label>{t('detail.note.amountLabel')}</Label>
            <Input type="number" min="0" step="0.01" dir="ltr" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-1.5">
            <Label>{t('detail.note.reasonLabel')}</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t('detail.note.reasonPlaceholder')} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('detail.note.cancel')}</Button>
          <Button onClick={submit} disabled={saving || !(Number(amount) > 0) || !reason.trim()}>
            {saving ? t('detail.note.saving') : t('detail.note.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface PrintLabels {
  statementTitle: string; brand: string; balance: string; totalCredits: string; totalDebits: string;
  sar: string; hDate: string; hType: string; hReference: string; hDescription: string; hAmount: string;
  hBalance: string; noTransactions: string; popupBlocked: string; txLabel: (type: string) => string;
}

/** Open a clean, print-ready statement in a new window (saves as PDF via print). */
function printStatement(companyName: string, data: Statement, L: PrintLabels) {
  const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string));
  const sar = (n: number) => `${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${L.sar}`;
  const rows = data.lines.map((l) => `
    <tr>
      <td>${new Date(l.createdAt).toLocaleDateString('en-GB')}</td>
      <td>${esc(L.txLabel(l.type))}</td>
      <td class="mono">${esc(l.reference ?? '—')}</td>
      <td>${esc(l.description)}</td>
      <td class="num ${l.amount >= 0 ? 'cr' : 'dr'}">${l.amount >= 0 ? '+' : '−'}${sar(Math.abs(l.amount))}</td>
      <td class="num">${sar(l.balance)}</td>
    </tr>`).join('');
  const html = `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
    <title>${esc(L.statementTitle)} — ${esc(companyName)}</title>
    <style>
      body{font-family:-apple-system,Segoe UI,Tahoma,Arial,sans-serif;color:#0A3D3A;margin:32px}
      h1{font-size:20px;margin:0 0 4px}.sub{color:#6B7280;font-size:13px;margin-bottom:20px}
      .cards{display:flex;gap:12px;margin-bottom:20px}
      .card{flex:1;border:1px solid #e5e7eb;border-radius:10px;padding:12px}
      .card .l{font-size:12px;color:#6B7280}.card .v{font-size:18px;font-weight:700;margin-top:4px}
      table{width:100%;border-collapse:collapse;font-size:13px}
      th,td{padding:8px 10px;border-bottom:1px solid #eee;text-align:start}
      th{background:#f8fafc;font-size:12px;color:#6B7280}
      .num{text-align:end;font-variant-numeric:tabular-nums}.mono{font-family:ui-monospace,monospace;font-size:11px;color:#6B7280;direction:ltr}
      .cr{color:#059669}.dr{color:#dc2626}
      @media print{body{margin:12mm}}
    </style></head><body>
    <h1>${esc(L.statementTitle)} — ${esc(companyName)}</h1>
    <div class="sub">${esc(L.brand)} · ${new Date().toLocaleDateString('en-GB')}</div>
    <div class="cards">
      <div class="card"><div class="l">${esc(L.balance)}</div><div class="v">${sar(data.walletBalance)}</div></div>
      <div class="card"><div class="l">${esc(L.totalCredits)}</div><div class="v cr">${sar(data.totalCredits)}</div></div>
      <div class="card"><div class="l">${esc(L.totalDebits)}</div><div class="v dr">${sar(data.totalDebits)}</div></div>
    </div>
    <table><thead><tr><th>${esc(L.hDate)}</th><th>${esc(L.hType)}</th><th>${esc(L.hReference)}</th><th>${esc(L.hDescription)}</th><th class="num">${esc(L.hAmount)}</th><th class="num">${esc(L.hBalance)}</th></tr></thead>
    <tbody>${rows || `<tr><td colspan="6">${esc(L.noTransactions)}</td></tr>`}</tbody></table>
    </body></html>`;
  const w = window.open('', '_blank');
  if (!w) { notify.error(null, L.popupBlocked); return; }
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
}

// ─── shared small bits ───────────────────────────────────────────────
function TabSkeleton() {
  return (
    <Card><CardContent className="p-4 space-y-2">
      {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
    </CardContent></Card>
  );
}
function EmptyCard({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <Card><CardContent className="py-16 text-center text-muted-foreground">
      <Icon className="h-10 w-10 mx-auto mb-3 opacity-40" />
      <p className="text-sm">{text}</p>
    </CardContent></Card>
  );
}

// ─── Admin Team section ──────────────────────────────────────────────
function AdminTeamSection({ companyId, companyKind }: { companyId: string; companyKind: 'CLIENT' | 'CARRIER' }) {
  const t = useTranslations('companies');
  const [members, setMembers] = useState<TeamMember[]>(() => teamMembersFor(companyId));

  if (members.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> {t('detail.team.title')}</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">{t('detail.team.empty')}</CardContent>
      </Card>
    );
  }

  const roleLabels: Record<CompanyRole, { icon: LucideIcon; label: string }> = {
    OWNER:    { icon: Crown,       label: t('detail.team.roles.OWNER') },
    ADMIN:    { icon: ShieldCheck, label: t('detail.team.roles.ADMIN') },
    STAFF:    { icon: Package,     label: t('detail.team.roles.STAFF') },
    DISPATCH: { icon: Truck,       label: t('detail.team.roles.DISPATCH') },
    FINANCE:  { icon: Wallet,      label: t('detail.team.roles.FINANCE') },
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> {t('detail.team.title')}</CardTitle>
          <Badge variant="secondary">{t('detail.team.memberCount', { count: members.length.toLocaleString('en-US') })}</Badge>
        </div>
        <CardDescription className="mt-1">
          {t('detail.team.desc')}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {members.map((m, i) => {
          const initials = m.fullName.split(' ').slice(0, 2).map((w) => w[0]).join('');
          const perms = permissionsFor(companyKind, m.role);
          return (
            <div key={m.id} className={`p-4 ${i < members.length - 1 ? 'border-b' : ''}`}>
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold truncate">{m.fullName}</span>
                    {m.isOwner && <Crown className="h-4 w-4 text-warning shrink-0" />}
                    {m.status === 'SUSPENDED' && <Badge variant="destructive" className="text-[10px]">{t('detail.team.suspended')}</Badge>}
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <span className="num" dir="ltr">{m.phone}</span>
                    {m.email && <span dir="ltr">· {m.email}</span>}
                    <span>· {t('detail.team.joinedPrefix', { date: formatDate(m.addedAt) })}</span>
                  </div>
                </div>
                <Badge variant="outline" className="shrink-0 gap-1">
                  {(() => { const Icon = roleLabels[m.role].icon; return <Icon className="h-3 w-3" />; })()}
                  {roleLabels[m.role].label}
                </Badge>
                {!m.isOwner && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {m.status === 'ACTIVE' ? (
                        <DropdownMenuItem onClick={() => setMembers((s) => s.map((x) => x.id === m.id ? { ...x, status: 'SUSPENDED' } : x))}>
                          <X className="h-3.5 w-3.5" /> {t('detail.team.suspend')}
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => setMembers((s) => s.map((x) => x.id === m.id ? { ...x, status: 'ACTIVE' } : x))}>
                          <Check className="h-3.5 w-3.5" /> {t('detail.team.activate')}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => { if (confirm(t('detail.team.removeConfirm'))) setMembers((s) => s.filter((x) => x.id !== m.id)); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> {t('detail.team.removeFromTeam')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-1 text-xs">
                {perms.can.slice(0, 4).map((p, k) => (
                  <div key={`y-${k}`} className="flex items-start gap-1.5 text-muted-foreground">
                    <Check className="h-3 w-3 text-success shrink-0 mt-0.5" /> {p}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

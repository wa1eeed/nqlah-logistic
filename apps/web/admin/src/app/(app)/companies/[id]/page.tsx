'use client';
import { useMemo, useState } from 'react';
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
  normalizeCompany, normalizeOrderList,
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

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'مسودة', PUBLISHED: 'منشور', BIDDING: 'قيد العروض', ASSIGNED: 'مُسند',
  CONFIRMED: 'مؤكد', IN_TRANSIT: 'في الطريق', DELIVERED: 'تم التسليم',
  COMPLETED: 'مكتمل', CANCELLED: 'ملغى', DISPUTED: 'نزاع',
};

export default function AdminCompanyDetail() {
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
          <h3 className="font-semibold">الشركة غير موجودة</h3>
          <Button onClick={() => router.push('/companies')} className="mt-4">عودة</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="ملف الكيان · 360°"
        title={
          <span className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border border-border/70">
              <AvatarFallback>{company.nameAr.split(' ').slice(0, 2).map((w) => w[0]).join('')}</AvatarFallback>
            </Avatar>
            {company.nameAr}
          </span>
        }
        subtitle={`${isCarrier ? 'ناقل' : 'عميل'} · ${company.city}`}
        actions={
          <>
            <StatusBadge status={company.kycStatus} />
            <Button variant="outline" onClick={() => router.push('/companies')}>
              <ArrowRight className="h-4 w-4 rtl:rotate-180" /> رجوع
            </Button>
          </>
        }
      />

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="overflow-x-auto">
          <TabsTrigger value="overview"><Gauge className="h-4 w-4 me-1.5" /> نظرة عامة</TabsTrigger>
          <TabsTrigger value="orders"><Package className="h-4 w-4 me-1.5" /> الطلبات</TabsTrigger>
          {isCarrier && <TabsTrigger value="trucks"><Truck className="h-4 w-4 me-1.5" /> الشاحنات</TabsTrigger>}
          {isCarrier && <TabsTrigger value="drivers"><UserIcon className="h-4 w-4 me-1.5" /> السائقون</TabsTrigger>}
          <TabsTrigger value="financial"><Wallet className="h-4 w-4 me-1.5" /> المالية</TabsTrigger>
          <TabsTrigger value="statement"><FileText className="h-4 w-4 me-1.5" /> كشف الحساب</TabsTrigger>
          <TabsTrigger value="profile"><Building2 className="h-4 w-4 me-1.5" /> الملف والتحقق</TabsTrigger>
          <TabsTrigger value="team"><Users className="h-4 w-4 me-1.5" /> الفريق</TabsTrigger>
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
                <CardTitle>طلبات هذه الشركة</CardTitle>
                <Badge variant="secondary">{orders.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {orders.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">لا توجد طلبات</p>
              ) : (
                orders.slice(0, 20).map((o) => (
                  <button
                    key={o.id}
                    onClick={() => router.push(`/orders/${o.id}`)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-md hover:bg-muted transition-colors text-start"
                  >
                    <span className="font-mono text-xs text-muted-foreground shrink-0">{o.orderNumber}</span>
                    <span className="flex-1 text-sm truncate">{o.originCity} ← {o.destinationCity}</span>
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
        <StatsCard label="إجمالي الطلبات" value={stats.totalOrders} hint="المسجّلة" icon={Package} index={0} />
        <StatsCard label="نسبة الإكمال" value={pct(stats.completionRate)} hint={`${stats.completedOrders} مكتملة`} icon={Activity} tone="success" index={1} />
        <StatsCard label="إجمالي المعاملات (GMV)" value={<Currency amount={stats.gmv} />} hint="للطلبات المنجزة" icon={TrendingUp} index={2} />
        <StatsCard
          label={isCarrier ? 'صافي إيراد الناقل' : 'إجمالي الإنفاق'}
          value={<Currency amount={stats.revenue} />}
          hint={isCarrier ? 'بعد العمولة' : 'على الطلبات المنجزة'}
          icon={Wallet} tone="success" index={3}
        />
        {isCarrier ? (
          <>
            <StatsCard label="عروض نشطة" value={stats.activeBids} hint={`فوز ${pct(stats.winRate)}`} icon={BarChart2} tone="warning" index={4} />
            <StatsCard label="حجم الأسطول" value={stats.fleetSize} hint={`${stats.driversCount} سائق`} icon={Truck} index={5} />
            <StatsCard
              label="التقييم"
              value={stats.rating != null ? stats.rating.toFixed(1) : '—'}
              hint={`${stats.reviewsCount} تقييم`} icon={Star} tone="success" index={6}
            />
            <StatsCard label="نزاعات" value={stats.disputedOrders} hint="تحتاج متابعة" icon={ShieldCheck} tone={stats.disputedOrders > 0 ? 'danger' : 'default'} index={7} />
          </>
        ) : (
          <>
            <StatsCard label="متوسط قيمة الطلب" value={<Currency amount={stats.avgOrderValue} />} hint="للمنجزة" icon={BarChart2} index={4} />
            <StatsCard label="طلبات ملغاة" value={stats.cancelledOrders} hint="من الإجمالي" icon={X} tone={stats.cancelledOrders > 0 ? 'warning' : 'default'} index={5} />
            <StatsCard label="نزاعات" value={stats.disputedOrders} hint="تحتاج متابعة" icon={ShieldCheck} tone={stats.disputedOrders > 0 ? 'danger' : 'default'} index={6} />
            <StatsCard label="أعضاء الفريق" value={stats.teamSize} hint="مستخدمون" icon={Users} index={7} />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">النشاط خلال 6 أشهر</CardTitle>
            <CardDescription>عدد الطلبات والمعاملات الشهرية</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendChart trend={stats.trend} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">توزّع الطلبات حسب الحالة</CardTitle>
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
  if (!trend.some((t) => t.orders > 0 || t.revenue > 0)) {
    return <p className="text-sm text-muted-foreground py-12 text-center">لا يوجد نشاط في آخر 6 أشهر</p>;
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
          <Bar yAxisId="left" name="الطلبات" dataKey="orders" fill="hsl(var(--mint))" radius={[4, 4, 0, 0]} maxBarSize={32} />
          <Line yAxisId="right" name="المعاملات" type="monotone" dataKey="revenue" stroke="#0A3D3A" strokeWidth={2} dot={{ r: 3 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function StatusDistribution({ breakdown, total }: { breakdown: Record<string, number>; total: number }) {
  const entries = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0 || total === 0) {
    return <p className="text-sm text-muted-foreground py-12 text-center">لا توجد طلبات</p>;
  }
  return (
    <div className="space-y-3">
      {entries.map(([status, count]) => {
        const p = Math.round((count / total) * 100);
        return (
          <div key={status}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">{STATUS_LABEL[status] ?? status}</span>
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
        <StatsCard label="إجمالي المعاملات (GMV)" value={<Currency amount={stats.gmv} />} icon={TrendingUp} index={0} />
        <StatsCard
          label={isCarrier ? 'صافي إيراد الناقل' : 'إجمالي الإنفاق'}
          value={<Currency amount={stats.revenue} />} icon={Wallet} tone="success" index={1}
        />
        <StatsCard label="عمولة المنصة" value={<Currency amount={stats.commission} />} hint="من طلبات هذه الشركة" icon={BarChart2} index={2} />
        <StatsCard label="متوسط قيمة الطلب" value={<Currency amount={stats.avgOrderValue} />} icon={Package} index={3} />
        {isCarrier && (
          <>
            <StatsCard label="نسبة الفوز بالعروض" value={pct(stats.winRate)} hint={`${stats.wonBids} من ${stats.totalBids}`} icon={Activity} index={4} />
            <StatsCard label="عروض نشطة" value={stats.activeBids} icon={BarChart2} tone="warning" index={5} />
          </>
        )}
      </div>

      {isCarrier && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">مستحقّات الأسطول المستقل (فريلانس)</CardTitle>
            <CardDescription>فواتير السائقين/الشاحنات المستقلّة لهذا الناقل</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FinRow label="مستحق (غير مدفوع)" value={stats.freelancerDue} tone="warning" />
              <FinRow label="مدفوع" value={stats.freelancerPaid} tone="success" />
              <FinRow label="عدد الفواتير" value={stats.freelancerCount} count />
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
  const { data: kycDocs } = useSWR<{ id: string; type: string; status: string; fileUrl: string; createdAt: string }[]>(
    `/companies/${company.id}/kyc`, fetcher);
  const docs = Array.isArray(kycDocs) ? kycDocs : [];
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader><CardTitle>المعلومات الأساسية</CardTitle></CardHeader>
        <CardContent>
          <dl className="divide-y">
            <Row label="الاسم (عربي)" value={company.nameAr} />
            <Row label="Name (EN)" value={<span className="num">{company.nameEn || '—'}</span>} />
            <Row label="السجل التجاري" value={<span className="num">{company.crNumber || '—'}</span>} />
            <Row label="الرقم الضريبي" value={<span className="num">{company.vatNumber || '—'}</span>} />
            <Row label="المدينة" icon={MapPin} value={`${company.city}، ${company.region}`} />
            <Row label="البريد" icon={Mail} value={<span className="num">{company.contactEmail}</span>} />
            <Row label="الهاتف" icon={Phone} value={<span className="num" dir="ltr">{company.contactPhone}</span>} />
            <Row label="تاريخ التسجيل" value={formatDate(company.joinedAt, 'd MMMM yyyy')} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>مستندات التحقق (KYC)</CardTitle>
          <CardDescription className="mt-1">حالة اعتماد الكيان: {company.kycStatus === 'APPROVED' ? 'معتمد' : company.kycStatus === 'REJECTED' ? 'مرفوض' : 'قيد المراجعة'}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {docs.length === 0 ? (
            <KycDocRow label="لم تُرفع مستندات بعد" state="missing" />
          ) : (
            docs.map((d) => (
              <KycDocRow
                key={d.id}
                label={KYC_TYPE_LABEL[d.type] ?? d.type}
                file={d.fileUrl}
                state={d.status === 'APPROVED' ? 'approved' : d.status === 'REJECTED' ? 'rejected' : 'pending'}
              />
            ))
          )}
          {isCarrier && docs.length > 0 && (
            <p className="text-[11px] text-muted-foreground pt-1">تشمل رخصة النقل وبوليصة التأمين عند توفرها.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const KYC_TYPE_LABEL: Record<string, string> = {
  COMMERCIAL_REGISTER: 'السجل التجاري',
  VAT_CERTIFICATE: 'شهادة الزكاة والدخل',
  TAX_CERTIFICATE: 'شهادة الضريبة (VAT)',
  FREIGHT_LICENSE: 'رخصة نقل البضائع',
  INSURANCE_POLICY: 'بوليصة التأمين',
  ARTICLES_OF_ASSOCIATION: 'عقد التأسيس',
  BANK_LETTER: 'خطاب البنك (IBAN)',
  OTHER: 'وثيقة أخرى',
};

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
  const META = {
    pending:  { bg: 'bg-warning/15 text-warning',         label: 'بانتظار', icon: FileText },
    approved: { bg: 'bg-success/15 text-success',         label: 'معتمد',   icon: FileCheck },
    rejected: { bg: 'bg-destructive/15 text-destructive', label: 'مرفوض',  icon: FileX },
    missing:  { bg: 'bg-muted text-muted-foreground',     label: 'لم يُرفع', icon: FileText },
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
          <a href={file} target="_blank" rel="noopener noreferrer">عرض</a>
        </Button>
      )}
    </div>
  );
}

// ─── Trucks tab ──────────────────────────────────────────────────────
const TRUCK_TYPE_LABEL: Record<string, string> = {
  SMALL_FLATBED: 'مسطح صغير', MEDIUM_FLATBED: 'مسطح متوسط', LARGE_FLATBED: 'مسطح كبير',
  REFRIGERATED: 'مبرّد', CONTAINER_20: 'حاوية 20', CONTAINER_40: 'حاوية 40',
  TANKER: 'صهريج', CURTAINSIDER: 'ستائري', BOX_TRUCK: 'صندوق', LOWBED: 'لوبد',
};

interface ApiTruck {
  id: string; plateNumber: string; type: string; capacity: number; status: string;
  ownership: string; currentDriver?: { user: { firstName: string; lastName: string } } | null;
}

function TrucksTab({ companyId }: { companyId: string }) {
  const { data } = useSWR<ApiTruck[]>(`/admin/companies/${companyId}/trucks`, fetcher);
  if (!data) return <TabSkeleton />;
  if (data.length === 0) return <EmptyCard icon={Truck} text="لا توجد شاحنات مسجّلة لهذا الناقل" />;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">أسطول الشاحنات</CardTitle>
          <Badge variant="secondary">{data.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>اللوحة</TableHead>
              <TableHead>النوع</TableHead>
              <TableHead>الحمولة</TableHead>
              <TableHead>الملكية</TableHead>
              <TableHead>السائق الحالي</TableHead>
              <TableHead>الحالة</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((t) => {
              const plate = parsePlateString(t.plateNumber);
              const driver = t.currentDriver ? `${t.currentDriver.user.firstName} ${t.currentDriver.user.lastName}`.trim() : '—';
              return (
                <TableRow key={t.id}>
                  <TableCell><div className="w-[96px]"><SaudiLicensePlate letters={plate.letters} numbers={plate.numbers} plateType="transport" size="fill" /></div></TableCell>
                  <TableCell className="text-sm">{TRUCK_TYPE_LABEL[t.type] ?? t.type}</TableCell>
                  <TableCell className="num text-sm">{t.capacity} طن</TableCell>
                  <TableCell><Badge variant={t.ownership === 'OWNED' ? 'secondary' : 'outline'}>{t.ownership === 'OWNED' ? 'مملوكة' : 'مستقلّة'}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{driver}</TableCell>
                  <TableCell><StatusBadge status={t.status} /></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
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
  const { data } = useSWR<ApiDriver[]>(`/admin/companies/${companyId}/drivers`, fetcher);
  if (!data) return <TabSkeleton />;
  if (data.length === 0) return <EmptyCard icon={UserIcon} text="لا يوجد سائقون مسجّلون لهذا الناقل" />;
  const now = Date.now();
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">السائقون</CardTitle>
          <Badge variant="secondary">{data.length}</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>السائق</TableHead>
              <TableHead>الجوال</TableHead>
              <TableHead>الرخصة</TableHead>
              <TableHead>الملكية</TableHead>
              <TableHead className="text-center">رحلات</TableHead>
              <TableHead className="text-center">التقييم</TableHead>
              <TableHead>الحالة</TableHead>
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
                        {expState === 'expired' ? 'منتهية الصلاحية' : expState === 'soon' ? `تنتهي خلال ${days} يوم` : `سارية حتى ${formatDate(d.licenseExpiry, 'MMM yyyy')}`}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant={d.ownership === 'OWNED' ? 'secondary' : 'outline'}>{d.ownership === 'OWNED' ? 'موظّف' : 'مستقل'}</Badge></TableCell>
                  <TableCell className="text-center num">{d.totalTrips}</TableCell>
                  <TableCell className="text-center num">{d.rating > 0 ? d.rating.toFixed(1) : '—'}</TableCell>
                  <TableCell><StatusBadge status={d.status} /></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ─── Account statement tab ───────────────────────────────────────────
const TX_TYPE_LABEL: Record<string, string> = {
  CREDIT_NOTE: 'إشعار دائن', DEBIT_NOTE: 'إشعار مدين',
  ADMIN_CREDIT: 'إضافة يدوية', ADMIN_DEBIT: 'خصم يدوي', ADMIN_ADJUSTMENT: 'تسوية',
  ESCROW_HOLD: 'حجز ضمان', ESCROW_RELEASE: 'تحرير ضمان', COMMISSION: 'عمولة', PAYOUT: 'تحويل',
};

interface StatementLine {
  id: string; type: string; amount: number; balance: number; reference?: string | null;
  description: string; createdAt: string;
}
interface Statement {
  companyName: string; walletBalance: number; totalCredits: number; totalDebits: number; lines: StatementLine[];
}

function StatementTab({ companyId, companyName }: { companyId: string; companyName: string }) {
  const { data, mutate } = useSWR<Statement>(`/admin/companies/${companyId}/statement`, fetcher);
  const { mutate: globalMutate } = useSWRConfig();
  const [open, setOpen] = useState(false);

  const onIssued = () => {
    mutate();
    globalMutate(`/companies/${companyId}/stats`); // refresh the Financial tab too
  };

  if (!data) return <TabSkeleton />;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatsCard label="رصيد الحساب" value={<Currency amount={data.walletBalance} />} hint="المستحق حاليا" icon={Wallet} tone={data.walletBalance >= 0 ? 'success' : 'danger'} index={0} />
        <StatsCard label="إجمالي الدائن" value={<Currency amount={data.totalCredits} />} hint="لصالح الناقل" icon={PlusCircle} tone="success" index={1} />
        <StatsCard label="إجمالي المدين" value={<Currency amount={data.totalDebits} />} hint="على الناقل" icon={MinusCircle} tone="warning" index={2} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-base">كشف الحساب</CardTitle>
              <CardDescription className="mt-1">حركات حساب الناقل مع المنصة</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => printStatement(companyName, data)} disabled={data.lines.length === 0}>
                <Printer className="h-4 w-4" /> طباعة / PDF
              </Button>
              <Button size="sm" onClick={() => setOpen(true)}>
                <FileText className="h-4 w-4" /> إصدار إشعار
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {data.lines.length === 0 ? (
            <p className="text-sm text-muted-foreground py-10 text-center">لا توجد حركات بعد</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>المرجع</TableHead>
                  <TableHead>البيان</TableHead>
                  <TableHead className="text-end">المبلغ</TableHead>
                  <TableHead className="text-end">الرصيد</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.lines.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-xs text-muted-foreground num whitespace-nowrap">{formatDate(l.createdAt, 'd MMM yyyy')}</TableCell>
                    <TableCell className="text-sm">{TX_TYPE_LABEL[l.type] ?? l.type}</TableCell>
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
      notify.success('تم إصدار الإشعار', ref ? `المرجع ${ref}` : undefined);
      setAmount(''); setReason(''); setType('CREDIT');
      onOpenChange(false);
      onIssued();
    } catch (err) {
      notify.error(err, 'تعذّر إصدار الإشعار');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>إصدار إشعار</DialogTitle>
          <DialogDescription>إشعار دائن يرفع رصيد الناقل، ومدين يخفضه. يُسجَّل في كشف الحساب برقم مرجعي.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant={type === 'CREDIT' ? 'default' : 'outline'} onClick={() => setType('CREDIT')}>
              <PlusCircle className="h-4 w-4" /> إشعار دائن
            </Button>
            <Button type="button" variant={type === 'DEBIT' ? 'default' : 'outline'} onClick={() => setType('DEBIT')}>
              <MinusCircle className="h-4 w-4" /> إشعار مدين
            </Button>
          </div>
          <div className="space-y-1.5">
            <Label>المبلغ (ر.س)</Label>
            <Input type="number" min="0" step="0.01" dir="ltr" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-1.5">
            <Label>السبب / البيان</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="مثال: مكافأة أداء، تعويض، غرامة تأخير…" rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={submit} disabled={saving || !(Number(amount) > 0) || !reason.trim()}>
            {saving ? 'جار الإصدار…' : 'إصدار'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Open a clean, print-ready statement in a new window (saves as PDF via print). */
function printStatement(companyName: string, data: Statement) {
  const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string));
  const sar = (n: number) => `${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`;
  const rows = data.lines.map((l) => `
    <tr>
      <td>${new Date(l.createdAt).toLocaleDateString('en-GB')}</td>
      <td>${esc(TX_TYPE_LABEL[l.type] ?? l.type)}</td>
      <td class="mono">${esc(l.reference ?? '—')}</td>
      <td>${esc(l.description)}</td>
      <td class="num ${l.amount >= 0 ? 'cr' : 'dr'}">${l.amount >= 0 ? '+' : '−'}${sar(Math.abs(l.amount))}</td>
      <td class="num">${sar(l.balance)}</td>
    </tr>`).join('');
  const html = `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
    <title>كشف حساب — ${esc(companyName)}</title>
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
    <h1>كشف حساب — ${esc(companyName)}</h1>
    <div class="sub">نقلة لوجيستك · ${new Date().toLocaleDateString('en-GB')}</div>
    <div class="cards">
      <div class="card"><div class="l">رصيد الحساب</div><div class="v">${sar(data.walletBalance)}</div></div>
      <div class="card"><div class="l">إجمالي الدائن</div><div class="v cr">${sar(data.totalCredits)}</div></div>
      <div class="card"><div class="l">إجمالي المدين</div><div class="v dr">${sar(data.totalDebits)}</div></div>
    </div>
    <table><thead><tr><th>التاريخ</th><th>النوع</th><th>المرجع</th><th>البيان</th><th class="num">المبلغ</th><th class="num">الرصيد</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="6">لا توجد حركات</td></tr>'}</tbody></table>
    </body></html>`;
  const w = window.open('', '_blank');
  if (!w) { notify.error(null, 'تعذّر فتح نافذة الطباعة — اسمح بالنوافذ المنبثقة'); return; }
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
  const [members, setMembers] = useState<TeamMember[]>(() => teamMembersFor(companyId));

  if (members.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> الفريق</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground">لا يوجد أعضاء بعد</CardContent>
      </Card>
    );
  }

  const roleLabels: Record<CompanyRole, { icon: LucideIcon; label: string }> = {
    OWNER:    { icon: Crown,       label: 'المالك' },
    ADMIN:    { icon: ShieldCheck, label: 'مدير' },
    STAFF:    { icon: Package,     label: 'مشرف عمليات' },
    DISPATCH: { icon: Truck,       label: 'مشرف أسطول' },
    FINANCE:  { icon: Wallet,      label: 'محاسب' },
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> الفريق</CardTitle>
          <Badge variant="secondary">{members.length} عضو</Badge>
        </div>
        <CardDescription className="mt-1">
          الأدمن يمكنه عرض وإيقاف/حذف الأعضاء فقط. إضافة الأعضاء حق الشركة من إعداداتها.
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
                    {m.status === 'SUSPENDED' && <Badge variant="destructive" className="text-[10px]">موقوف</Badge>}
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <span className="num" dir="ltr">{m.phone}</span>
                    {m.email && <span dir="ltr">· {m.email}</span>}
                    <span>· انضم {formatDate(m.addedAt)}</span>
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
                          <X className="h-3.5 w-3.5" /> إيقاف
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => setMembers((s) => s.map((x) => x.id === m.id ? { ...x, status: 'ACTIVE' } : x))}>
                          <Check className="h-3.5 w-3.5" /> تنشيط
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => { if (confirm('حذف هذا العضو من الفريق؟')) setMembers((s) => s.filter((x) => x.id !== m.id)); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> حذف من الفريق
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

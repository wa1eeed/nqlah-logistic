'use client';
import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Activity, ArrowRight, BarChart2, Building2, Check, Crown, FileCheck, FileText, FileX,
  Gauge, Mail, MapPin, MoreVertical, Package, Phone, ShieldCheck, Star, Trash2, TrendingUp,
  Truck, Upload, Users, Wallet, X, type LucideIcon,
} from 'lucide-react';
import {
  Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/page-header';
import { StatsCard } from '@/components/stats-card';
import { StatusBadge } from '@/components/status-badge';
import { Currency } from '@/components/currency';
import { Skeleton } from '@/components/ui/skeleton';
import { fetcher } from '@/lib/api';
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
        <TabsList>
          <TabsTrigger value="overview"><Gauge className="h-4 w-4 me-1.5" /> نظرة عامة</TabsTrigger>
          <TabsTrigger value="orders"><Package className="h-4 w-4 me-1.5" /> الطلبات</TabsTrigger>
          <TabsTrigger value="financial"><Wallet className="h-4 w-4 me-1.5" /> المالية</TabsTrigger>
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

        {/* ─── Financial ─── */}
        <TabsContent value="financial">
          <FinancialTab stats={statsData} isCarrier={isCarrier} />
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

'use client';
import { useMemo } from 'react';
import {
  Building2, Package, Percent, ShieldCheck, TrendingUp, Wallet,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { PageHeader } from '@/components/page-header';
import { StatsCard } from '@/components/stats-card';
import { Currency } from '@/components/currency';
import {
  COMPANIES, DISPUTES, ORDERS, PAYMENTS, ordersForCarrier,
} from '@naqla/shared-utils';

export default function AdminReportsPage() {
  const stats = useMemo(() => {
    const totalGmv = PAYMENTS.reduce((s, p) => s + p.amount, 0);
    const totalCommission = PAYMENTS.reduce((s, p) => s + p.commission, 0);
    const totalVat = PAYMENTS.reduce((s, p) => s + p.vat, 0);
    const completed = ORDERS.filter((o) => o.status === 'COMPLETED' || o.status === 'DELIVERED').length;
    const active = ORDERS.filter((o) => o.status === 'IN_TRANSIT' || o.status === 'CONFIRMED').length;
    const openDisputes = DISPUTES.filter((d) => d.status === 'OPEN' || d.status === 'UNDER_REVIEW').length;
    const carriers = COMPANIES.filter((c) => c.kind === 'CARRIER').length;
    const clients  = COMPANIES.filter((c) => c.kind === 'CLIENT').length;
    return { totalGmv, totalCommission, totalVat, completed, active, openDisputes, carriers, clients };
  }, []);

  // Top carriers by completed orders
  const topCarriers = useMemo(() => {
    return COMPANIES
      .filter((c) => c.kind === 'CARRIER')
      .map((c) => {
        const ords = ordersForCarrier(c.id).filter((o) => o.status === 'COMPLETED' || o.status === 'DELIVERED');
        const revenue = ords.reduce((s, o) => s + (o.agreedPrice ?? 0), 0);
        return { carrier: c, completed: ords.length, revenue };
      })
      .sort((a, b) => b.completed - a.completed)
      .slice(0, 5);
  }, []);

  // Top routes (by volume)
  const topRoutes = useMemo(() => {
    const map = new Map<string, { count: number; revenue: number }>();
    for (const o of ORDERS) {
      const key = `${o.originCity} ← ${o.destinationCity}`;
      const cur = map.get(key) ?? { count: 0, revenue: 0 };
      cur.count += 1;
      cur.revenue += o.agreedPrice ?? 0;
      map.set(key, cur);
    }
    return Array.from(map.entries())
      .map(([route, v]) => ({ route, ...v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, []);

  // 7-day order trend (mock — bucket by week-day name)
  const trend = useMemo(() => {
    const days = ['س', 'أ', 'ث', 'ر', 'خ', 'ج', 'س'];
    const counts = [4, 7, 5, 9, 12, 6, 8];
    const max = Math.max(...counts);
    return days.map((d, i) => ({ day: d, count: counts[i], pct: (counts[i]! / max) * 100 }));
  }, []);

  return (
    <>
      <PageHeader
        title="التقارير والإحصاءات"
        subtitle="مؤشّرات أداء المنصة عبر طلباتها، إيراداتها، وشركائها"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatsCard
          label="حجم المعاملات (GMV)"
          value={<Currency amount={stats.totalGmv} />}
          icon={Wallet}
          hint="إجمالي الطلبات المسدّدة"
        />
        <StatsCard
          label="إجمالي العمولة"
          value={<Currency amount={stats.totalCommission} />}
          icon={Percent}
          tone="success"
          hint={`${((stats.totalCommission / stats.totalGmv) * 100).toFixed(1)}% من GMV`}
        />
        <StatsCard
          label="طلبات نشطة"
          value={stats.active.toLocaleString('en-US')}
          icon={Package}
          hint={`${stats.completed} مكتملة`}
        />
        <StatsCard
          label="نزاعات مفتوحة"
          value={stats.openDisputes.toLocaleString('en-US')}
          icon={ShieldCheck}
          tone={stats.openDisputes > 0 ? 'warning' : 'success'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Trend chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>الطلبات — آخر 7 أيام</CardTitle>
            <CardDescription>عدد الطلبات الجديدة المُنشأة يومياً</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3 h-48">
              {trend.map((t, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div className="text-xs font-medium num">{t.count}</div>
                  <div className="w-full rounded-t-md bg-primary/15 relative" style={{ height: `${t.pct}%` }}>
                    <div
                      className="absolute inset-x-0 bottom-0 rounded-t-md bg-primary"
                      style={{ height: `${t.pct}%` }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground">{t.day}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-success" />
              <span className="text-success font-medium">+18.2%</span>
              <span className="text-muted-foreground">مقارنة بالأسبوع الماضي</span>
            </div>
          </CardContent>
        </Card>

        {/* Mix breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>توزيع المستخدمين</CardTitle>
            <CardDescription>عدد الشركات حسب النوع</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <DistRow label="عملاء"   value={stats.clients}  total={stats.clients + stats.carriers} icon={Building2} />
            <DistRow label="ناقلون" value={stats.carriers} total={stats.clients + stats.carriers} icon={Building2} tone="success" />
            <div className="pt-3 border-t">
              <div className="text-xs text-muted-foreground">إيرادات الضريبة (VAT)</div>
              <div className="mt-1 text-xl font-bold">
                <Currency amount={stats.totalVat} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>أعلى الناقلين أداءً</CardTitle>
            <CardDescription>حسب عدد الطلبات المكتملة</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>الناقل</TableHead>
                  <TableHead className="text-end">الطلبات</TableHead>
                  <TableHead className="text-end">الإيراد</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topCarriers.map((t, i) => (
                  <TableRow key={t.carrier.id}>
                    <TableCell className="font-mono text-muted-foreground">{i + 1}</TableCell>
                    <TableCell>
                      <div className="font-medium">{t.carrier.nameAr}</div>
                      <div className="text-xs text-muted-foreground">{t.carrier.city}</div>
                    </TableCell>
                    <TableCell className="text-end num">{t.completed}</TableCell>
                    <TableCell className="text-end"><Currency amount={t.revenue} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>المسارات الأكثر طلباً</CardTitle>
            <CardDescription>أعلى 6 مسارات بحجم الطلبات</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {topRoutes.map((r, i) => (
              <div key={r.route} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-7 w-7 rounded-md bg-primary/10 text-primary grid place-items-center text-xs font-bold shrink-0">
                    {i + 1}
                  </div>
                  <span className="text-sm truncate">{r.route}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge variant="outline" className="num">{r.count} طلب</Badge>
                  <span className="text-xs num text-muted-foreground">
                    <Currency amount={r.revenue} />
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function DistRow({
  label, value, total, icon: Icon, tone = 'default',
}: { label: string; value: number; total: number; icon: any; tone?: 'default' | 'success' }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  const color = tone === 'success' ? 'bg-success' : 'bg-primary';
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span>{label}</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-bold num">{value}</span>
          <span className="text-xs text-muted-foreground num">({pct.toFixed(0)}%)</span>
        </div>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

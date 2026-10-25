'use client';
import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle, Clock, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/page-header';
import { StatsCard } from '@/components/stats-card';
import { StatusBadge } from '@/components/status-badge';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';
import { DISPUTES, ORDERS, companyById, formatRelative, formatDate, type Dispute } from '@naqla/shared-utils';

export default function AdminDisputesPage() {
  const t = useTranslations('compliance');
  const router = useRouter();
  const [tab, setTab] = useState('ALL');

  // GET /admin/disputes — falls back to mock DISPUTES when API is unreachable.
  const { data } = useSWR<unknown>('/admin/disputes', fetcher);
  const all: Dispute[] = useMemo(() => {
    const arr =
      Array.isArray(data) ? data :
      Array.isArray((data as { items?: unknown[] })?.items) ? (data as { items: unknown[] }).items :
      [];
    return (arr.length > 0 ? arr : DISPUTES) as Dispute[];
  }, [data]);

  const rows = useMemo(
    () => (tab === 'ALL' ? all : all.filter((d) => d.status === tab)),
    [all, tab],
  );

  const open = all.filter((d) => d.status === 'OPEN').length;
  const review = all.filter((d) => d.status === 'UNDER_REVIEW').length;
  const resolved = all.filter((d) => d.status === 'RESOLVED').length;

  return (
    <>
      <PageHeader eyebrow={t('disputes.eyebrow')} title={t('disputes.title')} subtitle={t('disputes.subtitle')} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard label={t('disputes.stats.open')} value={open} hint={t('disputes.stats.openHint')} icon={AlertTriangle} tone="danger" index={0} />
        <StatsCard label={t('disputes.stats.underReview')} value={review} hint={t('disputes.stats.underReviewHint')} icon={Clock} tone="warning" index={1} />
        <StatsCard label={t('disputes.stats.resolved')} value={resolved} hint={t('disputes.stats.resolvedHint')} icon={CheckCircle} tone="success" index={2} />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="ALL">{t('disputes.tabs.all', { count: all.length })}</TabsTrigger>
          <TabsTrigger value="OPEN">{t('disputes.tabs.open', { count: open })}</TabsTrigger>
          <TabsTrigger value="UNDER_REVIEW">{t('disputes.tabs.underReview', { count: review })}</TabsTrigger>
          <TabsTrigger value="RESOLVED">{t('disputes.tabs.resolved', { count: resolved })}</TabsTrigger>
        </TabsList>
      </Tabs>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{t('disputes.empty')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {rows.map((d) => {
            const order = ORDERS.find((o) => o.id === d.orderId);
            const raiser = companyById(d.raisedById);
            const tone =
              d.status === 'OPEN' ? 'bg-destructive/15 text-destructive' :
              d.status === 'UNDER_REVIEW' ? 'bg-warning/15 text-warning' :
              'bg-success/15 text-success';
            const accent =
              d.status === 'OPEN' ? 'border-s-destructive' :
              d.status === 'UNDER_REVIEW' ? 'border-s-warning' :
              'border-s-success';
            return (
              <Card key={d.id} className={`border-s-4 ${accent} hover:shadow-[var(--shadow-hover)] hover:-translate-y-0.5 cursor-pointer transition-all`} onClick={() => router.push(`/disputes/${d.id}`)}>
                <CardContent className="p-6 flex items-start gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl shrink-0 ${tone}`}>
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{d.reason}</h3>
                      <StatusBadge status={d.status} />
                      <Badge variant={d.raisedBy === 'CLIENT' ? 'default' : 'warning'}>
                        {d.raisedBy === 'CLIENT' ? t('disputes.raisedBy.client') : t('disputes.raisedBy.carrier')}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{d.description}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                      <span className="font-mono">{d.id}</span>
                      {order && <span>· {t('disputes.orderLabel', { number: order.orderNumber })}</span>}
                      {raiser && <span>· {t('disputes.raisedByLabel', { name: raiser.nameAr })}</span>}
                      <span>· {formatRelative(d.createdAt)}</span>
                      {d.resolvedAt && <span>· {t('disputes.resolvedAtLabel', { date: formatDate(d.resolvedAt) })}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" asChild>
                      <Link href={`/disputes/${d.id}`}>{t('disputes.viewDetails')}</Link>
                    </Button>
                    {d.status === 'OPEN' && (
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/disputes/${d.id}`}>{t('disputes.assignReviewer')}</Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}

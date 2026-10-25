'use client';
import Link from 'next/link';
import useSWR from 'swr';
import { useLocale, useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, MapPin, PackageSearch, CalendarClock } from 'lucide-react';
import { localizeCity, formatDate } from '@naqla/shared-utils';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/status-badge';
import { EmptyState } from '@/components/empty-state';
import { fetcher } from '@/lib/api';
import type { DriverJob } from '@/lib/types';

export default function JobsPage() {
  const t = useTranslations('driver');
  const locale = useLocale() as 'ar' | 'en';
  const { data, isLoading } = useSWR<DriverJob[]>('/driver/jobs', fetcher);
  const Chevron = locale === 'ar' ? ChevronLeft : ChevronRight;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">{t('jobs.title')}</h1>
        {data && data.length > 0 && (
          <span className="text-sm text-muted-foreground num">{data.length}</span>
        )}
      </div>

      {isLoading && !data ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-20 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState icon={PackageSearch} title={t('jobs.emptyTitle')} description={t('jobs.emptyDescription')} />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.map((job) => (
            <Link key={job.id} href={`/jobs/${job.id}`} className="block">
              <Card className="transition-colors active:bg-accent/40 hover:border-primary/30">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold num" dir="ltr">{job.orderNumber}</div>
                    <StatusBadge status={job.status} />
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 shrink-0 text-primary" />
                    <span className="font-medium">{localizeCity(job.originCity, locale)}</span>
                    <Chevron className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="font-medium">{localizeCity(job.destinationCity, locale)}</span>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <CalendarClock className="h-3.5 w-3.5" />
                      <span className="num">{formatDate(job.pickupDate)}</span>
                    </span>
                    {job.stops.length > 0 && (
                      <span className="num">{t('jobs.stopsCount', { count: job.stops.length })}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { useLocale, useTranslations } from 'next-intl';
import {
  ArrowLeftRight, ArrowLeft, ArrowRight, Check, CornerUpLeft, Loader2, MapPin, Navigation,
  PackageCheck, PackagePlus, Phone, RotateCcw, Warehouse,
} from 'lucide-react';
import { localizeCity, formatDate } from '@naqla/shared-utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/status-badge';
import { api, fetcher } from '@/lib/api';
import { notify } from '@/lib/notify';
import type { DriverJob, OrderStop, StopType } from '@/lib/types';

const TYPE_ICON: Record<StopType, React.ComponentType<{ className?: string }>> = {
  PICKUP: PackagePlus,
  DELIVERY: PackageCheck,
  DROPOFF: MapPin,
  WAREHOUSE: Warehouse,
  RETURN_EMPTY: RotateCcw,
  EXCHANGE: ArrowLeftRight,
};

const DONE = (s: string) => s === 'COMPLETED' || s === 'SKIPPED';
// Driver advances a stop forward: not-yet-arrived → ARRIVED, then → COMPLETED.
function nextStatus(status: string): 'ARRIVED' | 'COMPLETED' | null {
  if (DONE(status)) return null;
  if (status === 'ARRIVED') return 'COMPLETED';
  return 'ARRIVED';
}

export default function JobDetailPage() {
  const params = useParams();
  const id = String(params.id);
  const t = useTranslations('driver');
  const locale = useLocale() as 'ar' | 'en';
  const BackArrow = locale === 'ar' ? ArrowRight : ArrowLeft;

  const { data, isLoading, mutate } = useSWR<DriverJob[]>('/driver/jobs', fetcher);
  const job = data?.find((j) => j.id === id);
  const [busyStop, setBusyStop] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const advanceStop = async (stop: OrderStop) => {
    const status = nextStatus(stop.status);
    if (!status) return;
    setBusyStop(stop.id);
    try {
      await api.patch(`/orders/${id}/stops/${stop.id}`, { status });
      await mutate();
      notify.success(status === 'ARRIVED' ? t('stops.markedArrived') : t('stops.markedCompleted'));
    } catch (e) {
      notify.error(e);
    } finally {
      setBusyStop(null);
    }
  };

  const reportLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      notify.error(t('location.unsupported'));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await api.post('/driver/location', { lat: pos.coords.latitude, lng: pos.coords.longitude });
          notify.success(t('location.reported'));
        } catch (e) {
          notify.error(e);
        } finally {
          setLocating(false);
        }
      },
      () => {
        notify.error(t('location.denied'));
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className="space-y-4">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <BackArrow className="h-4 w-4" />
        {t('detail.back')}
      </Link>

      {isLoading && !data ? (
        <Card><CardContent className="p-4"><Skeleton className="h-40 w-full" /></CardContent></Card>
      ) : !job ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">{t('detail.notFound')}</CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="font-semibold num" dir="ltr">{job.orderNumber}</div>
                <StatusBadge status={job.status} />
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 shrink-0 text-primary" />
                <span className="font-medium">{localizeCity(job.originCity, locale)}</span>
                <span className="text-muted-foreground">→</span>
                <span className="font-medium">{localizeCity(job.destinationCity, locale)}</span>
              </div>
              {job.cargoDescription && (
                <div className="text-sm text-muted-foreground">{job.cargoDescription}</div>
              )}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>{t('detail.pickup')}: <span className="num">{formatDate(job.pickupDate)}</span></span>
                {job.client?.contactPhone && (
                  <a href={`tel:${job.client.contactPhone}`} className="inline-flex items-center gap-1 text-primary">
                    <Phone className="h-3.5 w-3.5" />
                    <span className="num" dir="ltr">{job.client.contactPhone}</span>
                  </a>
                )}
              </div>
            </CardContent>
          </Card>

          <Button
            variant="outline"
            className="w-full"
            onClick={reportLocation}
            disabled={locating}
          >
            {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
            {t('location.report')}
          </Button>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t('stops.title')}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {job.stops.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">{t('stops.empty')}</div>
              ) : (
                <ol className="divide-y">
                  {job.stops.map((stop) => {
                    const Icon = TYPE_ICON[stop.type] ?? MapPin;
                    const next = nextStatus(stop.status);
                    const done = DONE(stop.status);
                    return (
                      <li key={stop.id} className="p-4 space-y-3">
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${done ? 'bg-success/15 text-success' : 'bg-primary/10 text-primary'}`}>
                            {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                          </div>
                          <div className="min-w-0 flex-1 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-medium text-muted-foreground">
                                <span className="num">{stop.sequence}</span> · {t(`stops.type.${stop.type}`)}
                              </span>
                              <StatusBadge status={stop.status} />
                            </div>
                            <div className="text-sm font-medium">{localizeCity(stop.city, locale)}</div>
                            {stop.address && <div className="text-xs text-muted-foreground">{stop.address}</div>}
                            {stop.contactPhone && (
                              <a href={`tel:${stop.contactPhone}`} className="inline-flex items-center gap-1 text-xs text-primary">
                                <Phone className="h-3 w-3" />
                                <span className="num" dir="ltr">{stop.contactPhone}</span>
                              </a>
                            )}
                            {stop.instructions && (
                              <div className="text-xs text-muted-foreground italic">{stop.instructions}</div>
                            )}
                          </div>
                        </div>
                        {next && (
                          <Button
                            size="sm"
                            variant={next === 'COMPLETED' ? 'default' : 'outline'}
                            className="w-full"
                            onClick={() => advanceStop(stop)}
                            disabled={busyStop === stop.id}
                          >
                            {busyStop === stop.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : next === 'ARRIVED' ? (
                              <CornerUpLeft className="h-4 w-4" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                            {next === 'ARRIVED' ? t('stops.markArrived') : t('stops.markCompleted')}
                          </Button>
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

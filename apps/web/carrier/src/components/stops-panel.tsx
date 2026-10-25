'use client';
import useSWR from 'swr';
import { useTranslations } from 'next-intl';
import { Check, MapPin, Navigation, Banknote, Warehouse, PackageCheck, PackagePlus, RotateCcw, ArrowLeftRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api, fetcher } from '@/lib/api';
import { notify } from '@/lib/notify';
import { localizeCity } from '@naqla/shared-utils';

type Stop = {
  id: string;
  sequence: number;
  type: 'PICKUP' | 'DELIVERY' | 'DROPOFF' | 'WAREHOUSE' | 'RETURN_EMPTY' | 'EXCHANGE';
  status: string;
  city: string;
  address: string;
  completedAt: string | null;
};
type Route = { stops: Stop[]; virtual: boolean };
type Payment = { id: string; collectionMethod: string; collectedAt: string | null } | null | undefined;

const TYPE_ICON: Record<Stop['type'], React.ComponentType<{ className?: string }>> = {
  PICKUP: PackagePlus,
  DELIVERY: PackageCheck,
  DROPOFF: MapPin,
  WAREHOUSE: Warehouse,
  RETURN_EMPTY: RotateCcw,
  EXCHANGE: ArrowLeftRight,
};
const STATUS_VARIANT: Record<string, 'secondary' | 'warning' | 'success'> = {
  PENDING: 'secondary', EN_ROUTE: 'warning', ARRIVED: 'warning', COMPLETED: 'success', SKIPPED: 'secondary',
};

/**
 * The order's multi-stop route with per-stop execution. Carriers/drivers (and
 * admins) advance each stop (arrived → completed); for a COD order a "record
 * cash collected" action is shown until it is recorded. Legacy orders with a
 * synthesized (virtual) route are shown read-only.
 */
export function StopsPanel({ orderId, canExecute, payment }: { orderId: string; canExecute: boolean; payment?: Payment }) {
  const t = useTranslations('orders');
  const { data, mutate } = useSWR<Route>(`/orders/${orderId}/stops`, fetcher);
  const stops = data?.stops ?? [];
  const virtual = data?.virtual ?? false;
  if (stops.length === 0) return null;

  const setStatus = async (stopId: string, status: string) => {
    try { await api.patch(`/orders/${orderId}/stops/${stopId}`, { status }); await mutate(); }
    catch (e) { notify.error(e); }
  };
  const collectCod = async () => {
    if (!payment?.id) return;
    try { await api.post(`/payments/${payment.id}/collect`, {}); notify.success(t('detail.route.codCollected')); await mutate(); }
    catch (e) { notify.error(e); }
  };
  const codPending = payment?.collectionMethod === 'COD' && !payment?.collectedAt;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Navigation className="h-5 w-5 text-primary" />
          {t('detail.route.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {virtual && <p className="text-xs text-muted-foreground">{t('detail.route.virtualNote')}</p>}
        <ol className="space-y-2">
          {stops.map((s) => {
            const Icon = TYPE_ICON[s.type] ?? MapPin;
            const done = s.status === 'COMPLETED';
            return (
              <li key={s.id} className="flex items-start gap-3 rounded-lg border p-3">
                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${done ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'}`}>
                  {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="num text-xs text-muted-foreground">{s.sequence}.</span>
                    <span className="text-sm font-medium">{t(`detail.route.types.${s.type}`)}</span>
                    <Badge variant={STATUS_VARIANT[s.status] ?? 'secondary'}>{t(`detail.route.status.${s.status}`)}</Badge>
                  </div>
                  <div className="mt-0.5 text-sm">{localizeCity(s.city)}</div>
                  {s.address && <div className="text-xs text-muted-foreground truncate">{s.address}</div>}
                  {canExecute && !virtual && !done && (
                    <div className="mt-2 flex gap-2">
                      {s.status !== 'ARRIVED' && (
                        <Button size="sm" variant="outline" onClick={() => setStatus(s.id, 'ARRIVED')}>{t('detail.route.markArrived')}</Button>
                      )}
                      <Button size="sm" onClick={() => setStatus(s.id, 'COMPLETED')}>{t('detail.route.markCompleted')}</Button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
        {canExecute && codPending && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-warning/40 bg-warning/5 p-3">
            <div className="flex items-center gap-2 text-sm">
              <Banknote className="h-4 w-4 text-warning" />
              {t('detail.route.codHint')}
            </div>
            <Button size="sm" variant="outline" onClick={collectCod}>{t('detail.route.collectCod')}</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useTranslations } from 'next-intl';
import { BadgeCheck, CheckCircle2, Loader2, Truck } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { api, fetcher } from '@/lib/api';
import { useConfirm } from '@/components/confirm';
import { notify } from '@/lib/notify';

interface PlanModule { key: string; name: string; price?: number }
interface Plan {
  id: string; name: string; nameEn?: string | null; tier?: string | null;
  isFree?: boolean; includedTruckLimit?: number | null;
  price?: number | { monthly?: number; yearly?: number } | null;
  modules?: PlanModule[];
}
interface Subscription {
  id: string; status: string; billingCycle: string; priceSnapshot?: number;
  currentPeriodEnd?: string | null; cancelAtPeriodEnd?: boolean; plan?: Plan | null;
}

const STATUS_VARIANT: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  TRIALING: 'bg-sky-500/15 text-sky-600 border-sky-500/30',
  PAST_DUE: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  CANCELLED: 'bg-red-500/15 text-red-600 border-red-500/30',
  EXPIRED: 'bg-red-500/15 text-red-600 border-red-500/30',
};

function monthly(p: Plan['price']): number {
  if (p == null) return 0;
  if (typeof p === 'number') return p;
  return Number(p.monthly ?? 0);
}

export default function SubscriptionPage() {
  const t = useTranslations('carrier');
  const { data: sub, isLoading, mutate } = useSWR<Subscription | null>(
    '/policies/subscription/mine', fetcher,
  );
  const { data: plans } = useSWR<Plan[]>('/policies/plans/public', fetcher);
  const [busy, setBusy] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const confirm = useConfirm();

  async function subscribe(planId: string) {
    const plan = plans?.find((p) => p.id === planId);
    const price = monthly(plan?.price);
    const ok = await confirm({
      title: 'تأكيد الاشتراك',
      description: `سيتم اشتراكك في باقة «${plan?.name ?? ''}» بقيمة ${price.toLocaleString('en-US')} ر.س شهرياً، وتُفعَّل ميزاتها فوراً${sub?.plan ? ' بدلاً من باقتك الحالية' : ''}. يمكنك إلغاء الاشتراك لاحقاً من هذه الصفحة.`,
      confirmLabel: 'اشتراك',
    });
    if (!ok) return;
    setBusy(planId);
    try {
      await api.post('/policies/subscription/subscribe', { planId, billingCycle: 'MONTHLY' });
      notify.success(t('subscription.savedSubscribe'));
      await mutate();
    } catch (e) { notify.error(e, t('subscription.error')); }
    finally { setBusy(null); }
  }
  async function cancel() {
    setBusy('cancel');
    try {
      await api.post('/policies/subscription/cancel', { immediate: false });
      notify.success(t('subscription.savedCancel'));
      setCancelOpen(false);
      await mutate();
    } catch (e) { notify.error(e, t('subscription.error')); }
    finally { setBusy(null); }
  }

  const fmtDate = (s?: string | null) =>
    s ? new Date(s).toLocaleDateString('ar-SA', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

  return (
    <div className="space-y-6">
      <PageHeader title={t('subscription.title')} subtitle={t('subscription.subtitle')} />

      {isLoading ? (
        <div className="flex justify-center py-20 text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>
      ) : sub?.plan ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <Badge variant="outline" className={STATUS_VARIANT[sub.status] ?? ''}>
                {t(`subscription.status.${sub.status}`)}
              </Badge>
              <div className="text-end">
                <div className="text-xs text-muted-foreground">{t('subscription.currentPlan')}</div>
                <div className="text-2xl font-bold">{sub.plan.name}</div>
              </div>
            </div>
            <div className="mt-4 flex items-end justify-end gap-2">
              <span className="text-sm text-muted-foreground mb-1">
                {sub.billingCycle === 'YEARLY' ? t('subscription.perYear') : t('subscription.perMonth')}
              </span>
              <span className="text-4xl font-extrabold tabular-nums">{sub.priceSnapshot ?? monthly(sub.plan.price)}</span>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <Stat icon={<Truck className="size-4" />} label={t('subscription.includedTrucks')} value={`${sub.plan.includedTruckLimit ?? '—'}`} />
              <Stat label={t('subscription.billing')} value={sub.billingCycle === 'YEARLY' ? t('subscription.yearly') : t('subscription.monthly')} />
              <Stat label={sub.cancelAtPeriodEnd ? t('subscription.endsOn') : t('subscription.nextRenewal')} value={fmtDate(sub.currentPeriodEnd)} />
            </div>

            {!!sub.plan.modules?.length && (
              <div className="mt-6">
                <div className="mb-2 text-sm text-muted-foreground">{t('subscription.includedModules')}</div>
                <div className="flex flex-wrap gap-2">
                  {sub.plan.modules.map((m) => (
                    <span key={m.key} className="inline-flex items-center gap-1.5 rounded-lg border bg-muted/40 px-3 py-1.5 text-sm">
                      <CheckCircle2 className="size-4 text-emerald-600" /> {m.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {sub.cancelAtPeriodEnd && (
              <div className="mt-6 rounded-lg bg-amber-500/10 px-4 py-3 text-sm text-amber-700">
                {t('subscription.cancelScheduledNote')}
              </div>
            )}

            {!sub.cancelAtPeriodEnd && (sub.status === 'ACTIVE' || sub.status === 'TRIALING') && (
              <div className="mt-6 flex justify-end">
                <Button variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => setCancelOpen(true)}>
                  {t('subscription.cancel')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
            <BadgeCheck className="size-10 text-muted-foreground" />
            <div className="text-lg font-semibold">{t('subscription.noPlan')}</div>
            <p className="max-w-sm text-sm text-muted-foreground">{t('subscription.noPlanHint')}</p>
          </CardContent>
        </Card>
      )}

      {/* Plan options */}
      {!!plans?.length && (
        <div>
          <h2 className="mb-3 text-h3 font-semibold">{t('subscription.availablePlans')}</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {plans.map((p) => {
              const isCurrent = sub?.plan?.id === p.id;
              return (
                <Card key={p.id} className={isCurrent ? 'border-primary' : ''}>
                  <CardContent className="flex h-full flex-col gap-3 p-5">
                    <div className="flex items-center justify-between">
                      {isCurrent && <Badge>{t('subscription.currentBadge')}</Badge>}
                      <div className="text-end">
                        <div className="font-semibold">{p.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {monthly(p.price)} {t('subscription.perMonth')}
                        </div>
                      </div>
                    </div>
                    {!!p.includedTruckLimit && (
                      <div className="flex items-center justify-end gap-1.5 text-sm text-muted-foreground">
                        {p.includedTruckLimit} <Truck className="size-4" />
                      </div>
                    )}
                    <div className="mt-auto">
                      <Button
                        className="w-full"
                        variant={isCurrent ? 'outline' : 'default'}
                        disabled={isCurrent || busy === p.id}
                        onClick={() => subscribe(p.id)}
                      >
                        {busy === p.id ? <Loader2 className="size-4 animate-spin" /> :
                          isCurrent ? t('subscription.currentBadge') :
                          sub?.plan ? t('subscription.changePlan') : t('subscription.subscribe')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('subscription.cancelTitle')}</DialogTitle>
            <DialogDescription>{t('subscription.cancelBody')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>{t('subscription.back')}</Button>
            <Button variant="destructive" onClick={cancel} disabled={busy === 'cancel'}>
              {busy === 'cancel' ? <Loader2 className="size-4 animate-spin" /> : t('subscription.cancelConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3 text-end">
      <div className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">{label} {icon}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

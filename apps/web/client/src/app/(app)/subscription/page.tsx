'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useTranslations, useLocale } from 'next-intl';
import { BadgeCheck, CheckCircle2, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api, fetcher } from '@/lib/api';
import { useConfirm } from '@/components/confirm';
import { notify } from '@/lib/notify';

interface PlanModule { key: string; name: string; nameEn?: string | null; price?: number }
interface Plan {
  id: string; name: string; nameEn?: string | null; tier?: string | null;
  audience?: string | null; isFree?: boolean;
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
  const t = useTranslations('client.subscription');
  const locale = useLocale();
  const planName = (p?: { name: string; nameEn?: string | null } | null) =>
    !p ? '' : (locale === 'en' && p.nameEn ? p.nameEn : p.name);

  const { data: sub, isLoading, error, mutate } = useSWR<Subscription | null>(
    '/policies/subscription/mine', fetcher,
  );
  // Server already filters to CLIENT + BOTH; keep a client-side guard too.
  const { data: plans } = useSWR<Plan[]>('/policies/plans/public?audience=CLIENT', fetcher);
  const clientPlans = plans?.filter((p) => !p.audience || p.audience === 'CLIENT' || p.audience === 'BOTH');
  const [busy, setBusy] = useState<string | null>(null);
  const confirm = useConfirm();

  const fmtPrice = (n: number) => n.toLocaleString(locale === 'en' ? 'en-US' : 'ar-SA');

  async function subscribe(planId: string) {
    const plan = clientPlans?.find((p) => p.id === planId);
    const price = monthly(plan?.price);
    const ok = await confirm({
      title: t('confirmSubscribeTitle'),
      description: t(sub?.plan ? 'confirmChangeBody' : 'confirmSubscribeBody', {
        name: planName(plan), price: fmtPrice(price),
      }),
      confirmLabel: t('subscribe'),
    });
    if (!ok) return;
    setBusy(planId);
    try {
      await api.post('/policies/subscription/subscribe', { planId, billingCycle: 'MONTHLY' });
      notify.success(t('savedSubscribe'));
      await mutate();
    } catch (e) { notify.error(e, t('error')); }
    finally { setBusy(null); }
  }

  async function cancel() {
    const ok = await confirm({
      title: t('cancelTitle'),
      description: t('cancelBody'),
      confirmLabel: t('cancelConfirm'),
      cancelLabel: t('back'),
      destructive: true,
    });
    if (!ok) return;
    setBusy('cancel');
    try {
      await api.post('/policies/subscription/cancel', { immediate: false });
      notify.success(t('savedCancel'));
      await mutate();
    } catch (e) { notify.error(e, t('error')); }
    finally { setBusy(null); }
  }

  const fmtDate = (s?: string | null) =>
    s ? new Date(s).toLocaleDateString(locale === 'en' ? 'en-GB' : 'ar-SA', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      {isLoading ? (
        <div className="flex justify-center py-20 text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>
      ) : error ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">{t('error')}</CardContent>
        </Card>
      ) : sub?.plan ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-4">
              <Badge variant="outline" className={STATUS_VARIANT[sub.status] ?? ''}>
                {t(`status.${sub.status}`)}
              </Badge>
              <div className="text-end">
                <div className="text-xs text-muted-foreground">{t('currentPlan')}</div>
                <div className="text-2xl font-bold">{planName(sub.plan)}</div>
              </div>
            </div>
            <div className="mt-4 flex items-end justify-end gap-2">
              <span className="text-sm text-muted-foreground mb-1">
                {sub.billingCycle === 'YEARLY' ? t('perYear') : t('perMonth')}
              </span>
              <span className="text-4xl font-extrabold tabular-nums">{sub.priceSnapshot ?? monthly(sub.plan.price)}</span>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Stat label={t('billing')} value={sub.billingCycle === 'YEARLY' ? t('yearly') : t('monthly')} />
              <Stat label={sub.cancelAtPeriodEnd ? t('endsOn') : t('nextRenewal')} value={fmtDate(sub.currentPeriodEnd)} />
            </div>

            {!!sub.plan.modules?.length && (
              <div className="mt-6">
                <div className="mb-2 text-sm text-muted-foreground">{t('includedModules')}</div>
                <div className="flex flex-wrap gap-2">
                  {sub.plan.modules.map((m) => (
                    <span key={m.key} className="inline-flex items-center gap-1.5 rounded-lg border bg-muted/40 px-3 py-1.5 text-sm">
                      <CheckCircle2 className="size-4 text-emerald-600" /> {locale === 'en' && m.nameEn ? m.nameEn : m.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {sub.cancelAtPeriodEnd && (
              <div className="mt-6 rounded-lg bg-amber-500/10 px-4 py-3 text-sm text-amber-700">
                {t('cancelScheduledNote')}
              </div>
            )}

            {!sub.cancelAtPeriodEnd && (sub.status === 'ACTIVE' || sub.status === 'TRIALING') && (
              <div className="mt-6 flex justify-end">
                <Button variant="ghost" className="text-red-600 hover:text-red-700" onClick={cancel} disabled={busy === 'cancel'}>
                  {busy === 'cancel' ? <Loader2 className="size-4 animate-spin" /> : t('cancel')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
            <BadgeCheck className="size-10 text-muted-foreground" />
            <div className="text-lg font-semibold">{t('noPlan')}</div>
            <p className="max-w-sm text-sm text-muted-foreground">{t('noPlanHint')}</p>
          </CardContent>
        </Card>
      )}

      {/* Plan options */}
      {!!clientPlans?.length && (
        <div>
          <h2 className="mb-3 text-h3 font-semibold">{t('availablePlans')}</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {clientPlans.map((p) => {
              const isCurrent = sub?.plan?.id === p.id;
              const price = monthly(p.price);
              return (
                <Card key={p.id} className={isCurrent ? 'border-primary' : ''}>
                  <CardContent className="flex h-full flex-col gap-3 p-5">
                    <div className="flex items-center justify-between gap-2">
                      {isCurrent ? <Badge>{t('currentBadge')}</Badge> : <span />}
                      <div className="text-end">
                        <div className="font-semibold">{planName(p)}</div>
                        <div className="text-sm text-muted-foreground">
                          {p.isFree || price === 0 ? t('free') : `${fmtPrice(price)} ${t('perMonth')}`}
                        </div>
                      </div>
                    </div>
                    {!!p.modules?.length && (
                      <div className="text-end text-sm text-muted-foreground">
                        {t('modulesCount', { count: p.modules.length })}
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
                          isCurrent ? t('currentBadge') :
                          sub?.plan ? t('changePlan') : t('subscribe')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3 text-end">
      <div className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

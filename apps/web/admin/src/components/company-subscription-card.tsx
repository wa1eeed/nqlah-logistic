'use client';

import useSWR from 'swr';
import { useTranslations } from 'next-intl';
import { BadgeCheck, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { fetcher } from '@/lib/api';

interface PlanModule { key: string; name: string }
interface Subscription {
  status: string; billingCycle: string; priceSnapshot?: number;
  currentPeriodEnd?: string | null; cancelAtPeriodEnd?: boolean;
  plan?: { name: string; includedTruckLimit?: number | null; modules?: PlanModule[] } | null;
}

const STATUS_CLS: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
  TRIALING: 'bg-sky-500/15 text-sky-600 border-sky-500/30',
  PAST_DUE: 'bg-amber-500/15 text-amber-600 border-amber-500/30',
  CANCELLED: 'bg-red-500/15 text-red-600 border-red-500/30',
  EXPIRED: 'bg-red-500/15 text-red-600 border-red-500/30',
};

/// Admin oversight of a company's live subscription (read-only), wired to
/// GET /policies/subscription/:companyId. Plan assignment stays in the header.
export function CompanySubscriptionCard({ companyId }: { companyId: string }) {
  const t = useTranslations('companies');
  const { data: sub } = useSWR<Subscription | null>(
    `/policies/subscription/${companyId}`, fetcher,
  );

  const fmt = (s?: string | null) =>
    s ? new Date(s).toLocaleDateString('ar-SA', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
        {sub?.plan && (
          <Badge variant="outline" className={STATUS_CLS[sub.status] ?? ''}>
            {t(`subscription.status.${sub.status}`)}
          </Badge>
        )}
        <CardTitle className="flex items-center gap-2 text-base">
          {t('subscription.title')} <BadgeCheck className="size-5 text-primary" />
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!sub?.plan ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{t('subscription.noPlan')}</p>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label={t('subscription.plan')} value={sub.plan.name} />
              <Field
                label={t('subscription.price')}
                value={`${sub.priceSnapshot ?? 0} ${sub.billingCycle === 'YEARLY' ? t('subscription.perYear') : t('subscription.perMonth')}`}
              />
              <Field label={t('subscription.trucks')} value={`${sub.plan.includedTruckLimit ?? '—'}`} />
              <Field
                label={sub.cancelAtPeriodEnd ? t('subscription.endsOn') : t('subscription.renewal')}
                value={fmt(sub.currentPeriodEnd)}
              />
            </div>
            {!!sub.plan.modules?.length && (
              <div>
                <div className="mb-2 text-xs text-muted-foreground">{t('subscription.modules')}</div>
                <div className="flex flex-wrap gap-2">
                  {sub.plan.modules.map((m) => (
                    <span key={m.key} className="inline-flex items-center gap-1.5 rounded-lg border bg-muted/40 px-2.5 py-1 text-xs">
                      <CheckCircle2 className="size-3.5 text-emerald-600" /> {m.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3 text-end">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-semibold tabular-nums">{value}</div>
    </div>
  );
}

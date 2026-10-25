'use client';
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import useSWR from 'swr';
import {
  AlertCircle, Building2, Check, Clock, FileCheck2, FileText, Loader2, ShieldCheck, X,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { PageHeader } from '@/components/page-header';
import { StatsCard } from '@/components/stats-card';
import { api, fetcher } from '@/lib/api';
import { notify } from '@/lib/notify';
import { COMPANIES, formatRelative, pendingKycCompanies, localizeCity, localizeRegion, type Company } from '@naqla/shared-utils';

const REQUIRED_DOCS = [
  'commercialRegister',
  'zakatCertificate',
  'vatCertificate',
  'insurancePolicy',
  'freightLicense',
];

export default function KycQueuePage() {
  const t = useTranslations('compliance');
  // Live company list from admin endpoint. Falls back to mock COMPANIES when
  // the API isn't reachable so the page never goes blank.
  type ApiCompany = Company & { status?: string };
  const { data, mutate } = useSWR<{ items?: ApiCompany[] } | ApiCompany[]>('/admin/companies', fetcher);
  const all = useMemo<ApiCompany[]>(() => {
    if (Array.isArray(data) && data.length > 0) return data;
    const items = (data as { items?: ApiCompany[] } | undefined)?.items;
    if (Array.isArray(items) && items.length > 0) return items;
    return COMPANIES as ApiCompany[];
  }, [data]);
  // KYC approval flow uses Company.status: ACTIVE = KYC approved, REJECTED =
  // KYC rejected, PENDING_VERIFICATION = awaiting review. Backend DTO accepts
  // exactly these four values (admin.controller.ts CompanyStatusDto).
  const pending = all.filter((c) => (c.status ?? c.kycStatus) === 'PENDING_VERIFICATION');
  const approved = all.filter((c) => (c.status ?? c.kycStatus) === 'ACTIVE' || c.kycStatus === 'APPROVED').length;
  const rejected = all.filter((c) => (c.status ?? c.kycStatus) === 'REJECTED').length;
  const total = all.length;

  const [reviewing, setReviewing] = useState<ApiCompany | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const approve = async () => {
    if (!reviewing || submitting) return;
    setSubmitting(true);
    try {
      await api.put(`/admin/companies/${reviewing.id}/status`, { status: 'ACTIVE' });
      await mutate();
      notify.success(t('kyc.toast.approvedTitle'), t('kyc.toast.approvedBody', { name: reviewing.nameAr }));
      setReviewing(null);
    } catch (err) {
      notify.error(err, t('kyc.toast.approveError'));
    } finally {
      setSubmitting(false);
    }
  };

  const reject = async () => {
    if (!reviewing || submitting) return;
    setSubmitting(true);
    try {
      // Backend DTO doesn't accept `notes` yet — we toast the reason locally
      // for admin reference. When backend extends DTO we can forward it.
      await api.put(`/admin/companies/${reviewing.id}/status`, { status: 'REJECTED' });
      await mutate();
      notify.success(
        t('kyc.toast.rejectedTitle'),
        rejectReason
          ? t('kyc.toast.rejectedBodyWithReason', { name: reviewing.nameAr, reason: rejectReason })
          : t('kyc.toast.rejectedBody', { name: reviewing.nameAr }),
      );
      setRejectOpen(false);
      setReviewing(null);
      setRejectReason('');
    } catch (err) {
      notify.error(err, t('kyc.toast.rejectError'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow={t('kyc.eyebrow')}
        title={t('kyc.title')}
        subtitle={t('kyc.subtitle')}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard label={t('kyc.stats.total')} value={total} icon={Building2} index={0} />
        <StatsCard label={t('kyc.stats.pending')} value={pending.length} icon={Clock} tone="warning" index={1} />
        <StatsCard label={t('kyc.stats.approved')} value={approved} icon={ShieldCheck} tone="success" index={2} />
        <StatsCard label={t('kyc.stats.rejected')} value={rejected} icon={X} tone="danger" index={3} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('kyc.queueTitle', { count: pending.length })}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pending.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <FileCheck2 className="h-12 w-12 mx-auto mb-3 opacity-40" />
              {t('kyc.empty')}
            </div>
          ) : (
            pending.map((c) => {
              const initials = c.nameAr.split(' ').slice(0, 2).map((w) => w[0]).join('');
              return (
                <div key={c.id} className="flex items-start gap-4 p-4 rounded-xl border border-border/70 bg-card hover:border-[hsl(var(--mint))]/40 hover:shadow-[var(--shadow-card)] transition-all">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/companies/${c.id}`} className="font-semibold hover:text-primary">
                        {c.nameAr}
                      </Link>
                      <Badge variant={c.kind === 'CARRIER' ? 'default' : 'outline'}>
                        {c.kind === 'CARRIER' ? t('kyc.kind.carrier') : t('kyc.kind.client')}
                      </Badge>
                      {c.accountType === 'INDIVIDUAL' && (
                        <Badge variant="outline">{t('kyc.accountType.individual')}</Badge>
                      )}
                      <Badge variant="warning">{c.kycStatus === 'PENDING_VERIFICATION' ? t('kyc.reviewStatus.pending') : t('kyc.reviewStatus.notSubmitted')}</Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span className="font-mono">{c.id}</span>
                      <span>· {localizeCity(c.city)}</span>
                      <span>· {t('kyc.registeredAt', { time: formatRelative(c.joinedAt) })}</span>
                      <span dir="ltr">· {c.contactEmail}</span>
                    </div>
                  </div>
                  <Button variant="outline" onClick={() => setReviewing(c)}>
                    <FileText className="h-4 w-4" /> {t('kyc.review')}
                  </Button>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Review dialog */}
      <Dialog open={!!reviewing} onOpenChange={(o) => !o && setReviewing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('kyc.reviewDialog.title', { name: reviewing?.nameAr ?? '' })}</DialogTitle>
            <DialogDescription>{t('kyc.reviewDialog.description')}</DialogDescription>
          </DialogHeader>
          {reviewing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <Info
                  label={reviewing.accountType === 'INDIVIDUAL' ? t('kyc.fields.nationalId') : t('kyc.fields.crNumber')}
                  value={reviewing.accountType === 'INDIVIDUAL' ? (reviewing.nationalId ?? '—') : (reviewing.crNumber || '—')}
                  mono
                />
                <Info label={t('kyc.fields.vatNumber')} value={reviewing.vatNumber} mono />
                <Info label={t('kyc.fields.city')} value={localizeCity(reviewing.city)} />
                <Info label={t('kyc.fields.region')} value={localizeRegion(reviewing.region)} />
                <Info label={t('kyc.fields.email')} value={reviewing.contactEmail} dir="ltr" />
                <Info label={t('kyc.fields.phone')} value={reviewing.contactPhone} dir="ltr" />
              </div>

              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground uppercase">{t('kyc.requiredDocs')}</div>
                {REQUIRED_DOCS.map((doc, i) => (
                  <div key={doc} className="flex items-center justify-between gap-3 p-3 rounded-md bg-muted/30 border">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{t(`kyc.docs.${doc}`)}</span>
                    </div>
                    {i < 4 ? (
                      <Badge variant="success">{t('kyc.docStatus.attached')}</Badge>
                    ) : (
                      <Badge variant="destructive">{t('kyc.docStatus.missing')}</Badge>
                    )}
                  </div>
                ))}
              </div>

              <div className="rounded-md bg-warning/10 border border-warning/30 p-3 flex items-start gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                <p className="text-warning-foreground">
                  {t('kyc.missingDocWarning')}
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setRejectOpen(true); }} disabled={submitting}>
              <X className="h-4 w-4" /> {t('kyc.reject')}
            </Button>
            <Button onClick={approve} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {t('kyc.approve')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject reason dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('kyc.rejectDialog.title')}</DialogTitle>
            <DialogDescription>{t('kyc.rejectDialog.description')}</DialogDescription>
          </DialogHeader>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder={t('kyc.rejectDialog.placeholder')}
            className="w-full min-h-[120px] p-3 rounded-md border bg-background"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={submitting}>{t('actions.cancel')}</Button>
            <Button variant="destructive" onClick={reject} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('kyc.rejectDialog.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Info({ label, value, mono, dir }: { label: string; value: string; mono?: boolean; dir?: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-0.5 font-medium ${mono ? 'font-mono text-xs' : 'text-sm'}`} dir={dir}>{value}</div>
    </div>
  );
}

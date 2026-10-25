'use client';
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import useSWR from 'swr';
import { AlertCircle, Loader2, Plus, Shield } from 'lucide-react';
import { api, fetcher } from '@/lib/api';
import { notify } from '@/lib/notify';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { StatsCard } from '@/components/stats-card';
import {
  CURRENT_CARRIER_ID, disputesFor, formatRelative, normalizeOrderList,
  ordersForCarrier,
  type Dispute,
} from '@naqla/shared-utils';

const DISPUTE_REASONS: { value: string; key: string }[] = [
  { value: 'تأخّر العميل في الاستلام',        key: 'delayedPickup' },
  { value: 'موقع التحميل غير مهيّأ',          key: 'unpreparedSite' },
  { value: 'رسوم إضافية غير مدفوعة',          key: 'unpaidFees' },
  { value: 'تعديل في الوجهة دون إخطار',       key: 'destinationChange' },
  { value: 'سلوك العميل/المستلم',             key: 'clientBehavior' },
  { value: 'تأخّر السماح بالتفريغ',           key: 'unloadingDelay' },
  { value: 'أخرى',                            key: 'other' },
];

export default function CarrierDisputesPage() {
  const t = useTranslations('carrier');
  type ApiDispute = Dispute & { order?: { orderNumber: string; clientId: string; carrierId?: string } };
  const { data: disputesData, mutate: mutateDisputes } = useSWR<ApiDispute[]>('/disputes', fetcher);
  const myDisputes: ApiDispute[] = useMemo(() => {
    if (Array.isArray(disputesData) && disputesData.length > 0) return disputesData;
    return disputesFor('CARRIER', CURRENT_CARRIER_ID) as ApiDispute[];
  }, [disputesData]);

  // Backend requires the order to be ASSIGNED+ to open a dispute.
  const { data: ordersData } = useSWR<unknown>('/orders?mine=true', fetcher);
  const myOrders = useMemo(() => {
    const normalized = normalizeOrderList(ordersData);
    if (normalized.length > 0) {
      return normalized.filter((o) => ['ASSIGNED', 'CONFIRMED', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED'].includes(o.status));
    }
    return ordersForCarrier(CURRENT_CARRIER_ID).filter((o) => ['ASSIGNED', 'CONFIRMED', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED'].includes(o.status));
  }, [ordersData]);

  const open = myDisputes.filter((d) => d.status === 'OPEN').length;
  const review = myDisputes.filter((d) => d.status === 'UNDER_REVIEW').length;
  const resolved = myDisputes.filter((d) => d.status === 'RESOLVED').length;

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ orderId: '', reason: '', description: '' });
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!form.orderId || !form.reason || !form.description.trim() || submitting) return;
    setSubmitting(true);
    try {
      await api.post('/disputes', {
        orderId: form.orderId,
        reason: form.reason,
        description: form.description.trim(),
      });
      await mutateDisputes();
      notify.success(t('disputes.toastSuccessTitle'), t('disputes.toastSuccessBody'));
      setCreateOpen(false);
      setForm({ orderId: '', reason: '', description: '' });
    } catch (err) {
      notify.error(err, t('disputes.toastErrorTitle'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        title={t('disputes.title')}
        subtitle={t('disputes.subtitle')}
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> {t('disputes.newDispute')}
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatsCard label={t('disputes.statTotal')} value={myDisputes.length} icon={Shield} />
        <StatsCard label={t('disputes.statOpen')} value={open} icon={AlertCircle} tone="warning" />
        <StatsCard label={t('disputes.statUnderReview')} value={review} icon={Shield} />
        <StatsCard label={t('disputes.statResolved')} value={resolved} icon={Shield} tone="success" />
      </div>

      <Card>
        <CardHeader><CardTitle>{t('disputes.listTitle')}</CardTitle></CardHeader>
        <CardContent className="p-0">
          {myDisputes.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-3 opacity-40" />
              {t('disputes.empty')}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('disputes.colId')}</TableHead>
                  <TableHead>{t('disputes.colOrder')}</TableHead>
                  <TableHead>{t('disputes.colReason')}</TableHead>
                  <TableHead>{t('disputes.colDescription')}</TableHead>
                  <TableHead>{t('disputes.colRaisedBy')}</TableHead>
                  <TableHead>{t('disputes.colDate')}</TableHead>
                  <TableHead>{t('disputes.colStatus')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myDisputes.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-mono text-xs">{d.id}</TableCell>
                    <TableCell>
                      <Link href={`/orders/${d.orderId}`} className="font-mono text-xs text-primary">
                        {d.order?.orderNumber ?? d.orderId}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">{d.reason}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[280px] truncate">{d.description}</TableCell>
                    <TableCell>
                      <Badge variant={('raisedBy' in d ? d.raisedBy : 'CARRIER') === 'CARRIER' ? 'default' : 'outline'}>
                        {('raisedBy' in d ? d.raisedBy : 'CARRIER') === 'CARRIER' ? t('disputes.raisedByYou') : t('disputes.raisedByClient')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatRelative(d.createdAt)}</TableCell>
                    <TableCell><StatusBadge status={d.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('disputes.dialogTitle')}</DialogTitle>
            <DialogDescription>{t('disputes.dialogDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>{t('disputes.relatedOrder')}</Label>
              <Select value={form.orderId} onValueChange={(v) => setForm({ ...form, orderId: v })}>
                <SelectTrigger><SelectValue placeholder={t('disputes.selectOrder')} /></SelectTrigger>
                <SelectContent>
                  {myOrders.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.orderNumber} · {o.originCity} ← {o.destinationCity}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('disputes.reason')}</Label>
              <Select value={form.reason} onValueChange={(v) => setForm({ ...form, reason: v })}>
                <SelectTrigger><SelectValue placeholder={t('disputes.selectReason')} /></SelectTrigger>
                <SelectContent>
                  {DISPUTE_REASONS.map((r) => <SelectItem key={r.key} value={r.value}>{t(`disputes.reasons.${r.key}`)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('disputes.description')}</Label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={t('disputes.descriptionPlaceholder')}
                className="w-full min-h-[120px] p-3 rounded-md border bg-background text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={submitting}>{t('disputes.cancel')}</Button>
            <Button
              onClick={submit}
              disabled={!form.orderId || !form.reason || !form.description.trim() || submitting}
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('disputes.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

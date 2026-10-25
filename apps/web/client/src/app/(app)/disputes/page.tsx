'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
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
import { Input } from '@/components/ui/input';
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
  CURRENT_CLIENT_ID, disputesFor, formatRelative, normalizeOrderList,
  ordersForClient, localizeCity,
  type Dispute,
} from '@naqla/shared-utils';

const DISPUTE_REASON_KEYS = [
  'damage',
  'delay',
  'extraCharges',
  'partialLoss',
  'driverConduct',
  'missedAppointment',
  'other',
];

export default function ClientDisputesPage() {
  const t = useTranslations('client');
  // Live disputes (POST /disputes opens, GET /disputes lists the caller's
  // own). Falls back to mock for offline demos.
  type ApiDispute = Dispute & { order?: { orderNumber: string; clientId: string; carrierId?: string } };
  const { data: disputesData, mutate: mutateDisputes } = useSWR<ApiDispute[]>('/disputes', fetcher);
  const myDisputes: ApiDispute[] = useMemo(() => {
    if (Array.isArray(disputesData) && disputesData.length > 0) return disputesData;
    return disputesFor('CLIENT', CURRENT_CLIENT_ID) as ApiDispute[];
  }, [disputesData]);

  // Live orders to populate the "open dispute" form. Only orders that have a
  // carrier on them are eligible (matches backend validation).
  const { data: ordersData } = useSWR<unknown>('/orders', fetcher);
  const myOrders = useMemo(() => {
    const normalized = normalizeOrderList(ordersData);
    if (normalized.length > 0) {
      return normalized.filter((o) => ['ASSIGNED', 'CONFIRMED', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED'].includes(o.status));
    }
    return ordersForClient(CURRENT_CLIENT_ID).filter((o) => ['ASSIGNED', 'CONFIRMED', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED'].includes(o.status));
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
      notify.success(t('disputes.toastOpenedTitle'), t('disputes.toastOpenedDesc'));
      setCreateOpen(false);
      setForm({ orderId: '', reason: '', description: '' });
    } catch (err) {
      notify.error(err, t('disputes.toastOpenFail'));
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
            <Plus className="h-4 w-4" /> {t('disputes.openNew')}
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatsCard label={t('disputes.statTotal')} value={myDisputes.length} icon={Shield} />
        <StatsCard label={t('disputes.statOpen')} value={open} icon={AlertCircle} tone="warning" />
        <StatsCard label={t('disputes.statReview')} value={review} icon={Shield} />
        <StatsCard label={t('disputes.statResolved')} value={resolved} icon={Shield} tone="success" />
      </div>

      <Card>
        <CardHeader><CardTitle>{t('disputes.listTitle')}</CardTitle></CardHeader>
        <CardContent className="p-0">
          {myDisputes.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-3 opacity-40" />
              {t('disputes.empty')}             </div>
          ) : (
           <>
            {/* Mobile: app-like card list */}
            <div className="md:hidden divide-y">
              {myDisputes.map((d) => (
                <Link key={d.id} href={`/orders/${d.orderId}`} className="block p-4 transition-colors active:bg-muted/60">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-primary">{d.order?.orderNumber ?? d.orderId}</span>
                    <StatusBadge status={d.status} />
                  </div>
                  <div className="mt-1.5 text-sm font-medium">{d.reason}</div>
                  <div className="text-xs text-muted-foreground line-clamp-2">{d.description}</div>
                  <div className="mt-2.5 flex items-center justify-between gap-2">
                    <Badge variant={('raisedBy' in d ? d.raisedBy : 'CLIENT') === 'CLIENT' ? 'default' : 'outline'}>
                      {('raisedBy' in d ? d.raisedBy : 'CLIENT') === 'CLIENT' ? t('disputes.raisedByYou') : t('disputes.raisedByCarrier')}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{formatRelative(d.createdAt)}</span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="hidden md:block">
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
                      <Badge variant={('raisedBy' in d ? d.raisedBy : 'CLIENT') === 'CLIENT' ? 'default' : 'outline'}>
                        {('raisedBy' in d ? d.raisedBy : 'CLIENT') === 'CLIENT' ? t('disputes.raisedByYou') : t('disputes.raisedByCarrier')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatRelative(d.createdAt)}</TableCell>
                    <TableCell><StatusBadge status={d.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
           </>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('disputes.openNew')}</DialogTitle>
            <DialogDescription>{t('disputes.dialogDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>{t('disputes.fieldOrder')}</Label>
              <Select value={form.orderId} onValueChange={(v) => setForm({ ...form, orderId: v })}>
                <SelectTrigger><SelectValue placeholder={t('disputes.selectOrder')} /></SelectTrigger>
                <SelectContent>
                  {myOrders.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.orderNumber} — {localizeCity(o.originCity)} ← {localizeCity(o.destinationCity)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('disputes.colReason')}</Label>
              <Select value={form.reason} onValueChange={(v) => setForm({ ...form, reason: v })}>
                <SelectTrigger><SelectValue placeholder={t('disputes.selectReason')} /></SelectTrigger>
                <SelectContent>
                  {DISPUTE_REASON_KEYS.map((r) => <SelectItem key={r} value={t(`disputes.reasons.${r}`)}>{t(`disputes.reasons.${r}`)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('disputes.fieldDescription')}</Label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={t('disputes.descPlaceholder')}
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

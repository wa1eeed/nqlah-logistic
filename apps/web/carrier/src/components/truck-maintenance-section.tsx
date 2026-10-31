'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useTranslations } from 'next-intl';
import { Loader2, Plus, Wrench } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { api, fetcher } from '@/lib/api';
import { notify } from '@/lib/notify';

const TYPES = ['OIL_CHANGE', 'BRAKES', 'TIRES', 'INSPECTION', 'INSURANCE', 'REPAIR', 'OTHER'] as const;

interface MaintRecord {
  id: string; type: string; title?: string | null; cost?: number | null;
  odometerKm?: number | null; workshop?: string | null; notes?: string | null;
  performedAt?: string | null; nextDueDate?: string | null;
}
interface MaintSchedule {
  odometerKm?: number | null; oilIntervalKm?: number | null; lastServiceKm?: number | null;
  nextServiceKm?: number | null; kmToService?: number | null;
  inspectionExpiry?: string | null; insuranceExpiry?: string | null; tiresChangedAt?: string | null;
  records?: MaintRecord[];
}

export function TruckMaintenanceSection({ truckId }: { truckId: string }) {
  const t = useTranslations('fleet');
  const key = `/fleet/trucks/${truckId}/maintenance`;
  const { data, mutate } = useSWR<MaintSchedule>(key, fetcher);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({ type: 'OIL_CHANGE' });

  const fmtDate = (s?: string | null) =>
    s ? new Date(s).toLocaleDateString('ar-SA', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
  const expiryDue = (s?: string | null) => (s ? new Date(s).getTime() < Date.now() : false);

  async function save() {
    setBusy(true);
    try {
      await api.post(key, {
        type: form.type,
        title: form.title || undefined,
        cost: form.cost ? Number(form.cost) : undefined,
        odometerKm: form.odometerKm ? Number(form.odometerKm) : undefined,
        workshop: form.workshop || undefined,
        notes: form.notes || undefined,
        nextDueDate: form.nextDueDate || undefined,
        performedAt: form.performedAt || undefined,
      });
      notify.success(t('maint.saved'));
      setOpen(false);
      setForm({ type: 'OIL_CHANGE' });
      await mutate();
    } catch (e) { notify.error(e, t('maint.error')); }
    finally { setBusy(false); }
  }

  const records = data?.records ?? [];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="size-4" /> {t('maint.logEvent')}
        </Button>
        <CardTitle className="flex items-center gap-2">
          {t('maint.title')} <Wrench className="size-5 text-primary" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Schedule */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Tile label={t('maint.odometer')} value={data?.odometerKm != null ? `${data.odometerKm} ${t('maint.km')}` : '—'} />
          <Tile
            label={t('maint.kmToService')}
            value={data?.kmToService != null ? `${data.kmToService} ${t('maint.km')}` : '—'}
            danger={data?.kmToService != null && data.kmToService <= 0}
          />
          <Tile label={t('maint.nextService')} value={data?.nextServiceKm != null ? `${data.nextServiceKm} ${t('maint.km')}` : '—'} />
          <Tile label={t('maint.inspectionExpiry')} value={fmtDate(data?.inspectionExpiry)} danger={expiryDue(data?.inspectionExpiry)} />
          <Tile label={t('maint.insuranceExpiry')} value={fmtDate(data?.insuranceExpiry)} danger={expiryDue(data?.insuranceExpiry)} />
          <Tile label={t('maint.tiresChanged')} value={fmtDate(data?.tiresChangedAt)} />
        </div>

        {/* Log */}
        <div>
          <div className="mb-2 text-sm font-medium text-muted-foreground">{t('maint.logTitle')}</div>
          {records.length === 0 ? (
            <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
              {t('maint.noRecords')}
            </div>
          ) : (
            <div className="divide-y rounded-lg border">
              {records.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="text-sm text-muted-foreground">
                    {fmtDate(r.performedAt)}{r.cost != null ? ` · ${r.cost}` : ''}{r.workshop ? ` · ${r.workshop}` : ''}
                  </div>
                  <div className="text-end">
                    <div className="font-medium">{t(`maint.type.${r.type}`)}</div>
                    {r.title && <div className="text-xs text-muted-foreground">{r.title}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('maint.logEvent')}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>{t('maint.typeLabel')}</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES.map((ty) => <SelectItem key={ty} value={ty}>{t(`maint.type.${ty}`)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Field label={t('maint.titleField')}>
              <Input value={form.title ?? ''} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('maint.odometer')}>
                <Input type="number" inputMode="numeric" value={form.odometerKm ?? ''} onChange={(e) => setForm((f) => ({ ...f, odometerKm: e.target.value }))} />
              </Field>
              <Field label={t('maint.cost')}>
                <Input type="number" inputMode="numeric" value={form.cost ?? ''} onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('maint.date')}>
                <Input type="date" value={form.performedAt ?? ''} onChange={(e) => setForm((f) => ({ ...f, performedAt: e.target.value }))} />
              </Field>
              <Field label={t('maint.nextDue')}>
                <Input type="date" value={form.nextDueDate ?? ''} onChange={(e) => setForm((f) => ({ ...f, nextDueDate: e.target.value }))} />
              </Field>
            </div>
            <Field label={t('maint.workshop')}>
              <Input value={form.workshop ?? ''} onChange={(e) => setForm((f) => ({ ...f, workshop: e.target.value }))} />
            </Field>
            <Field label={t('maint.notes')}>
              <Textarea rows={2} value={form.notes ?? ''} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t('maint.cancel')}</Button>
            <Button onClick={save} disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : t('maint.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function Tile({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 text-end ${danger ? 'border-red-500/40 bg-red-500/5' : 'bg-muted/30'}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 font-semibold tabular-nums ${danger ? 'text-red-600' : ''}`}>{value}</div>
    </div>
  );
}

function Field({ label, children, hidden }: { label: string; children?: React.ReactNode; hidden?: boolean }) {
  if (hidden) return null;
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

'use client';
import { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { Sparkles, Pencil, Plus, Trash2, Users, Building2, Truck, Coins } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api, fetcher } from '@/lib/api';
import { notify } from '@/lib/notify';
import { ConfirmDialog } from '@/components/confirm-dialog';
import type { PlanModule } from '@naqla/shared-utils';

const AUDIENCES: { value: 'CLIENT' | 'CARRIER' | 'BOTH'; label: string; icon: typeof Users }[] = [
  { value: 'CLIENT', label: 'العملاء', icon: Building2 },
  { value: 'CARRIER', label: 'المزوّدون', icon: Truck },
  { value: 'BOTH', label: 'الكل', icon: Users },
];
const nf = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 });

type Form = {
  key: string; name: string; nameEn: string; description: string;
  audience: 'CLIENT' | 'CARRIER' | 'BOTH'; price: string; active: boolean; sortOrder: string;
};
const EMPTY: Form = { key: '', name: '', nameEn: '', description: '', audience: 'CARRIER', price: '', active: true, sortOrder: '' };

/**
 * Admin catalog of priced capability modules a plan can bundle. Each module's
 * `key` grants a feature flag to subscribers, and its price adds to any plan
 * that includes it — so plans are priced dynamically from their modules.
 */
export function PlanModulesPanel() {
  const { data } = useSWR<PlanModule[]>('/policies/plan-modules', fetcher);
  const { mutate } = useSWRConfig();
  const modules = Array.isArray(data) ? data : [];

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const revalidate = () => mutate('/policies/plan-modules');

  const openCreate = () => { setEditId(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (m: PlanModule) => {
    setEditId(m.id);
    setForm({ key: m.key, name: m.name, nameEn: m.nameEn ?? '', description: m.description ?? '', audience: m.audience, price: String(m.price), active: m.active, sortOrder: m.sortOrder != null ? String(m.sortOrder) : '' });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || (!editId && !form.key.trim())) return;
    const body = {
      ...(editId ? {} : { key: form.key.trim() }),
      name: form.name.trim(), nameEn: form.nameEn.trim() || undefined, description: form.description.trim() || undefined,
      audience: form.audience, price: Number(form.price) || 0, active: form.active,
      sortOrder: form.sortOrder ? Number(form.sortOrder) : 0,
    };
    try {
      if (editId) await api.put(`/policies/plan-modules/${editId}`, body);
      else await api.post('/policies/plan-modules', body);
      notify.success(editId ? 'تم تحديث الموديول' : 'تم إضافة الموديول', form.name);
      setOpen(false); revalidate();
    } catch (e) { notify.error(e); }
  };
  const [delMod, setDelMod] = useState<PlanModule | null>(null);
  const confirmDelete = async () => {
    if (!delMod) return;
    await api.delete(`/policies/plan-modules/${delMod.id}`);
    notify.success('تم حذف الموديول', delMod.name);
    setDelMod(null); revalidate();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle>موديولز الباقات</CardTitle>
            <CardDescription className="mt-1">
              قدرات مسعّرة تُضاف للباقات (مثل: إدارة الصيانة، السائقون المتعاقدون). كل موديول يمنح ميزة للمشترك وسعره يُضاف لسعر الباقة.
            </CardDescription>
          </div>
          <Button onClick={openCreate}><Plus className="h-4 w-4" /> إضافة موديول</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {modules.length === 0 && (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">لا توجد موديولز بعد.</div>
        )}
        {modules.map((m) => {
          const aud = AUDIENCES.find((a) => a.value === m.audience);
          return (
            <div key={m.id} className="rounded-xl border bg-card p-3.5 shadow-sm flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Sparkles className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-semibold">{m.name}</span>
                  <code className="text-[10px] text-muted-foreground num" dir="ltr">{m.key}</code>
                  {!m.active && <Badge variant="destructive" className="text-[10px]">معطّل</Badge>}
                </div>
                {m.description && <div className="text-xs text-muted-foreground mt-1">{m.description}</div>}
                <div className="mt-2 flex items-center gap-1.5 flex-wrap text-xs">
                  <Badge className="gap-1 font-normal num"><Coins className="h-3 w-3" />{m.price > 0 ? `${nf(m.price)} ر.س/شهر` : 'مجاني'}</Badge>
                  {aud && <Badge variant="secondary" className="gap-1 font-normal"><aud.icon className="h-3 w-3" />{aud.label}</Badge>}
                  <Badge variant="outline" className="gap-1 font-normal">{m._count?.plans ?? 0} باقة</Badge>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(m)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDelMod(m)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          );
        })}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? 'تعديل الموديول' : 'إضافة موديول'}</DialogTitle>
            <DialogDescription>قدرة مسعّرة تُضاف للباقات. المفتاح يُربط بميزة في محرك السياسات.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5"><Label>الاسم</Label><Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="إدارة الصيانة" /></div>
              <div className="space-y-1.5"><Label>الاسم (EN)</Label><Input dir="ltr" value={form.nameEn} onChange={(e) => set('nameEn', e.target.value)} placeholder="Maintenance" /></div>
            </div>
            <div className="space-y-1.5">
              <Label>المفتاح (feature key)</Label>
              <Input dir="ltr" value={form.key} disabled={!!editId} onChange={(e) => set('key', e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))} placeholder="fleetMaintenance" />
              {editId && <p className="text-[11px] text-muted-foreground">لا يمكن تغيير المفتاح بعد الإنشاء.</p>}
            </div>
            <div className="space-y-1.5"><Label>الوصف</Label><Input value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="وصف مختصر" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label>الجمهور</Label>
                <Select value={form.audience} onValueChange={(v) => set('audience', v as Form['audience'])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{AUDIENCES.map((a) => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>السعر (ر.س/شهر)</Label><Input type="number" dir="ltr" min={0} className="text-end" value={form.price} onChange={(e) => set('price', e.target.value)} placeholder="150" /></div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1.5 w-28"><Label>الترتيب</Label><Input type="number" dir="ltr" className="text-end" value={form.sortOrder} onChange={(e) => set('sortOrder', e.target.value)} placeholder="0" /></div>
              <label className="flex items-center gap-2 text-sm cursor-pointer pt-5"><Switch checked={form.active} onCheckedChange={(v) => set('active', v)} /> مفعّل</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={save} disabled={!form.name.trim() || (!editId && !form.key.trim())}>{editId ? 'حفظ' : 'إضافة'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!delMod}
        onOpenChange={(v) => { if (!v) setDelMod(null); }}
        title={`حذف «${delMod?.name ?? ''}»`}
        description={(delMod?._count?.plans ?? 0) > 0
          ? `هذا الموديول مستخدم في ${delMod?._count?.plans} باقة — سيُزال منها وينخفض سعرها تلقائياً.`
          : 'لا يمكن التراجع عن هذا الإجراء.'}
        confirmLabel="حذف الموديول"
        onConfirm={confirmDelete}
      />
    </Card>
  );
}

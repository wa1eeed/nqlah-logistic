'use client';
import { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { Layers, Pencil, Plus, Trash2, Users, Building2, Truck } from 'lucide-react';
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
import type { Plan } from '@naqla/shared-utils';

type Profile = { id: string; name: string };
const AUDIENCES: { value: 'CLIENT' | 'CARRIER' | 'BOTH'; label: string; icon: typeof Users }[] = [
  { value: 'CLIENT', label: 'العملاء', icon: Building2 },
  { value: 'CARRIER', label: 'المزوّدون', icon: Truck },
  { value: 'BOTH', label: 'الكل', icon: Users },
];

type Form = {
  name: string; nameEn: string; description: string; tier: string;
  audience: 'CLIENT' | 'CARRIER' | 'BOTH'; policyGroupId: string;
  commissionRateOverride: string; isDefault: boolean; active: boolean;
};
const EMPTY: Form = { name: '', nameEn: '', description: '', tier: '', audience: 'BOTH', policyGroupId: '', commissionRateOverride: '', isDefault: false, active: true };

/** Admin management of Plans (memberships) that wrap a Policy Profile. */
export function PlansPanel() {
  const { data: plansData } = useSWR<Plan[]>('/policies/plans', fetcher);
  const { data: groupsData } = useSWR<Array<{ id: string; name: string }>>('/policies/groups', fetcher);
  const { mutate } = useSWRConfig();
  const plans = Array.isArray(plansData) ? plansData : [];
  const profiles: Profile[] = Array.isArray(groupsData) ? groupsData : [];
  const profileName = (id: string) => profiles.find((p) => p.id === id)?.name ?? '—';

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const revalidate = () => mutate('/policies/plans');

  const openCreate = () => { setEditId(null); setForm({ ...EMPTY, policyGroupId: profiles[0]?.id ?? '' }); setOpen(true); };
  const openEdit = (p: Plan) => {
    setEditId(p.id);
    setForm({
      name: p.name, nameEn: p.nameEn ?? '', description: p.description ?? '', tier: p.tier ?? '',
      audience: p.audience, policyGroupId: p.policyGroupId,
      commissionRateOverride: p.commissionRateOverride != null ? String(p.commissionRateOverride) : '',
      isDefault: p.isDefault, active: p.active,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.policyGroupId) return;
    const body = {
      name: form.name.trim(),
      nameEn: form.nameEn.trim() || undefined,
      description: form.description.trim() || undefined,
      tier: form.tier.trim() || undefined,
      audience: form.audience,
      policyGroupId: form.policyGroupId,
      commissionRateOverride: form.commissionRateOverride ? Number(form.commissionRateOverride) : null,
      isDefault: form.isDefault,
      active: form.active,
    };
    try {
      if (editId) await api.put(`/policies/plans/${editId}`, body);
      else await api.post('/policies/plans', body);
      notify.success(editId ? 'تم تحديث الباقة' : 'تم إنشاء الباقة', form.name);
      setOpen(false); revalidate();
    } catch (e) { notify.error(e); }
  };
  const remove = async (p: Plan) => {
    try { await api.delete(`/policies/plans/${p.id}`); notify.success('تم حذف الباقة', p.name); revalidate(); }
    catch (e) { notify.error(e); }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle>الباقات والعضويات</CardTitle>
            <CardDescription className="mt-1">
              كل باقة تشير إلى ملف سياسة يمنحها شكله (الموديولز + الميزات + العمولة). تُسنَد للشركات عند التسجيل أو من الأدمن.
            </CardDescription>
          </div>
          <Button onClick={openCreate} disabled={profiles.length === 0}><Plus className="h-4 w-4" /> إنشاء باقة</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {profiles.length === 0 && (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            أنشئ ملف سياسة واحداً على الأقل من تبويب «ملفات السياسة» قبل إنشاء الباقات.
          </div>
        )}
        {plans.length === 0 && profiles.length > 0 && (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            لا توجد باقات بعد. أنشئ باقة واربطها بملف سياسة.
          </div>
        )}
        {plans.map((p) => {
          const aud = AUDIENCES.find((a) => a.value === p.audience);
          return (
            <div key={p.id} className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Layers className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-semibold">{p.name}</span>
                    {p.nameEn && <span className="text-xs text-muted-foreground" dir="ltr">{p.nameEn}</span>}
                    {p.tier && <Badge variant="outline" className="text-[10px]">{p.tier}</Badge>}
                    {p.isDefault && <Badge variant="secondary" className="text-[10px]">افتراضية</Badge>}
                    {!p.active && <Badge variant="destructive" className="text-[10px]">معطّلة</Badge>}
                  </div>
                  {p.description && <div className="text-xs text-muted-foreground mt-1">{p.description}</div>}
                  <div className="mt-2 flex items-center gap-1.5 flex-wrap text-xs">
                    {aud && <Badge variant="secondary" className="gap-1 font-normal"><aud.icon className="h-3 w-3" />{aud.label}</Badge>}
                    <Badge variant="secondary" className="gap-1 font-normal"><SlidersHorizontalMini />{profileName(p.policyGroupId)}</Badge>
                    {p.commissionRateOverride != null && (
                      <Badge variant="secondary" className="gap-1 font-normal num">عمولة: {(p.commissionRateOverride * 100).toFixed(1)}%</Badge>
                    )}
                    <Badge variant="outline" className="gap-1 font-normal"><Users className="h-3 w-3" />{p._count?.companies ?? 0} مشترك</Badge>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(p)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? 'تعديل الباقة' : 'إنشاء باقة'}</DialogTitle>
            <DialogDescription>اربط الباقة بملف سياسة يمنحها شكلها وصلاحياتها.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5"><Label>الاسم</Label><Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="باقة احترافية" /></div>
              <div className="space-y-1.5"><Label>الاسم (EN)</Label><Input dir="ltr" value={form.nameEn} onChange={(e) => set('nameEn', e.target.value)} placeholder="Pro" /></div>
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
              <div className="space-y-1.5"><Label>الشريحة (Tier)</Label><Input value={form.tier} onChange={(e) => set('tier', e.target.value)} placeholder="BASIC / PRO" /></div>
            </div>
            <div className="space-y-1.5">
              <Label>ملف السياسة</Label>
              <Select value={form.policyGroupId || undefined} onValueChange={(v) => set('policyGroupId', v)}>
                <SelectTrigger><SelectValue placeholder="اختر ملف سياسة" /></SelectTrigger>
                <SelectContent>{profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>تجاوز العمولة (اختياري)</Label>
              <Input type="number" dir="ltr" step="0.01" min={0} max={1} className="text-end" value={form.commissionRateOverride}
                onChange={(e) => set('commissionRateOverride', e.target.value)} placeholder="مثال: 0.06 (6%)" />
            </div>
            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer"><Switch checked={form.isDefault} onCheckedChange={(v) => set('isDefault', v)} /> افتراضية لهذا الجمهور</label>
              <label className="flex items-center gap-2 text-sm cursor-pointer"><Switch checked={form.active} onCheckedChange={(v) => set('active', v)} /> مفعّلة</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={save} disabled={!form.name.trim() || !form.policyGroupId}>{editId ? 'حفظ' : 'إنشاء'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function SlidersHorizontalMini() {
  return <span className="inline-block h-3 w-3 rounded-sm bg-primary/20" aria-hidden />;
}

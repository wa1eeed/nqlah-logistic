'use client';
import { useMemo, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { Layers, Pencil, Plus, Trash2, Users, Building2, Truck, Coins, Sparkles } from 'lucide-react';
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
import type { Plan, PlanModule } from '@naqla/shared-utils';

type Profile = { id: string; name: string };
const AUDIENCES: { value: 'CLIENT' | 'CARRIER' | 'BOTH'; label: string; icon: typeof Users }[] = [
  { value: 'CLIENT', label: 'العملاء', icon: Building2 },
  { value: 'CARRIER', label: 'المزوّدون', icon: Truck },
  { value: 'BOTH', label: 'الكل', icon: Users },
];
const nf = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 2 });

type Form = {
  name: string; nameEn: string; description: string; tier: string;
  audience: 'CLIENT' | 'CARRIER' | 'BOTH'; policyGroupId: string;
  commissionRateOverride: string; isDefault: boolean; active: boolean;
  isFree: boolean; basePrice: string; yearlyDiscountPct: string;
  includedTruckLimit: string; trialDays: string; moduleIds: string[];
};
const EMPTY: Form = {
  name: '', nameEn: '', description: '', tier: '', audience: 'CARRIER', policyGroupId: '',
  commissionRateOverride: '', isDefault: false, active: true,
  isFree: true, basePrice: '', yearlyDiscountPct: '', includedTruckLimit: '', trialDays: '', moduleIds: [],
};

/** Admin management of Plans (memberships) with dynamic, component-based pricing. */
export function PlansPanel() {
  const { data: plansData } = useSWR<Plan[]>('/policies/plans', fetcher);
  const { data: groupsData } = useSWR<Array<{ id: string; name: string }>>('/policies/groups', fetcher);
  const { data: modulesData } = useSWR<PlanModule[]>('/policies/plan-modules', fetcher);
  const { mutate } = useSWRConfig();
  const plans = Array.isArray(plansData) ? plansData : [];
  const profiles: Profile[] = Array.isArray(groupsData) ? groupsData : [];
  const modules = Array.isArray(modulesData) ? modulesData : [];
  const profileName = (id: string) => profiles.find((p) => p.id === id)?.name ?? '—';

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const revalidate = () => mutate('/policies/plans');

  // Modules relevant to the plan's audience (+ BOTH), for the builder.
  const audienceModules = useMemo(
    () => modules.filter((m) => m.active && (m.audience === form.audience || m.audience === 'BOTH' || form.audience === 'BOTH')),
    [modules, form.audience],
  );
  // Live, dynamic price: base + the selected modules' prices (0 when free).
  const livePrice = useMemo(() => {
    if (form.isFree) return { monthly: 0, modulesTotal: 0, yearly: 0 };
    const base = Number(form.basePrice) || 0;
    const modulesTotal = form.moduleIds.reduce((s, id) => s + (modules.find((m) => m.id === id)?.price ?? 0), 0);
    const monthly = base + modulesTotal;
    const disc = Number(form.yearlyDiscountPct) || 0;
    return { monthly, modulesTotal, yearly: +(monthly * 12 * (1 - disc / 100)).toFixed(2) };
  }, [form.isFree, form.basePrice, form.yearlyDiscountPct, form.moduleIds, modules]);

  const toggleModule = (id: string) => set('moduleIds', form.moduleIds.includes(id) ? form.moduleIds.filter((x) => x !== id) : [...form.moduleIds, id]);

  const openCreate = () => { setEditId(null); setForm({ ...EMPTY, policyGroupId: profiles[0]?.id ?? '' }); setOpen(true); };
  const openEdit = (p: Plan) => {
    setEditId(p.id);
    setForm({
      name: p.name, nameEn: p.nameEn ?? '', description: p.description ?? '', tier: p.tier ?? '',
      audience: p.audience, policyGroupId: p.policyGroupId,
      commissionRateOverride: p.commissionRateOverride != null ? String(p.commissionRateOverride) : '',
      isDefault: p.isDefault, active: p.active,
      isFree: p.isFree ?? true, basePrice: p.basePrice ? String(p.basePrice) : '',
      yearlyDiscountPct: p.yearlyDiscountPct ? String(p.yearlyDiscountPct) : '',
      includedTruckLimit: p.includedTruckLimit != null ? String(p.includedTruckLimit) : '',
      trialDays: p.trialDays ? String(p.trialDays) : '',
      moduleIds: p.moduleIds ?? [],
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
      isFree: form.isFree,
      basePrice: form.isFree ? 0 : Number(form.basePrice) || 0,
      yearlyDiscountPct: Number(form.yearlyDiscountPct) || 0,
      includedTruckLimit: form.includedTruckLimit ? Number(form.includedTruckLimit) : null,
      trialDays: Number(form.trialDays) || 0,
      moduleIds: form.moduleIds,
    };
    try {
      if (editId) await api.put(`/policies/plans/${editId}`, body);
      else await api.post('/policies/plans', body);
      notify.success(editId ? 'تم تحديث الباقة' : 'تم إنشاء الباقة', form.name);
      setOpen(false); revalidate();
    } catch (e) { notify.error(e); }
  };
  // Dependency-aware delete: a plan with subscribers needs a decision first.
  const [delPlan, setDelPlan] = useState<Plan | null>(null);
  const [reassignTo, setReassignTo] = useState<string>('');
  const subscriberCount = delPlan?._count?.companies ?? 0;
  const reassignTargets = delPlan ? plans.filter((x) => x.id !== delPlan.id && x.active && (x.audience === delPlan.audience || x.audience === 'BOTH' || delPlan.audience === 'BOTH')) : [];
  const confirmDelete = async () => {
    if (!delPlan) return;
    let url = `/policies/plans/${delPlan.id}`;
    if (subscriberCount > 0) url += reassignTo === '__detach__' ? '?detach=true' : `?reassignTo=${reassignTo}`;
    await api.delete(url);
    notify.success('تم حذف الباقة', delPlan.name);
    setDelPlan(null); revalidate();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle>الباقات والعضويات</CardTitle>
            <CardDescription className="mt-1">
              كل باقة ترتبط بملف سياسة (شكلها وصلاحياتها) وتُسعَّر ديناميكياً: السعر = الأساسي + مجموع أسعار الموديولز المختارة. تُسنَد للشركات عند التسجيل أو من الأدمن.
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
                    {/* Dynamic price */}
                    {p.isFree ? (
                      <Badge className="gap-1 font-normal">مجانية</Badge>
                    ) : (
                      <Badge className="gap-1 font-normal num"><Coins className="h-3 w-3" />{nf(p.price?.monthly ?? 0)} ر.س/شهر</Badge>
                    )}
                    {aud && <Badge variant="secondary" className="gap-1 font-normal"><aud.icon className="h-3 w-3" />{aud.label}</Badge>}
                    <Badge variant="secondary" className="gap-1 font-normal"><SlidersHorizontalMini />{profileName(p.policyGroupId)}</Badge>
                    {(p.moduleIds?.length ?? 0) > 0 && <Badge variant="outline" className="gap-1 font-normal"><Sparkles className="h-3 w-3" />{p.moduleIds!.length} موديول</Badge>}
                    {p.includedTruckLimit != null && <Badge variant="outline" className="gap-1 font-normal num"><Truck className="h-3 w-3" />{p.includedTruckLimit} شاحنة</Badge>}
                    {p.commissionRateOverride != null && (
                      <Badge variant="secondary" className="gap-1 font-normal num">عمولة: {(p.commissionRateOverride * 100).toFixed(1)}%</Badge>
                    )}
                    <Badge variant="outline" className="gap-1 font-normal"><Users className="h-3 w-3" />{p._count?.companies ?? 0} مشترك</Badge>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setDelPlan(p); setReassignTo(''); }}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? 'تعديل الباقة' : 'إنشاء باقة'}</DialogTitle>
            <DialogDescription>اربط الباقة بملف سياسة، فعّل الموديولز، والسعر يُحسب تلقائياً.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5"><Label>الاسم</Label><Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="الباقة الاحترافية" /></div>
              <div className="space-y-1.5"><Label>الاسم (EN)</Label><Input dir="ltr" value={form.nameEn} onChange={(e) => set('nameEn', e.target.value)} placeholder="Professional" /></div>
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

            {/* ── Pricing (dynamic) ── */}
            <div className="rounded-lg border border-amber-200 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-950/20 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold flex items-center gap-1.5"><Coins className="h-4 w-4 text-amber-600" /> التسعير</span>
                <label className="flex items-center gap-2 text-sm cursor-pointer"><Switch checked={form.isFree} onCheckedChange={(v) => set('isFree', v)} /> باقة مجانية</label>
              </div>
              {!form.isFree && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5"><Label className="text-xs">السعر الأساسي (ر.س/شهر)</Label><Input type="number" dir="ltr" min={0} className="text-end" value={form.basePrice} onChange={(e) => set('basePrice', e.target.value)} placeholder="300" /></div>
                  <div className="space-y-1.5"><Label className="text-xs">خصم سنوي (%)</Label><Input type="number" dir="ltr" min={0} max={100} className="text-end" value={form.yearlyDiscountPct} onChange={(e) => set('yearlyDiscountPct', e.target.value)} placeholder="15" /></div>
                  <div className="space-y-1.5"><Label className="text-xs">عدد الشاحنات المشمول</Label><Input type="number" dir="ltr" min={0} className="text-end" value={form.includedTruckLimit} onChange={(e) => set('includedTruckLimit', e.target.value)} placeholder="بلا حد" /></div>
                  <div className="space-y-1.5"><Label className="text-xs">فترة تجريبية (أيام)</Label><Input type="number" dir="ltr" min={0} className="text-end" value={form.trialDays} onChange={(e) => set('trialDays', e.target.value)} placeholder="0" /></div>
                </div>
              )}
              {form.isFree && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5"><Label className="text-xs">عدد الشاحنات المشمول</Label><Input type="number" dir="ltr" min={0} className="text-end" value={form.includedTruckLimit} onChange={(e) => set('includedTruckLimit', e.target.value)} placeholder="بلا حد" /></div>
                </div>
              )}
            </div>

            {/* ── Modules (bundled capabilities, each adds to the price) ── */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-primary" /> الموديولز المضمّنة</Label>
              {audienceModules.length === 0 ? (
                <p className="text-xs text-muted-foreground">لا توجد موديولز لهذا الجمهور. أضفها من تبويب «موديولز الباقات».</p>
              ) : (
                <div className="rounded-lg border divide-y max-h-48 overflow-y-auto">
                  {audienceModules.map((m) => {
                    const on = form.moduleIds.includes(m.id);
                    return (
                      <label key={m.id} className="flex items-center justify-between gap-3 p-2.5 cursor-pointer hover:bg-muted/40">
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{m.name}</div>
                          {m.description && <div className="text-[11px] text-muted-foreground truncate">{m.description}</div>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs num text-muted-foreground">{m.price > 0 ? `+${nf(m.price)} ر.س` : 'مجاني'}</span>
                          <Switch checked={on} onCheckedChange={() => toggleModule(m.id)} />
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
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

            {/* ── Live price summary ── */}
            <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">السعر المحسوب</span>
              <div className="text-end">
                {form.isFree ? (
                  <span className="text-lg font-bold text-primary">مجانية</span>
                ) : (
                  <>
                    <div className="text-lg font-bold text-primary num">{nf(livePrice.monthly)} ر.س <span className="text-xs font-normal text-muted-foreground">/شهر</span></div>
                    <div className="text-[11px] text-muted-foreground num">
                      الأساسي {nf(Number(form.basePrice) || 0)} + موديولز {nf(livePrice.modulesTotal)}
                      {Number(form.yearlyDiscountPct) > 0 && <> · سنوياً {nf(livePrice.yearly)} ر.س</>}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={save} disabled={!form.name.trim() || !form.policyGroupId}>{editId ? 'حفظ' : 'إنشاء'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation — with subscriber transfer/detach when needed. */}
      <ConfirmDialog
        open={!!delPlan}
        onOpenChange={(v) => { if (!v) setDelPlan(null); }}
        title={`حذف «${delPlan?.name ?? ''}»`}
        description={subscriberCount > 0
          ? `لهذه الباقة ${subscriberCount} مشترك. اختر وجهتهم قبل الحذف.`
          : 'لا يمكن التراجع عن هذا الإجراء.'}
        confirmLabel="حذف الباقة"
        confirmDisabled={subscriberCount > 0 && !reassignTo}
        onConfirm={confirmDelete}
      >
        {subscriberCount > 0 && (
          <div className="space-y-2">
            <Label>وجهة المشتركين</Label>
            <Select value={reassignTo || undefined} onValueChange={setReassignTo}>
              <SelectTrigger><SelectValue placeholder="اختر…" /></SelectTrigger>
              <SelectContent>
                {reassignTargets.map((x) => (
                  <SelectItem key={x.id} value={x.id}>تحويل إلى: {x.name}{x.isFree ? ' (مجانية)' : ` (${(x.price?.monthly ?? 0).toLocaleString('en-US')} ر.س)`}</SelectItem>
                ))}
                <SelectItem value="__detach__">فصلهم (يعودون للباقة/السياسة الافتراضية)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </ConfirmDialog>
    </Card>
  );
}

function SlidersHorizontalMini() {
  return <span className="inline-block h-3 w-3 rounded-sm bg-primary/20" aria-hidden />;
}

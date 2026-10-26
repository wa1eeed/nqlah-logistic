'use client';
import { useState, type ReactNode } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import {
  Building2, Pencil, Plus, Trash2, Users, X,
  Store, Send, Gavel, Tag, Wallet, HandCoins, Lock, Eye, Route, Sparkles, Percent,
} from 'lucide-react';
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
import { usePolicyStore } from '@/stores/policy-store';
import { api, fetcher } from '@/lib/api';
import { notify } from '@/lib/notify';
import { COMPANIES, type ClientPolicy, type PolicyGroup } from '@naqla/shared-utils';

type Co = { id: string; nameAr: string };
type ApiCompany = { id: string; nameAr: string };

type ToggleDef = { key: keyof ClientPolicy; label: string; hint: string };

const ASSIGN_DEFAULTS = [
  { value: 'none',   label: 'بدون افتراضي (السوق)' },
  { value: 'MARKET', label: 'السوق المفتوح' },
  { value: 'DIRECT', label: 'إسناد مباشر' },
];
const PRICING_DEFAULTS = [
  { value: 'none',   label: 'بدون افتراضي' },
  { value: 'MARKET', label: 'عروض الناقلين' },
  { value: 'FIXED',  label: 'سعر ثابت' },
];
const COLLECTION_DEFAULTS = [
  { value: 'none',            label: 'بدون افتراضي (ضمان)' },
  { value: 'ESCROW',          label: 'ضمان (Escrow)' },
  { value: 'PREPAID_WALLET',  label: 'محفظة مسبقة الدفع' },
  { value: 'PREPAID_GATEWAY', label: 'بوابة دفع إلكترونية' },
  { value: 'COD',             label: 'الدفع عند التسليم' },
];
const COLLECTION_LABEL: Record<string, string> =
  Object.fromEntries(COLLECTION_DEFAULTS.filter((o) => o.value !== 'none').map((o) => [o.value, o.label]));

export function ClientPoliciesPanel() {
  // Live from the API (admin changes are shared server-side with clients); the
  // Zustand store is a fallback for offline/design runs.
  const { data: groupsData, error: groupsError } = useSWR<unknown>('/policies/groups', fetcher);
  const { data: clientsData } = useSWR<ApiCompany[]>('/companies?type=CLIENT&limit=100', fetcher);
  const { data: carriersData } = useSWR<ApiCompany[]>('/companies?type=CARRIER&limit=100', fetcher);
  const { data: carrierGroupsData } = useSWR<{ id: string; name: string }[]>('/policies/carrier-groups', fetcher);
  const carrierGroups = Array.isArray(carrierGroupsData) ? carrierGroupsData : [];
  const { mutate } = useSWRConfig();
  const apiMode = Array.isArray(groupsData);
  // Distinguish loading from a real failure so we don't flash the local fallback
  // groups while the request is in flight.
  const loading = groupsData === undefined && !groupsError;
  const offline = !apiMode && !!groupsError;

  const storeGroups = usePolicyStore((s) => s.groups);
  const addGroup = usePolicyStore((s) => s.addGroup);
  const removeGroup = usePolicyStore((s) => s.removeGroup);
  const renameGroup = usePolicyStore((s) => s.renameGroup);

  const groups: PolicyGroup[] = apiMode ? (groupsData as PolicyGroup[]) : (offline ? storeGroups : []);

  const clients: Co[] = Array.isArray(clientsData)
    ? clientsData.map((c) => ({ id: c.id, nameAr: c.nameAr }))
    : COMPANIES.filter((c) => c.kind === 'CLIENT').map((c) => ({ id: c.id, nameAr: c.nameAr }));
  const carriers: Co[] = Array.isArray(carriersData)
    ? carriersData.map((c) => ({ id: c.id, nameAr: c.nameAr }))
    : COMPANIES.filter((c) => c.kind === 'CARRIER').map((c) => ({ id: c.id, nameAr: c.nameAr }));
  const clientName = (id: string) => clients.find((c) => c.id === id)?.nameAr ?? id;

  const revalidate = () => mutate('/policies/groups');

  const doAdd = async (name: string, description?: string) => {
    if (apiMode) { try { await api.post('/policies/groups', { name, description }); revalidate(); } catch (e) { notify.error(e); } }
    else addGroup(name, description);
  };
  const doRename = async (id: string, name: string, description?: string) => {
    if (apiMode) { try { await api.put(`/policies/groups/${id}`, { name, description }); revalidate(); } catch (e) { notify.error(e); } }
    else renameGroup(id, name, description);
  };
  const doRemove = async (id: string) => {
    if (apiMode) { try { await api.delete(`/policies/groups/${id}`); revalidate(); } catch (e) { notify.error(e); } }
    else removeGroup(id);
  };
  const doSetPolicy = async (id: string, policy: ClientPolicy) => {
    if (apiMode) { try { await api.put(`/policies/groups/${id}`, { policy }); revalidate(); } catch (e) { notify.error(e); } }
    else usePolicyStore.getState().setGroupPolicy(id, policy);
  };
  const doAssign = async (clientId: string, groupId: string | null) => {
    if (apiMode) { try { await api.post('/policies/assign', { clientId, groupId }); revalidate(); } catch (e) { notify.error(e); } }
    else usePolicyStore.getState().setClientGroup(clientId, groupId);
  };

  const assigned = new Set(groups.flatMap((g) => g.clientIds));
  const defaultClients = clients.filter((c) => !assigned.has(c.id));

  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });

  const openCreate = () => { setEditId(null); setForm({ name: '', description: '' }); setCreateOpen(true); };
  const openEdit = (g: PolicyGroup) => { setEditId(g.id); setForm({ name: g.name, description: g.description ?? '' }); setCreateOpen(true); };

  const save = () => {
    if (!form.name.trim()) return;
    if (editId) {
      doRename(editId, form.name.trim(), form.description.trim() || undefined);
      notify.success('تم تحديث القروب', form.name);
    } else {
      doAdd(form.name.trim(), form.description.trim() || undefined);
      notify.success('تم إنشاء القروب', form.name);
    }
    setCreateOpen(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle>سياسات العملاء</CardTitle>
            <CardDescription className="mt-1">
              خصّص خيارات الإسناد والتسعير والدفع لكل قروب من العملاء. العملاء غير المخصّصين يستخدمون الإعدادات الافتراضية.
            </CardDescription>
          </div>
          <Button onClick={openCreate}><Plus className="h-4 w-4" /> إنشاء قروب تخصيص</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[0, 1].map((i) => <div key={i} className="h-40 rounded-lg border bg-muted/20 animate-pulse" />)}
          </div>
        ) : (
          <>
        {groups.length === 0 && (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            لا توجد قروبات تخصيص بعد. أنشئ قروبا لتخصيص خيارات مجموعة من العملاء.
          </div>
        )}
        {groups.map((g) => (
          <GroupCard
            key={g.id}
            group={g}
            clients={clients}
            carriers={carriers}
            carrierGroups={carrierGroups}
            clientName={clientName}
            onEdit={() => openEdit(g)}
            onDelete={() => { doRemove(g.id); notify.success('تم حذف القروب', g.name); }}
            onPolicyChange={(policy) => doSetPolicy(g.id, policy)}
            onAssign={(clientId, groupId) => doAssign(clientId, groupId)}
          />
        ))}

        {/* Default clients */}
        <div className="rounded-lg border border-dashed p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Users className="h-4 w-4" /> الإعدادات الافتراضية · {defaultClients.length} عميل
          </div>
          <p className="mb-2 text-xs text-muted-foreground">كل الخيارات مفعّلة. اربط أي عميل بقروب أعلاه لتخصيص سلوكه.</p>
          <div className="flex flex-wrap gap-1.5">
            {defaultClients.map((c) => (
              <Badge key={c.id} variant="secondary" className="gap-1"><Building2 className="h-3 w-3" />{c.nameAr}</Badge>
            ))}
            {defaultClients.length === 0 && <span className="text-xs text-muted-foreground">كل العملاء مخصّصون.</span>}
          </div>
        </div>
          </>
        )}
      </CardContent>

      {/* Create / rename dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? 'تعديل القروب' : 'إنشاء قروب تخصيص'}</DialogTitle>
            <DialogDescription>اسم ووصف القروب. تضبط خياراته وتربط عملاءه بعد الإنشاء.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>اسم القروب</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="مثال: عملاء متعاقدون" />
            </div>
            <div className="space-y-1.5">
              <Label>الوصف (اختياري)</Label>
              <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="وصف مختصر للسياسة" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>إلغاء</Button>
            <Button onClick={save} disabled={!form.name.trim()}>{editId ? 'حفظ' : 'إنشاء'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/** A toggle row inside a module section: label + hint + switch. */
function ToggleRow({ def, value, onChange }: { def: ToggleDef; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer">
      <span className="min-w-0">
        <span className="text-sm font-medium">{def.label}</span>
        <span className="block text-xs text-muted-foreground">{def.hint}</span>
      </span>
      <Switch checked={value} onCheckedChange={onChange} />
    </label>
  );
}

/** One visually-distinct module block (icon header + body). */
function ModuleSection({
  icon: Icon, title, desc, tone, children,
}: {
  icon: typeof Store; title: string; desc: string;
  tone: 'assign' | 'pricing' | 'collection' | 'visibility';
  children: ReactNode;
}) {
  const tones: Record<string, string> = {
    assign: 'border-s-sky-400 bg-sky-50/40 dark:bg-sky-950/20',
    pricing: 'border-s-amber-400 bg-amber-50/40 dark:bg-amber-950/20',
    collection: 'border-s-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20',
    visibility: 'border-s-violet-400 bg-violet-50/40 dark:bg-violet-950/20',
  };
  const iconTones: Record<string, string> = {
    assign: 'text-sky-600 dark:text-sky-400',
    pricing: 'text-amber-600 dark:text-amber-400',
    collection: 'text-emerald-600 dark:text-emerald-400',
    visibility: 'text-violet-600 dark:text-violet-400',
  };
  return (
    <div className={`rounded-lg border border-s-[3px] p-3.5 space-y-3 ${tones[tone]}`}>
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 shrink-0 ${iconTones[tone]}`} />
        <div className="min-w-0">
          <div className="text-sm font-semibold leading-tight">{title}</div>
          <div className="text-xs text-muted-foreground">{desc}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

/** A labelled default-selector row within a module section. */
function DefaultRow({
  label, value, options, onChange, disabled,
}: {
  label: string; value: string; options: { value: string; label: string }[];
  onChange: (v: string) => void; disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="h-8 w-[190px] shrink-0 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function GroupCard({
  group, clients, carriers, carrierGroups, clientName, onEdit, onDelete, onPolicyChange, onAssign,
}: {
  group: PolicyGroup;
  clients: Co[];
  carriers: Co[];
  carrierGroups: { id: string; name: string }[];
  clientName: (id: string) => string;
  onEdit: () => void;
  onDelete: () => void;
  onPolicyChange: (policy: ClientPolicy) => void;
  onAssign: (clientId: string, groupId: string | null) => void;
}) {
  const p = group.policy;
  const set = (patch: Partial<ClientPolicy>) => onPolicyChange({ ...p, ...patch });
  const toggle = (key: keyof ClientPolicy) => (val: boolean) => set({ [key]: val } as Partial<ClientPolicy>);
  const opt = (v: string | undefined) => v ?? 'none';
  const scope = p.visibilityScope ?? 'ALL';
  const unassigned = clients.filter((c) => !group.clientIds.includes(c.id));

  // Summary chips: the group's effective module defaults at a glance.
  const chips: { icon: typeof Store; label: string; locked?: boolean }[] = [
    { icon: p.defaultAssignment === 'DIRECT' ? Send : Store,
      label: p.defaultAssignment === 'DIRECT' ? 'افتراضي: مباشر' : 'افتراضي: السوق' },
    ...(p.defaultPricing ? [{ icon: p.defaultPricing === 'FIXED' ? Tag : Gavel,
      label: p.defaultPricing === 'FIXED' ? 'تسعير: ثابت' : 'تسعير: عروض' }] : []),
    { icon: p.defaultCollectionMethod === 'COD' ? HandCoins : Wallet,
      label: `تحصيل: ${COLLECTION_LABEL[p.defaultCollectionMethod ?? 'ESCROW'] ?? 'ضمان (Escrow)'}`,
      locked: p.enforceCollectionMethod },
    ...(scope !== 'ALL' ? [{ icon: Eye, label: scope === 'CARRIER' ? 'ظهور: مزوّد واحد' : 'ظهور: مجموعة' }] : []),
  ];

  return (
    <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
      {/* Header + at-a-glance module chips */}
      <div className="space-y-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-semibold">{group.name}</div>
            {group.description && <div className="text-xs text-muted-foreground mt-0.5">{group.description}</div>}
          </div>
          <div className="flex gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}><Pencil className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {chips.map((c, i) => (
            <Badge key={i} variant="secondary" className="gap-1 font-normal">
              <c.icon className="h-3 w-3" />{c.label}
              {c.locked && <Lock className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />}
            </Badge>
          ))}
        </div>
      </div>

      {/* Module sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Assignment */}
        <ModuleSection icon={Route} tone="assign" title="موديول الإسناد"
          desc="كيف يُسنَد الطلب: السوق المفتوح أو مزوّد محدد.">
          <div className="space-y-2.5">
            <ToggleRow def={{ key: 'allowMarket', label: 'النشر في السوق', hint: 'عرض الطلب لكل الناقلين' }}
              value={Boolean(p.allowMarket)} onChange={toggle('allowMarket')} />
            <ToggleRow def={{ key: 'allowDirect', label: 'الإسناد المباشر', hint: 'إرسال الطلب لناقل محدد' }}
              value={Boolean(p.allowDirect)} onChange={toggle('allowDirect')} />
          </div>
          <div className="border-t pt-2.5">
            <DefaultRow label="الوضع الافتراضي" value={opt(p.defaultAssignment)} options={ASSIGN_DEFAULTS}
              onChange={(v) => set({ defaultAssignment: v === 'none' ? undefined : (v as 'MARKET' | 'DIRECT') })} />
          </div>
        </ModuleSection>

        {/* Pricing */}
        <ModuleSection icon={Tag} tone="pricing" title="موديول التسعير"
          desc="كيف يُحدَّد السعر: عروض الناقلين أو سعر ثابت.">
          <div className="space-y-2.5">
            <ToggleRow def={{ key: 'allowMarketPricing', label: 'عروض الناقلين', hint: 'استقبال عروض أسعار' }}
              value={Boolean(p.allowMarketPricing)} onChange={toggle('allowMarketPricing')} />
            <ToggleRow def={{ key: 'allowFixedPricing', label: 'سعر ثابت', hint: 'العميل يحدد السعر' }}
              value={Boolean(p.allowFixedPricing)} onChange={toggle('allowFixedPricing')} />
          </div>
          <div className="border-t pt-2.5">
            <DefaultRow label="الوضع الافتراضي" value={opt(p.defaultPricing)} options={PRICING_DEFAULTS}
              onChange={(v) => set({ defaultPricing: v === 'none' ? undefined : (v as 'MARKET' | 'FIXED') })} />
          </div>
        </ModuleSection>

        {/* Collection — configured and optionally enforced by the admin */}
        <ModuleSection icon={Wallet} tone="collection" title="موديول التحصيل"
          desc="طريقة الدفع والتحصيل — يضبطها الأدمن لا العميل.">
          <div className="space-y-2.5">
            <ToggleRow def={{ key: 'allowPrepaid', label: 'دفع مسبق', hint: 'حجز في الضمان/المحفظة' }}
              value={Boolean(p.allowPrepaid)} onChange={toggle('allowPrepaid')} />
            <ToggleRow def={{ key: 'allowCOD', label: 'دفع عند التسليم', hint: 'الدفع عند الاستلام' }}
              value={Boolean(p.allowCOD)} onChange={toggle('allowCOD')} />
          </div>
          <div className="border-t pt-2.5 space-y-2.5">
            <DefaultRow label="طريقة التحصيل الافتراضية" value={opt(p.defaultCollectionMethod)} options={COLLECTION_DEFAULTS}
              onChange={(v) => set({ defaultCollectionMethod: v === 'none' ? undefined : (v as ClientPolicy['defaultCollectionMethod']) })} />
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span className="min-w-0 inline-flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-medium">فرض الطريقة على العميل</span>
              </span>
              <Switch checked={Boolean(p.enforceCollectionMethod)} onCheckedChange={(v) => set({ enforceCollectionMethod: v })} />
            </label>
          </div>
        </ModuleSection>

        {/* Provider visibility scope */}
        <ModuleSection icon={Eye} tone="visibility" title="نطاق ظهور المزوّدين"
          desc="أي المزوّدين يراهم عملاء هذا القروب ويتعاملون معهم.">
          <Select value={scope} onValueChange={(v) => set({ visibilityScope: v as 'ALL' | 'GROUP' | 'CARRIER' })}>
            <SelectTrigger className="h-8 w-full text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">كل المزوّدين (السوق المفتوح)</SelectItem>
              <SelectItem value="GROUP">مجموعة مزوّدين محددة</SelectItem>
              <SelectItem value="CARRIER">مزوّد واحد فقط</SelectItem>
            </SelectContent>
          </Select>
          {scope === 'CARRIER' && (
            <Select value={p.forcedCarrierId ?? 'none'} onValueChange={(v) => set({ forcedCarrierId: v === 'none' ? undefined : v })}>
              <SelectTrigger className="h-8 w-full text-xs"><SelectValue placeholder="اختر المزوّد" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— اختر المزوّد —</SelectItem>
                {carriers.map((c) => <SelectItem key={c.id} value={c.id}>{c.nameAr}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {scope === 'GROUP' && (
            <Select value={p.visibleCarrierGroupId ?? 'none'} onValueChange={(v) => set({ visibleCarrierGroupId: v === 'none' ? undefined : v })}>
              <SelectTrigger className="h-8 w-full text-xs"><SelectValue placeholder="اختر مجموعة المزوّدين" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— اختر المجموعة —</SelectItem>
                {carrierGroups.map((cg) => <SelectItem key={cg.id} value={cg.id}>{cg.name}</SelectItem>)}
                {carrierGroups.length === 0 && <SelectItem value="none" disabled>أنشئ مجموعة مزوّدين أولاً</SelectItem>}
              </SelectContent>
            </Select>
          )}
        </ModuleSection>
      </div>

      {/* Capability layer: features, limits + commission (Policy Engine) */}
      <FeaturesSection policy={p} onChange={(patch) => set(patch)} />

      {/* Assigned clients */}
      <div className="space-y-2 border-t pt-3">
        <div className="text-xs font-semibold text-muted-foreground">العملاء في هذا القروب</div>
        <div className="flex flex-wrap items-center gap-1.5">
          {group.clientIds.map((id) => (
            <Badge key={id} variant="outline" className="gap-1">
              <Building2 className="h-3 w-3" />{clientName(id)}
              <button type="button" onClick={() => onAssign(id, null)} className="ms-1 text-muted-foreground hover:text-destructive" aria-label="إزالة">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {group.clientIds.length === 0 && <span className="text-xs text-muted-foreground">لا يوجد عملاء بعد</span>}
        </div>
        {unassigned.length > 0 && (
          <Select value="" onValueChange={(v) => v && onAssign(v, group.id)}>
            <SelectTrigger className="w-full sm:w-[260px]"><SelectValue placeholder="+ ربط عميل بهذا القروب" /></SelectTrigger>
            <SelectContent>
              {unassigned.map((c) => <SelectItem key={c.id} value={c.id}>{c.nameAr}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  );
}

const FEATURE_DEFS: { key: string; label: string; hint: string }[] = [
  { key: 'consolidatedOrders', label: 'الطلبات المجمّعة', hint: 'إنشاء طلبات متعددة الشاحنات' },
  { key: 'perLegCarriers', label: 'ناقل/مزايدة لكل ساق', hint: 'سيقان متغايرة بناقلين مستقلين' },
  { key: 'liveTracking', label: 'التتبّع اللحظي', hint: 'تتبّع الشحنات على الخريطة' },
  { key: 'freelancerFleet', label: 'الأسطول المستقل', hint: 'للمزوّد — شاحنات فري‑لانسر' },
  { key: 'whiteLabel', label: 'الوايت ليبل', hint: 'للمزوّد — علامة تجارية خاصة' },
  { key: 'prioritySupport', label: 'دعم مميّز', hint: 'أولوية في تذاكر الدعم' },
];
const LIMIT_DEFS: { key: string; label: string }[] = [
  { key: 'maxActiveOrders', label: 'أقصى طلبات نشطة' },
  { key: 'maxFleetSize', label: 'أقصى حجم أسطول' },
  { key: 'maxTeamMembers', label: 'أقصى أعضاء الفريق' },
];

/** The capability layer of a profile: feature toggles + numeric limits + commission. */
function FeaturesSection({ policy, onChange }: { policy: ClientPolicy; onChange: (patch: Partial<ClientPolicy>) => void }) {
  const features = (policy.features ?? {}) as Record<string, boolean | number | undefined>;
  const setFeature = (key: string, val: boolean | number | undefined) => {
    const next = { ...features };
    if (val === undefined) delete next[key]; else next[key] = val;
    onChange({ features: next });
  };
  const ratePct = policy.commissionRate != null ? String(+(policy.commissionRate * 100).toFixed(2)) : '';
  return (
    <div className="rounded-lg border border-s-[3px] border-s-rose-400 bg-rose-50/40 dark:bg-rose-950/20 p-3.5 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
        <div className="min-w-0">
          <div className="text-sm font-semibold leading-tight">القدرات والعمولة</div>
          <div className="text-xs text-muted-foreground">فعّل/عطّل الميزات واضبط الحدود والعمولة — تمنحها الباقات لمشتركيها.</div>
        </div>
      </div>

      {/* Feature toggles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
        {FEATURE_DEFS.map((f) => (
          <label key={f.key} className="flex items-center justify-between gap-3 cursor-pointer">
            <span className="min-w-0">
              <span className="text-sm font-medium">{f.label}</span>
              <span className="block text-xs text-muted-foreground">{f.hint}</span>
            </span>
            {/* A feature is allowed unless explicitly false. */}
            <Switch checked={features[f.key] !== false} onCheckedChange={(v) => setFeature(f.key, v ? true : false)} />
          </label>
        ))}
      </div>

      {/* Limits */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 border-t pt-2.5">
        {LIMIT_DEFS.map((l) => (
          <div key={l.key} className="space-y-1">
            <Label className="text-xs">{l.label}</Label>
            <Input type="number" dir="ltr" min={0} className="h-8 text-end text-xs" placeholder="∞"
              value={typeof features[l.key] === 'number' ? String(features[l.key]) : ''}
              onChange={(e) => setFeature(l.key, e.target.value ? Number(e.target.value) : undefined)} />
          </div>
        ))}
      </div>

      {/* Commission */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 border-t pt-2.5">
        <div className="space-y-1">
          <Label className="text-xs inline-flex items-center gap-1"><Percent className="h-3 w-3" />نسبة العمولة</Label>
          <Input type="number" dir="ltr" min={0} max={100} step="0.1" className="h-8 text-end text-xs" placeholder="8"
            value={ratePct} onChange={(e) => onChange({ commissionRate: e.target.value ? Number(e.target.value) / 100 : undefined })} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">تُحتسب على</Label>
          <Select value={policy.commissionAppliesTo ?? 'none'} onValueChange={(v) => onChange({ commissionAppliesTo: v === 'none' ? undefined : (v as ClientPolicy['commissionAppliesTo']) })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">الافتراضي</SelectItem>
              <SelectItem value="CARRIER">المزوّد</SelectItem>
              <SelectItem value="CLIENT">العميل</SelectItem>
              <SelectItem value="BOTH">كلاهما</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <label className="flex items-center justify-between gap-2 cursor-pointer pt-5">
          <span className="text-xs font-medium">السعر شامل الضريبة</span>
          <Switch checked={Boolean(policy.priceVatInclusive)} onCheckedChange={(v) => onChange({ priceVatInclusive: v })} />
        </label>
      </div>
    </div>
  );
}

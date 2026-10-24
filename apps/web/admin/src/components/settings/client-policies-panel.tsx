'use client';
import { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { Building2, Pencil, Plus, Trash2, Users, X } from 'lucide-react';
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

const POLICY_KEYS: { key: keyof ClientPolicy; label: string; hint: string }[] = [
  { key: 'allowMarket',        label: 'النشر في السوق',   hint: 'عرض الطلب لكل الناقلين' },
  { key: 'allowDirect',        label: 'الإسناد المباشر',   hint: 'إرسال الطلب لناقل محدد' },
  { key: 'allowMarketPricing', label: 'عروض الناقلين',     hint: 'استقبال عروض أسعار' },
  { key: 'allowFixedPricing',  label: 'سعر ثابت',          hint: 'العميل يحدد السعر' },
  { key: 'allowPrepaid',       label: 'دفع مسبق',          hint: 'حجز في الضمان' },
  { key: 'allowCOD',           label: 'دفع عند التسليم',   hint: 'الدفع عند الاستلام' },
];

export function ClientPoliciesPanel() {
  // Live from the API (admin changes are shared server-side with clients); the
  // Zustand store is a fallback for offline/design runs.
  const { data: groupsData, error: groupsError } = useSWR<unknown>('/policies/groups', fetcher);
  const { data: clientsData } = useSWR<ApiCompany[]>('/companies?type=CLIENT&limit=200', fetcher);
  const { data: carriersData } = useSWR<ApiCompany[]>('/companies?type=CARRIER&status=ACTIVE&limit=200', fetcher);
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

function GroupCard({
  group, clients, carriers, clientName, onEdit, onDelete, onPolicyChange, onAssign,
}: {
  group: PolicyGroup;
  clients: Co[];
  carriers: Co[];
  clientName: (id: string) => string;
  onEdit: () => void;
  onDelete: () => void;
  onPolicyChange: (policy: ClientPolicy) => void;
  onAssign: (clientId: string, groupId: string | null) => void;
}) {
  const p = group.policy;
  const toggle = (key: keyof ClientPolicy, val: boolean) => onPolicyChange({ ...p, [key]: val });
  const setForcedCarrier = (id: string | undefined) => onPolicyChange({ ...p, forcedCarrierId: id });
  const unassigned = clients.filter((c) => !group.clientIds.includes(c.id));

  return (
    <div className="rounded-lg border p-4 space-y-4">
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

      {/* Policy toggles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
        {POLICY_KEYS.map(({ key, label, hint }) => (
          <label key={key} className="flex items-center justify-between gap-3 cursor-pointer">
            <span className="min-w-0">
              <span className="text-sm font-medium">{label}</span>
              <span className="block text-xs text-muted-foreground">{hint}</span>
            </span>
            <Switch checked={Boolean(p[key])} onCheckedChange={(v) => toggle(key, v)} />
          </label>
        ))}
      </div>

      {/* Forced carrier (only meaningful with direct assign) */}
      {p.allowDirect && (
        <div className="flex items-center justify-between gap-3 rounded-md bg-muted/40 p-3">
          <div className="text-sm">
            <div className="font-medium">مزوّد محدد للإسناد</div>
            <div className="text-xs text-muted-foreground">يُلزَم العميل بالإسناد المباشر لهذا المزوّد.</div>
          </div>
          <Select value={p.forcedCarrierId ?? 'none'} onValueChange={(v) => setForcedCarrier(v === 'none' ? undefined : v)}>
            <SelectTrigger className="w-[180px] shrink-0"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">بدون إلزام</SelectItem>
              {carriers.map((c) => <SelectItem key={c.id} value={c.id}>{c.nameAr}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Assigned clients */}
      <div className="space-y-2">
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

'use client';
import { useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { Pencil, Plus, Trash2, Truck, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api, fetcher } from '@/lib/api';
import { notify } from '@/lib/notify';
import { COMPANIES } from '@naqla/shared-utils';

type Co = { id: string; nameAr: string };
type CarrierGroup = { id: string; name: string; description?: string; carrierIds: string[] };

/**
 * Admin management of provider (carrier) groups — named sets of carriers used
 * by a client group's "provider visibility = GROUP" scope. API-backed
 * (`/policies/carrier-groups`); shows an empty state when the API is offline.
 */
export function CarrierGroupsPanel() {
  const { data } = useSWR<CarrierGroup[]>('/policies/carrier-groups', fetcher);
  const { data: carriersData } = useSWR<Co[]>('/companies?type=CARRIER&status=ACTIVE&limit=200', fetcher);
  const { mutate } = useSWRConfig();
  const groups: CarrierGroup[] = Array.isArray(data) ? data : [];
  const carriers: Co[] = Array.isArray(carriersData)
    ? carriersData.map((c) => ({ id: c.id, nameAr: c.nameAr }))
    : COMPANIES.filter((c) => c.kind === 'CARRIER').map((c) => ({ id: c.id, nameAr: c.nameAr }));
  const carrierName = (id: string) => carriers.find((c) => c.id === id)?.nameAr ?? id;
  const revalidate = () => mutate('/policies/carrier-groups');

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });

  const openCreate = () => { setEditId(null); setForm({ name: '', description: '' }); setOpen(true); };
  const openEdit = (g: CarrierGroup) => { setEditId(g.id); setForm({ name: g.name, description: g.description ?? '' }); setOpen(true); };

  const save = async () => {
    const name = form.name.trim();
    if (!name) return;
    const description = form.description.trim() || undefined;
    try {
      if (editId) { await api.put(`/policies/carrier-groups/${editId}`, { name, description }); notify.success('تم تحديث المجموعة', name); }
      else { await api.post('/policies/carrier-groups', { name, description }); notify.success('تم إنشاء المجموعة', name); }
      revalidate();
    } catch (e) { notify.error(e); }
    setOpen(false);
  };

  const remove = async (g: CarrierGroup) => {
    try { await api.delete(`/policies/carrier-groups/${g.id}`); notify.success('تم حذف المجموعة', g.name); revalidate(); }
    catch (e) { notify.error(e); }
  };

  const setMembers = async (g: CarrierGroup, carrierIds: string[]) => {
    try { await api.put(`/policies/carrier-groups/${g.id}`, { carrierIds }); revalidate(); }
    catch (e) { notify.error(e); }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle>مجموعات المزوّدين</CardTitle>
            <CardDescription className="mt-1">
              مجموعات مُسمّاة من المزوّدين، تُستخدم لتحديد مَن يراهم قروب عملاء عند ضبط «نطاق الظهور = مجموعة مزوّدين».
            </CardDescription>
          </div>
          <Button onClick={openCreate}><Plus className="h-4 w-4" /> إنشاء مجموعة مزوّدين</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {groups.length === 0 && (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            لا توجد مجموعات مزوّدين بعد. أنشئ مجموعة لتجميع عدد من المزوّدين.
          </div>
        )}
        {groups.map((g) => {
          const unassigned = carriers.filter((c) => !g.carrierIds.includes(c.id));
          return (
            <div key={g.id} className="rounded-lg border p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold">{g.name}</div>
                  {g.description && <div className="text-xs text-muted-foreground mt-0.5">{g.description}</div>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(g)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => remove(g)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground">المزوّدون في هذه المجموعة</div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {g.carrierIds.map((id) => (
                    <Badge key={id} variant="outline" className="gap-1">
                      <Truck className="h-3 w-3" />{carrierName(id)}
                      <button
                        type="button"
                        onClick={() => setMembers(g, g.carrierIds.filter((c) => c !== id))}
                        className="ms-1 text-muted-foreground hover:text-destructive"
                        aria-label="إزالة"
                      ><X className="h-3 w-3" /></button>
                    </Badge>
                  ))}
                  {g.carrierIds.length === 0 && <span className="text-xs text-muted-foreground">لا يوجد مزوّدون بعد</span>}
                </div>
                {unassigned.length > 0 && (
                  <Select value="" onValueChange={(v) => v && setMembers(g, [...g.carrierIds, v])}>
                    <SelectTrigger className="w-full sm:w-[260px]"><SelectValue placeholder="+ إضافة مزوّد للمجموعة" /></SelectTrigger>
                    <SelectContent>
                      {unassigned.map((c) => <SelectItem key={c.id} value={c.id}>{c.nameAr}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editId ? 'تعديل المجموعة' : 'إنشاء مجموعة مزوّدين'}</DialogTitle>
            <DialogDescription>اسم ووصف المجموعة. تضيف أعضاءها بعد الإنشاء.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>اسم المجموعة</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="مثال: مزوّدون معتمدون" />
            </div>
            <div className="space-y-1.5">
              <Label>الوصف (اختياري)</Label>
              <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="وصف مختصر" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button onClick={save} disabled={!form.name.trim()}>{editId ? 'حفظ' : 'إنشاء'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import useSWR from 'swr';
import {
  ArrowDownToLine, ArrowUpFromLine, Loader2, MapPin, Pencil, Phone, Plus, Star, Trash2,
} from 'lucide-react';
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
import { PageHeader } from '@/components/page-header';
import { useAuthStore } from '@/lib/auth-store';
import { fetcher, api } from '@/lib/api';
import { notify } from '@/lib/notify';
import { localizeCity } from '@naqla/shared-utils';

type AddressKind = 'PICKUP' | 'DESTINATION' | 'BOTH';

type SavedAddress = {
  id: string;
  companyId: string;
  label: string;
  city: string;
  region?: string | null;
  address: string;
  contactName?: string | null;
  contactPhone?: string | null;
  kind: AddressKind;
  isDefault: boolean;
};

const KIND_META: Record<AddressKind, { icon: React.ComponentType<{ className?: string }>; tone: string }> = {
  PICKUP:      { icon: ArrowUpFromLine,   tone: 'bg-info/15 text-info' },
  DESTINATION: { icon: ArrowDownToLine,   tone: 'bg-success/15 text-success' },
  BOTH:        { icon: MapPin,            tone: 'bg-primary/10 text-primary' },
};

const SAUDI_CITIES = [
  'الرياض', 'جدة', 'الدمام', 'الخبر', 'مكة المكرمة', 'المدينة المنورة',
  'الطائف', 'تبوك', 'حائل', 'بريدة', 'الجبيل', 'ينبع', 'أبها', 'نجران',
];

const blank = (): Omit<SavedAddress, 'id' | 'companyId'> => ({
  label: '', city: '', region: '', address: '', kind: 'BOTH',
  contactName: '', contactPhone: '', isDefault: false,
});

export default function AddressesPage() {
  const t = useTranslations('client');
  const kindLabel: Record<AddressKind, string> = {
    PICKUP: t('addresses.kindPickup'),
    DESTINATION: t('addresses.kindDestination'),
    BOTH: t('addresses.kindBoth'),
  };
  const companyId = useAuthStore((s) => s.user?.companyId);
  const { data: list, mutate, isLoading } = useSWR<SavedAddress[]>(
    companyId ? `/companies/${companyId}/addresses` : null,
    fetcher,
  );

  const [editing, setEditing] = useState<SavedAddress | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank());
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const openAdd = () => {
    setEditing(null);
    setForm(blank());
    setOpen(true);
  };

  const openEdit = (a: SavedAddress) => {
    setEditing(a);
    setForm({ label: a.label, city: a.city, region: a.region ?? '', address: a.address,
      kind: a.kind, contactName: a.contactName ?? '', contactPhone: a.contactPhone ?? '', isDefault: a.isDefault });
    setOpen(true);
  };

  const save = async () => {
    if (!companyId || !form.label || !form.city || !form.address || saving) return;
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/companies/${companyId}/addresses/${editing.id}`, form);
        notify.success(t('addresses.toastUpdated'));
      } else {
        await api.post(`/companies/${companyId}/addresses`, form);
        notify.success(t('addresses.toastAdded'));
      }
      await mutate();
      setOpen(false);
    } catch (err) {
      notify.error(err, t('addresses.toastSaveFail'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (a: SavedAddress) => {
    if (!companyId) return;
    setDeletingId(a.id);
    try {
      await api.delete(`/companies/${companyId}/addresses/${a.id}`);
      notify.success(t('addresses.toastDeleted'));
      await mutate();
    } catch (err) {
      notify.error(err, t('addresses.toastDeleteFail'));
    } finally {
      setDeletingId(null);
    }
  };

  const makeDefault = async (a: SavedAddress) => {
    if (!companyId) return;
    try {
      await api.post(`/companies/${companyId}/addresses/${a.id}/default`, {});
      notify.success(t('addresses.toastDefaultSet'));
      await mutate();
    } catch (err) {
      notify.error(err, t('addresses.toastDefaultFail'));
    }
  };

  return (
    <>
      <PageHeader
        title={t('addresses.title')}
        subtitle={t('addresses.subtitleFull')}
        actions={
          <Button onClick={openAdd} disabled={!companyId}>
            <Plus className="h-4 w-4" /> {t('addresses.addNew')}
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}><CardContent className="h-40 animate-pulse bg-muted/30" /></Card>
          ))}
        </div>
      ) : !list || list.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <MapPin className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
            <h3 className="font-semibold">{t('addresses.emptyTitle')}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t('addresses.emptyDesc')}</p>
            <Button onClick={openAdd} className="mt-4">
              <Plus className="h-4 w-4" /> {t('addresses.addFirst')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((a) => {
            const meta = KIND_META[a.kind];
            const Icon = meta.icon;
            return (
              <Card key={a.id} className={a.isDefault ? 'border-primary/40' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`h-9 w-9 rounded-lg grid place-items-center shrink-0 ${meta.tone}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-base truncate">{a.label}</CardTitle>
                        <div className="text-xs text-muted-foreground">{kindLabel[a.kind]}</div>
                      </div>
                    </div>
                    {a.isDefault && (
                      <Badge variant="default" className="shrink-0">
                        <Star className="h-3 w-3 me-1 fill-current" /> {t('addresses.default')}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="font-medium">{localizeCity(a.city)}</div>
                      <div className="text-xs text-muted-foreground leading-relaxed">{a.address}</div>
                    </div>
                  </div>
                  {(a.contactName || a.contactPhone) && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground border-t pt-2">
                      <Phone className="h-3.5 w-3.5" />
                      {a.contactName && <span className="font-medium">{a.contactName}</span>}
                      {a.contactPhone && <span className="num" dir="ltr">{a.contactPhone}</span>}
                    </div>
                  )}
                  <div className="flex items-center gap-1 pt-2 border-t">
                    {!a.isDefault && (
                      <Button size="sm" variant="ghost" onClick={() => makeDefault(a)}>
                        <Star className="h-3.5 w-3.5" /> {t('addresses.makeDefault')}
                      </Button>
                    )}
                    <div className="flex-1" />
                    <Button size="sm" variant="ghost" onClick={() => openEdit(a)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => remove(a)}
                      disabled={deletingId === a.id}
                    >
                      {deletingId === a.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Trash2 className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={(o) => !saving && setOpen(o)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? t('addresses.editTitle') : t('addresses.addTitle')}</DialogTitle>
            <DialogDescription>{t('addresses.dialogDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>{t('addresses.label')}</Label>
              <Input value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} placeholder={t('addresses.labelPlaceholder')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t('addresses.city')}</Label>
                <Select value={form.city} onValueChange={(v) => setForm((f) => ({ ...f, city: v }))}>
                  <SelectTrigger><SelectValue placeholder={t('addresses.selectCity')} /></SelectTrigger>
                  <SelectContent>
                    {SAUDI_CITIES.map((c) => <SelectItem key={c} value={c}>{localizeCity(c)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('addresses.kind')}</Label>
                <Select value={form.kind} onValueChange={(v) => setForm((f) => ({ ...f, kind: v as AddressKind }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BOTH">{t('addresses.kindBothLong')}</SelectItem>
                    <SelectItem value="PICKUP">{t('addresses.kindPickupOnly')}</SelectItem>
                    <SelectItem value="DESTINATION">{t('addresses.kindDestinationOnly')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('addresses.fieldAddress')}</Label>
              <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder={t('addresses.addressPlaceholder')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t('addresses.fieldContactName')}</Label>
                <Input value={form.contactName ?? ''} onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))} placeholder={t('addresses.contactNamePlaceholder')} />
              </div>
              <div className="space-y-2">
                <Label>{t('addresses.fieldPhone')}</Label>
                <Input dir="ltr" value={form.contactPhone ?? ''} onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))} placeholder="+966 5XX XXX XXXX" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>{t('addresses.cancel')}</Button>
            <Button onClick={save} disabled={saving || !form.label || !form.city || !form.address}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? t('addresses.saveChanges') : t('addresses.add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

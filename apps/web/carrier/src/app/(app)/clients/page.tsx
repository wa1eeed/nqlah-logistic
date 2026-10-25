'use client';
import { useState } from 'react';
import useSWR from 'swr';
import { useTranslations } from 'next-intl';
import { Building2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { api, fetcher } from '@/lib/api';
import { notify } from '@/lib/notify';
import { formatDate, localizeCity } from '@naqla/shared-utils';

type OwnedClient = {
  id: string; nameAr: string; nameEn: string | null; city: string; region: string;
  createdAt: string; _count?: { ordersAsClient: number };
};
const BLANK = {
  companyNameAr: '', city: '', region: '', contactPhone: '', contactEmail: '',
  firstName: '', lastName: '', phone: '', password: '',
};

export default function CarrierClientsPage() {
  const t = useTranslations('carrier');
  const { data, mutate } = useSWR<OwnedClient[]>('/carrier/clients', fetcher);
  const clients = Array.isArray(data) ? data : [];
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...BLANK });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof BLANK, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const valid = form.companyNameAr.trim() && form.city.trim() && form.region.trim()
    && form.contactPhone.trim() && form.firstName.trim() && form.lastName.trim()
    && form.phone.trim() && form.password.length >= 8;

  const save = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      await api.post('/carrier/clients', {
        companyNameAr: form.companyNameAr.trim(),
        city: form.city.trim(),
        region: form.region.trim(),
        contactPhone: form.contactPhone.trim(),
        ...(form.contactEmail.trim() ? { contactEmail: form.contactEmail.trim() } : {}),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim(),
        password: form.password,
      });
      notify.success(t('clientsPage.created'));
      setForm({ ...BLANK });
      setOpen(false);
      await mutate();
    } catch (e) { notify.error(e); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('clientsPage.title')}
        subtitle={t('clientsPage.subtitle')}
        actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> {t('clientsPage.register')}</Button>}
      />

      <Card>
        <CardContent className="p-0">
          {clients.length === 0 ? (
            <EmptyState icon={Building2} title={t('clientsPage.empty')} />
          ) : (
            <>
              {/* Mobile cards */}
              <div className="md:hidden divide-y">
                {clients.map((c) => (
                  <div key={c.id} className="p-4">
                    <div className="font-medium">{c.nameAr}</div>
                    <div className="text-xs text-muted-foreground">{localizeCity(c.city)}</div>
                    <div className="mt-1 flex items-center justify-between text-xs">
                      <span className="num text-muted-foreground">{formatDate(c.createdAt)}</span>
                      <span className="num">{c._count?.ordersAsClient ?? 0} {t('clientsPage.ordersUnit')}</span>
                    </div>
                  </div>
                ))}
              </div>
              {/* Desktop table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('clientsPage.colName')}</TableHead>
                      <TableHead>{t('clientsPage.colCity')}</TableHead>
                      <TableHead className="text-center">{t('clientsPage.colOrders')}</TableHead>
                      <TableHead>{t('clientsPage.colCreated')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.nameAr}</TableCell>
                        <TableCell>{localizeCity(c.city)}</TableCell>
                        <TableCell className="text-center num">{c._count?.ordersAsClient ?? 0}</TableCell>
                        <TableCell className="num text-muted-foreground">{formatDate(c.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('clientsPage.dialogTitle')}</DialogTitle>
            <DialogDescription>{t('clientsPage.dialogDesc')}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
            <Field label={t('clientsPage.companyName')} value={form.companyNameAr} onChange={(v) => set('companyNameAr', v)} className="sm:col-span-2" />
            <Field label={t('clientsPage.city')} value={form.city} onChange={(v) => set('city', v)} />
            <Field label={t('clientsPage.region')} value={form.region} onChange={(v) => set('region', v)} />
            <Field label={t('clientsPage.contactPhone')} value={form.contactPhone} onChange={(v) => set('contactPhone', v)} />
            <Field label={t('clientsPage.contactEmail')} value={form.contactEmail} onChange={(v) => set('contactEmail', v)} />
            <Field label={t('clientsPage.firstName')} value={form.firstName} onChange={(v) => set('firstName', v)} />
            <Field label={t('clientsPage.lastName')} value={form.lastName} onChange={(v) => set('lastName', v)} />
            <Field label={t('clientsPage.loginPhone')} value={form.phone} onChange={(v) => set('phone', v)} />
            <Field label={t('clientsPage.password')} value={form.password} onChange={(v) => set('password', v)} type="password" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t('clientsPage.cancel')}</Button>
            <Button onClick={save} disabled={!valid || saving}>{t('clientsPage.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, value, onChange, type, className }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ''}`}>
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

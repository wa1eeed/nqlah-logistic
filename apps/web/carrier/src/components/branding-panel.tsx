'use client';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { api, fetcher } from '@/lib/api';
import { notify } from '@/lib/notify';

type Branding = {
  whiteLabelEnabled: boolean;
  brandName: string | null;
  brandLogo: string | null;
  brandColor: string | null;
};

/** Carrier white-label branding settings (enabled by an admin subscription). */
export function BrandingPanel() {
  const t = useTranslations('settings');
  const { data, mutate } = useSWR<Branding>('/carrier/branding', fetcher);
  const [form, setForm] = useState({ brandName: '', brandLogo: '', brandColor: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setForm({ brandName: data.brandName ?? '', brandLogo: data.brandLogo ?? '', brandColor: data.brandColor ?? '' });
  }, [data]);

  const enabled = !!data?.whiteLabelEnabled;

  const save = async () => {
    setSaving(true);
    try {
      await api.patch('/carrier/branding', form);
      notify.success(t('branding.saved'));
      await mutate();
    } catch (e) { notify.error(e); }
    finally { setSaving(false); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('branding.title')}</CardTitle>
        <CardDescription>{t('branding.desc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!enabled ? (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            {t('branding.disabled')}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{t('branding.brandName')}</Label>
                <Input value={form.brandName} onChange={(e) => setForm((f) => ({ ...f, brandName: e.target.value }))} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>{t('branding.brandLogo')}</Label>
                <Input value={form.brandLogo} onChange={(e) => setForm((f) => ({ ...f, brandLogo: e.target.value }))} placeholder="https://…" />
              </div>
              <div className="space-y-1.5">
                <Label>{t('branding.brandColor')}</Label>
                <div className="flex items-center gap-2">
                  <Input value={form.brandColor} onChange={(e) => setForm((f) => ({ ...f, brandColor: e.target.value }))} placeholder="#0F766E" />
                  <span className="h-9 w-9 shrink-0 rounded-md border" style={{ background: form.brandColor || 'transparent' }} />
                </div>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={save} disabled={saving}>{t('branding.save')}</Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

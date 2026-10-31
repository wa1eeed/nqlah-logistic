'use client';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import useSWR from 'swr';
import { Image as ImageIcon, Link as LinkIcon, Loader2, RotateCcw, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, fetcher } from '@/lib/api';
import { notify } from '@/lib/notify';

const MAX_BYTES = 2 * 1024 * 1024; // 2MB
const ACCEPTED = ['image/png', 'image/svg+xml', 'image/jpeg', 'image/webp'];

interface Branding { logoUrl: string; logoUrlDark: string; nameAr: string; nameEn: string }

/** Upload a file through the presigned-PUT flow and return its public URL. */
async function uploadBranding(file: File): Promise<string> {
  const presign = (await api.post('/uploads/presign', {
    filename: file.name,
    contentType: file.type,
    folder: 'branding',
    sizeBytes: file.size,
  })).data.data as { uploadUrl: string; publicUrl: string | null; key: string };
  await fetch(presign.uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });
  if (!presign.publicUrl) throw new Error('STORAGE_NO_PUBLIC_URL');
  return presign.publicUrl;
}

/** A single logo slot (light or dark): preview + upload + paste-URL + remove. */
function LogoSlot({
  label, hint, value, dark, onSave,
}: {
  label: string;
  hint: string;
  value: string;
  dark?: boolean;
  onSave: (url: string) => Promise<void>;
}) {
  const [urlDraft, setUrlDraft] = useState(value);
  const [mode, setMode] = useState<'upload' | 'url'>('upload');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setUrlDraft(value); }, [value]);

  const save = async (url: string) => {
    setBusy(true);
    setError(null);
    try { await onSave(url); } finally { setBusy(false); }
  };

  const onFile = async (file: File) => {
    setError(null);
    if (!ACCEPTED.includes(file.type)) { setError('صيغة غير مدعومة — استخدم PNG أو SVG أو JPG أو WebP.'); return; }
    if (file.size > MAX_BYTES) { setError('حجم الملف كبير — الحد الأقصى 2 ميجابايت.'); return; }
    setBusy(true);
    try {
      const url = await uploadBranding(file);
      await onSave(url);
    } catch (err) {
      notify.error(err, 'تعذّر رفع الشعار. تأكد من إعداد التخزين أو استخدم رابطاً.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">{label}</div>
          <div className="text-xs text-muted-foreground">{hint}</div>
        </div>
        {value && (
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive"
            onClick={() => save('')} disabled={busy}>
            <Trash2 className="h-4 w-4" /> إزالة
          </Button>
        )}
      </div>

      {/* Preview on the matching background */}
      <div className={`flex h-20 items-center justify-center rounded-md border ${dark ? 'bg-[#0A2A28]' : 'bg-white'}`}>
        {value
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={value} alt={label} className="max-h-14 max-w-[70%] object-contain" />
          : <span className={`text-xs ${dark ? 'text-white/50' : 'text-muted-foreground'}`}>لا يوجد شعار</span>}
      </div>

      <div className="flex items-center gap-2">
        <Button type="button" size="sm" variant={mode === 'upload' ? 'default' : 'outline'} onClick={() => setMode('upload')}>
          <Upload className="h-4 w-4" /> رفع
        </Button>
        <Button type="button" size="sm" variant={mode === 'url' ? 'default' : 'outline'} onClick={() => setMode('url')}>
          <LinkIcon className="h-4 w-4" /> رابط
        </Button>
        {busy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {mode === 'upload' ? (
        <>
          <input ref={fileRef} type="file" accept={ACCEPTED.join(',')} className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={busy}
            className="w-full rounded-lg border-2 border-dashed p-6 text-center transition-colors hover:bg-muted/40 disabled:opacity-50">
            <ImageIcon className="mx-auto mb-2 h-7 w-7 text-muted-foreground" />
            <div className="text-sm font-medium">اختر صورة من جهازك</div>
            <div className="mt-1 text-xs text-muted-foreground">PNG مفضّل (شفاف) · SVG/JPG/WebP · حتى 2MB</div>
          </button>
        </>
      ) : (
        <div className="flex items-center gap-2">
          <Input dir="ltr" value={urlDraft} onChange={(e) => setUrlDraft(e.target.value)}
            placeholder="https://example.com/logo.png" />
          <Button onClick={() => save(urlDraft.trim())} disabled={busy || !urlDraft.trim() || urlDraft === value}>
            حفظ
          </Button>
        </div>
      )}

      {error && <div className="text-sm text-destructive">{error}</div>}
    </div>
  );
}

/**
 * Branding panel: platform logo (light + dark variants) and display name in
 * both languages. Logos upload through the presigned-PUT storage flow (or a
 * pasted URL) and persist to platform settings; the whole platform (web
 * portals, mobile app, invoice PDF) reads them from `GET /settings/platform`.
 */
export function BrandingPanel() {
  const t = useTranslations('admin');
  const { data, mutate } = useSWR<Branding>('/settings/platform', fetcher);

  const nameAr = data?.nameAr ?? 'نقلة لوجيستك';
  const nameEn = data?.nameEn ?? 'Naqla Logistics';
  const [arDraft, setArDraft] = useState(nameAr);
  const [enDraft, setEnDraft] = useState(nameEn);
  const [savingNames, setSavingNames] = useState(false);

  useEffect(() => { setArDraft(nameAr); setEnDraft(nameEn); }, [nameAr, nameEn]);

  const saveSetting = async (key: string, value: string) => {
    try {
      await api.put('/admin/settings', { settings: [{ key, value }] });
      await mutate();
      notify.success('تم الحفظ');
    } catch (err) {
      notify.error(err, 'فشل الحفظ في قاعدة البيانات');
      throw err;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('branding.title')}</CardTitle>
        <CardDescription>{t('branding.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="max-w-3xl space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <LogoSlot
            label="الشعار (الوضع الفاتح)"
            hint="يظهر على الخلفيات الفاتحة في الويب والتطبيق والفاتورة"
            value={data?.logoUrl ?? ''}
            onSave={(url) => saveSetting('platform.logoUrl', url)}
          />
          <LogoSlot
            label="شعار الوضع الداكن"
            hint="يظهر على الخلفيات الداكنة (ويُستخدم في ترويسة الفاتورة)"
            value={data?.logoUrlDark ?? ''}
            dark
            onSave={(url) => saveSetting('platform.logoUrlDark', url)}
          />
        </div>

        {/* Name fields */}
        <div className="space-y-4 border-t pt-4">
          <div className="space-y-2">
            <Label htmlFor="brand-name-ar">{t('branding.nameAr')}</Label>
            <Input id="brand-name-ar" value={arDraft} onChange={(e) => setArDraft(e.target.value)} placeholder="نقلة لوجيستك" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="brand-name-en">{t('branding.nameEn')}</Label>
            <Input id="brand-name-en" dir="ltr" value={enDraft} onChange={(e) => setEnDraft(e.target.value)} placeholder="Naqla Logistics" />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <Button
              disabled={savingNames || (arDraft === nameAr && enDraft === nameEn)}
              onClick={async () => {
                setSavingNames(true);
                try {
                  await api.put('/admin/settings', {
                    settings: [
                      { key: 'platform.nameAr', value: arDraft.trim() || nameAr },
                      { key: 'platform.nameEn', value: enDraft.trim() || nameEn },
                    ],
                  });
                  await mutate();
                  notify.success('تم حفظ الاسم');
                } catch (err) { notify.error(err, 'فشل حفظ الاسم'); }
                finally { setSavingNames(false); }
              }}
            >
              {savingNames && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('branding.saveNames')}
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                if (!confirm(t('branding.confirmReset'))) return;
                try {
                  await api.put('/admin/settings', {
                    settings: [
                      { key: 'platform.logoUrl', value: '' },
                      { key: 'platform.logoUrlDark', value: '' },
                      { key: 'platform.nameAr', value: 'نقلة لوجيستك' },
                      { key: 'platform.nameEn', value: 'Naqla Logistics' },
                    ],
                  });
                  await mutate();
                  notify.success('تمت الاستعادة للافتراضي');
                } catch (err) { notify.error(err, 'فشل الاستعادة'); }
              }}
            >
              <RotateCcw className="h-4 w-4" />
              {t('branding.resetDefaults')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

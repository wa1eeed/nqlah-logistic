'use client';
import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import useSWR from 'swr';
import {
  Apple, ArrowDown, ArrowUp, Image as ImageIcon, Loader2, Plus, Smartphone, Trash2, Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { api, fetcher } from '@/lib/api';
import { notify } from '@/lib/notify';
import { useConfirm } from '@/components/confirm';

// ─── Config shape (mirrors GET /settings/app) ─────────────────────────
interface OnboardingSlide {
  id: string;
  imageUrl: string;
  titleAr: string; titleEn: string;
  bodyAr: string; bodyEn: string;
}
interface AppConfig {
  splash: { backgroundColor: string; useLogo: boolean; logoVariant: 'light' | 'dark'; taglineAr: string; taglineEn: string };
  onboarding: { enabled: boolean; showOnce: boolean; slides: OnboardingSlide[] };
  versions: { iosLive: string; iosTestFlight: string; androidLive: string; androidTestFlight: string };
  update: { minSupportedVersion: string; forceUpdate: boolean; messageAr: string; messageEn: string };
}

const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
const MAX_BYTES = 3 * 1024 * 1024; // 3MB

/** Upload an onboarding image through the presigned-PUT flow; returns public URL. */
async function uploadImage(file: File): Promise<string> {
  const presign = (await api.post('/uploads/presign', {
    filename: file.name,
    contentType: file.type,
    folder: 'app-onboarding',
    sizeBytes: file.size,
  })).data.data as { uploadUrl: string; publicUrl: string | null };
  await fetch(presign.uploadUrl, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
  if (!presign.publicUrl) throw new Error('STORAGE_NO_PUBLIC_URL');
  return presign.publicUrl;
}

/**
 * App Settings panel — controls the iOS & Android mobile apps: store version
 * overview, splash screen, onboarding slides and force-update policy. All
 * sections persist to the platform key/value store via PUT /settings/app and
 * are consumed by the apps through the public GET /settings/app.
 */
export function AppSettingsPanel() {
  const { data, mutate, isLoading } = useSWR<AppConfig>('/settings/app', fetcher);

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <VersionOverviewCard config={data} mutate={mutate} />
      <SplashCard config={data} mutate={mutate} />
      <OnboardingCard config={data} mutate={mutate} />
      <UpdatePolicyCard config={data} mutate={mutate} />
    </div>
  );
}

type SectionProps = { config: AppConfig; mutate: () => Promise<unknown> };

// ─── Version overview ─────────────────────────────────────────────────
function VersionOverviewCard({ config, mutate }: SectionProps) {
  const t = useTranslations('admin');
  const [v, setV] = useState(config.versions);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setV(config.versions); }, [config.versions]);

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/settings/app', { versions: v });
      await mutate();
      notify.success(t('settings.appSettings.overview.saved'));
    } catch (err) { notify.error(err, t('settings.appSettings.saveFailed')); }
    finally { setSaving(false); }
  };

  const field = (key: keyof AppConfig['versions'], label: string) => (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input dir="ltr" value={v[key]} placeholder={t('settings.appSettings.overview.placeholder')}
        onChange={(e) => setV({ ...v, [key]: e.target.value })} />
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.appSettings.overview.title')}</CardTitle>
        <CardDescription>{t('settings.appSettings.overview.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center gap-2 font-medium"><Apple className="h-4 w-4" /> {t('settings.appSettings.overview.ios')}</div>
            {field('iosLive', t('settings.appSettings.overview.live'))}
            {field('iosTestFlight', t('settings.appSettings.overview.testFlight'))}
          </div>
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center gap-2 font-medium"><Smartphone className="h-4 w-4" /> {t('settings.appSettings.overview.android')}</div>
            {field('androidLive', t('settings.appSettings.overview.live'))}
            {field('androidTestFlight', t('settings.appSettings.overview.testFlight'))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{t('settings.appSettings.overview.autoNote')}</p>
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {t('settings.appSettings.overview.save')}
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Splash ───────────────────────────────────────────────────────────
function SplashCard({ config, mutate }: SectionProps) {
  const t = useTranslations('admin');
  const [s, setS] = useState(config.splash);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setS(config.splash); }, [config.splash]);

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/settings/app', { splash: s });
      await mutate();
      notify.success(t('settings.appSettings.splash.saved'));
    } catch (err) { notify.error(err, t('settings.appSettings.saveFailed')); }
    finally { setSaving(false); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.appSettings.splash.title')}</CardTitle>
        <CardDescription>{t('settings.appSettings.splash.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 max-w-2xl">
        <div className="space-y-2">
          <Label>{t('settings.appSettings.splash.bgColor')}</Label>
          <div className="flex items-center gap-2">
            <input type="color" value={s.backgroundColor}
              onChange={(e) => setS({ ...s, backgroundColor: e.target.value })}
              className="h-9 w-12 cursor-pointer rounded border bg-transparent p-0.5" />
            <Input dir="ltr" value={s.backgroundColor} className="max-w-[160px]"
              onChange={(e) => setS({ ...s, backgroundColor: e.target.value })} />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <Label htmlFor="splash-logo" className="cursor-pointer">{t('settings.appSettings.splash.useLogo')}</Label>
          <Switch id="splash-logo" checked={s.useLogo} onCheckedChange={(c) => setS({ ...s, useLogo: c })} />
        </div>

        {s.useLogo && (
          <div className="space-y-2">
            <Label>{t('settings.appSettings.splash.logoVariant')}</Label>
            <Select value={s.logoVariant} onValueChange={(val) => setS({ ...s, logoVariant: val as 'light' | 'dark' })}>
              <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="light">{t('settings.appSettings.splash.light')}</SelectItem>
                <SelectItem value="dark">{t('settings.appSettings.splash.dark')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label>{t('settings.appSettings.splash.taglineAr')}</Label>
          <Input value={s.taglineAr} onChange={(e) => setS({ ...s, taglineAr: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>{t('settings.appSettings.splash.taglineEn')}</Label>
          <Input dir="ltr" value={s.taglineEn} onChange={(e) => setS({ ...s, taglineEn: e.target.value })} />
        </div>

        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {t('settings.appSettings.splash.save')}
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Onboarding ───────────────────────────────────────────────────────
function OnboardingCard({ config, mutate }: SectionProps) {
  const t = useTranslations('admin');
  const confirm = useConfirm();
  const [enabled, setEnabled] = useState(config.onboarding.enabled);
  const [showOnce, setShowOnce] = useState(config.onboarding.showOnce);
  const [slides, setSlides] = useState<OnboardingSlide[]>(config.onboarding.slides);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEnabled(config.onboarding.enabled);
    setShowOnce(config.onboarding.showOnce);
    setSlides(config.onboarding.slides);
  }, [config.onboarding]);

  const addSlide = () => setSlides([...slides, {
    id: (globalThis.crypto?.randomUUID?.() ?? `s_${Date.now()}`),
    imageUrl: '', titleAr: '', titleEn: '', bodyAr: '', bodyEn: '',
  }]);

  const patchSlide = (id: string, patch: Partial<OnboardingSlide>) =>
    setSlides(slides.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const move = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= slides.length) return;
    const next = [...slides];
    [next[idx], next[j]] = [next[j], next[idx]];
    setSlides(next);
  };

  const removeSlide = async (id: string) => {
    const ok = await confirm({
      title: t('settings.appSettings.onboarding.removeConfirmTitle'),
      description: t('settings.appSettings.onboarding.removeConfirmBody'),
      destructive: true,
    });
    if (ok) setSlides(slides.filter((s) => s.id !== id));
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/settings/app', { onboarding: { enabled, showOnce, slides } });
      await mutate();
      notify.success(t('settings.appSettings.onboarding.saved'));
    } catch (err) { notify.error(err, t('settings.appSettings.saveFailed')); }
    finally { setSaving(false); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.appSettings.onboarding.title')}</CardTitle>
        <CardDescription>{t('settings.appSettings.onboarding.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <Label htmlFor="ob-enabled" className="cursor-pointer">{t('settings.appSettings.onboarding.enabled')}</Label>
          <Switch id="ob-enabled" checked={enabled} onCheckedChange={setEnabled} />
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <Label htmlFor="ob-once" className="cursor-pointer">{t('settings.appSettings.onboarding.showOnce')}</Label>
            <p className="text-xs text-muted-foreground mt-0.5">{t('settings.appSettings.onboarding.showOnceHint')}</p>
          </div>
          <Switch id="ob-once" checked={showOnce} onCheckedChange={setShowOnce} />
        </div>

        {slides.length === 0 ? (
          <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
            {t('settings.appSettings.onboarding.noSlides')}
          </div>
        ) : (
          <div className="space-y-4">
            {slides.map((slide, idx) => (
              <SlideEditor
                key={slide.id}
                slide={slide}
                index={idx}
                total={slides.length}
                onPatch={(patch) => patchSlide(slide.id, patch)}
                onMove={(dir) => move(idx, dir)}
                onRemove={() => removeSlide(slide.id)}
              />
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Button variant="outline" onClick={addSlide}>
            <Plus className="h-4 w-4" /> {t('settings.appSettings.onboarding.addSlide')}
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('settings.appSettings.onboarding.save')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SlideEditor({
  slide, index, total, onPatch, onMove, onRemove,
}: {
  slide: OnboardingSlide;
  index: number;
  total: number;
  onPatch: (patch: Partial<OnboardingSlide>) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  const t = useTranslations('admin');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = async (file: File) => {
    setError(null);
    if (!ACCEPTED.includes(file.type)) { setError('PNG / JPG / WebP / SVG'); return; }
    if (file.size > MAX_BYTES) { setError('≤ 3MB'); return; }
    setBusy(true);
    try {
      const url = await uploadImage(file);
      onPatch({ imageUrl: url });
    } catch (err) {
      notify.error(err, t('settings.appSettings.saveFailed'));
    } finally { setBusy(false); }
  };

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">{t('settings.appSettings.onboarding.slide')} {index + 1}</div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" disabled={index === 0} onClick={() => onMove(-1)}
            title={t('settings.appSettings.onboarding.moveUp')}>
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" disabled={index === total - 1} onClick={() => onMove(1)}
            title={t('settings.appSettings.onboarding.moveDown')}>
            <ArrowDown className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive"
            onClick={onRemove} title={t('settings.appSettings.onboarding.remove')}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
        {/* Image */}
        <div className="space-y-2">
          <div className="flex h-28 items-center justify-center overflow-hidden rounded-md border bg-muted/30">
            {slide.imageUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={slide.imageUrl} alt="" className="max-h-full max-w-full object-contain" />
              : <ImageIcon className="h-8 w-8 text-muted-foreground" />}
          </div>
          <input ref={fileRef} type="file" accept={ACCEPTED.join(',')} className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
          <Button size="sm" variant="outline" className="w-full" disabled={busy} onClick={() => fileRef.current?.click()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {t('settings.appSettings.onboarding.uploadImage')}
          </Button>
          <Input dir="ltr" value={slide.imageUrl} placeholder={t('settings.appSettings.onboarding.imageUrlPlaceholder')}
            className="text-xs" onChange={(e) => onPatch({ imageUrl: e.target.value })} />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        {/* Texts */}
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">{t('settings.appSettings.onboarding.titleAr')}</Label>
              <Input value={slide.titleAr} onChange={(e) => onPatch({ titleAr: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t('settings.appSettings.onboarding.titleEn')}</Label>
              <Input dir="ltr" value={slide.titleEn} onChange={(e) => onPatch({ titleEn: e.target.value })} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">{t('settings.appSettings.onboarding.bodyAr')}</Label>
              <Textarea rows={2} value={slide.bodyAr} onChange={(e) => onPatch({ bodyAr: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t('settings.appSettings.onboarding.bodyEn')}</Label>
              <Textarea rows={2} dir="ltr" value={slide.bodyEn} onChange={(e) => onPatch({ bodyEn: e.target.value })} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Force update / min version ───────────────────────────────────────
function UpdatePolicyCard({ config, mutate }: SectionProps) {
  const t = useTranslations('admin');
  const [u, setU] = useState(config.update);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setU(config.update); }, [config.update]);

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/settings/app', { update: u });
      await mutate();
      notify.success(t('settings.appSettings.update.saved'));
    } catch (err) { notify.error(err, t('settings.appSettings.saveFailed')); }
    finally { setSaving(false); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.appSettings.update.title')}</CardTitle>
        <CardDescription>{t('settings.appSettings.update.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 max-w-2xl">
        <div className="space-y-2">
          <Label>{t('settings.appSettings.update.minVersion')}</Label>
          <Input dir="ltr" className="max-w-[200px]" value={u.minSupportedVersion}
            placeholder="1.0.0" onChange={(e) => setU({ ...u, minSupportedVersion: e.target.value })} />
          <p className="text-xs text-muted-foreground">{t('settings.appSettings.update.minVersionHint')}</p>
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <Label htmlFor="force-update" className="cursor-pointer">{t('settings.appSettings.update.forceUpdate')}</Label>
            <p className="text-xs text-muted-foreground mt-0.5">{t('settings.appSettings.update.forceUpdateHint')}</p>
          </div>
          <Switch id="force-update" checked={u.forceUpdate} onCheckedChange={(c) => setU({ ...u, forceUpdate: c })} />
        </div>
        <div className="space-y-2">
          <Label>{t('settings.appSettings.update.messageAr')}</Label>
          <Textarea rows={2} value={u.messageAr} onChange={(e) => setU({ ...u, messageAr: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>{t('settings.appSettings.update.messageEn')}</Label>
          <Textarea rows={2} dir="ltr" value={u.messageEn} onChange={(e) => setU({ ...u, messageEn: e.target.value })} />
        </div>
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {t('settings.appSettings.update.save')}
        </Button>
      </CardContent>
    </Card>
  );
}

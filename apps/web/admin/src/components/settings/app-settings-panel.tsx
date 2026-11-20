'use client';
import { useEffect, useRef, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import useSWR from 'swr';
import {
  AlertTriangle, Apple, ArrowDown, ArrowUp, Flag, Image as ImageIcon, Loader2, Plus, Smartphone,
  Trash2, Upload, Wrench,
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
  maintenance: { enabled: boolean; messageAr: string; messageEn: string };
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
    purpose: 'onboarding',
    filename: file.name,
    contentType: file.type,
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
      <MaintenanceCard config={data} mutate={mutate} />
      <FeatureFlagsCard />
      <VersionOverviewCard config={data} mutate={mutate} />
      <SplashCard config={data} mutate={mutate} />
      <OnboardingCard config={data} mutate={mutate} />
      <UpdatePolicyCard config={data} mutate={mutate} />
      <ReviewOtpCard />
    </div>
  );
}

type SectionProps = { config: AppConfig; mutate: () => Promise<unknown> };

// ─── Maintenance mode ─────────────────────────────────────────────────
/**
 * Platform maintenance switch. When on, the API answers 503 to every non-admin
 * request and the apps show a maintenance screen — so the platform can be closed
 * during maintenance/migrations. Enabling is confirmed first.
 */
function MaintenanceCard({ config, mutate }: SectionProps) {
  const locale = useLocale();
  const ar = locale !== 'en';
  const confirm = useConfirm();
  const [m, setM] = useState(config.maintenance);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setM(config.maintenance); }, [config.maintenance]);

  const on = config.maintenance.enabled;

  const save = async () => {
    // Confirm when turning the platform OFF (enabling maintenance).
    if (m.enabled && !config.maintenance.enabled) {
      const ok = await confirm({
        title: ar ? 'تفعيل وضع الصيانة؟' : 'Enable maintenance mode?',
        description: ar
          ? 'سيُغلَق التطبيق والمنصة أمام جميع المستخدمين (عدا الأدمن) ويظهر لهم شاشة الصيانة فورًا.'
          : 'The apps and platform will be closed to all users (except admins); they will see the maintenance screen immediately.',
        destructive: true,
      });
      if (!ok) return;
    }
    setSaving(true);
    try {
      await api.put('/settings/app', { maintenance: m });
      await mutate();
      notify.success(ar ? 'تم حفظ إعدادات الصيانة' : 'Maintenance settings saved');
    } catch (err) { notify.error(err, ar ? 'تعذّر الحفظ' : 'Save failed'); }
    finally { setSaving(false); }
  };

  return (
    <Card className={on ? 'border-destructive/40' : undefined}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-4 w-4" />
          {ar ? 'وضع الصيانة' : 'Maintenance mode'}
          {on && (
            <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-semibold text-destructive">
              {ar ? 'مُفعّل' : 'ON'}
            </span>
          )}
        </CardTitle>
        <CardDescription>
          {ar
            ? 'أغلِق المنصة والتطبيقات مؤقتًا أثناء الصيانة أو التحديثات. يبقى الأدمن قادرًا على الدخول.'
            : 'Temporarily close the platform and apps during maintenance or updates. Admins keep access.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 max-w-2xl">
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <p className="text-xs">
            {ar
              ? 'عند التفعيل، تُرفَض كل الطلبات من غير الأدمن (503) فلا تُكتب بيانات جديدة أثناء التحديث.'
              : 'While on, all non-admin requests are rejected (503), so no new data is written during the update.'}
          </p>
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <Label htmlFor="maint-enabled" className="cursor-pointer">
              {ar ? 'تفعيل وضع الصيانة' : 'Enable maintenance mode'}
            </Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              {ar ? 'يُغلق المنصة والتطبيقات أمام المستخدمين.' : 'Closes the platform and apps to users.'}
            </p>
          </div>
          <Switch id="maint-enabled" checked={m.enabled}
            onCheckedChange={(c) => setM({ ...m, enabled: c })} />
        </div>
        <div className="space-y-2">
          <Label>{ar ? 'رسالة الصيانة (عربي)' : 'Maintenance message (Arabic)'}</Label>
          <Textarea rows={2} value={m.messageAr}
            placeholder={ar ? 'نقوم بتحديث المنصة، نعود قريبًا.' : ''}
            onChange={(e) => setM({ ...m, messageAr: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label>{ar ? 'رسالة الصيانة (إنجليزي)' : 'Maintenance message (English)'}</Label>
          <Textarea rows={2} dir="ltr" value={m.messageEn}
            placeholder="We are updating the platform. Back shortly."
            onChange={(e) => setM({ ...m, messageEn: e.target.value })} />
        </div>
        <Button onClick={save} disabled={saving} variant={m.enabled ? 'destructive' : 'default'}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {ar ? 'حفظ' : 'Save'}
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Feature flags ────────────────────────────────────────────────────
interface FeatureFlagDef {
  key: string;
  labelAr: string; labelEn: string;
  descAr: string; descEn: string;
  default: boolean;
}
interface FeatureFlagsData { defs: FeatureFlagDef[]; values: Record<string, boolean> }

/**
 * Server-driven feature flags. Toggling a flag PUTs /settings/app `{ flags }`
 * and takes effect for every client on their next GET /settings/app — no app
 * store update. Labels/defaults come from the API registry (GET
 * /settings/feature-flags).
 */
function FeatureFlagsCard() {
  const locale = useLocale();
  const ar = locale !== 'en';
  const { data, mutate, isLoading } = useSWR<FeatureFlagsData>('/settings/feature-flags', fetcher);
  const [saving, setSaving] = useState<string | null>(null);

  async function toggle(key: string, value: boolean) {
    setSaving(key);
    try {
      await api.put('/settings/app', { flags: { [key]: value } });
      await mutate();
      notify.success(ar ? 'تم تحديث العلم' : 'Flag updated');
    } catch (err) {
      notify.error(err, ar ? 'تعذّر الحفظ' : 'Save failed');
    } finally {
      setSaving(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flag className="h-4 w-4" />
          {ar ? 'أعلام الميزات' : 'Feature flags'}
        </CardTitle>
        <CardDescription>
          {ar
            ? 'فعّل أو عطّل ميزات التطبيق فورًا لجميع المستخدمين دون تحديث من المتجر.'
            : 'Turn app features on or off for everyone instantly — no app-store update.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading || !data ? (
          <div className="flex justify-center py-6 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {data.defs.map((def) => (
              <div key={def.key} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{ar ? def.labelAr : def.labelEn}</span>
                    <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px] text-muted-foreground">{def.key}</code>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{ar ? def.descAr : def.descEn}</p>
                </div>
                <Switch
                  checked={data.values[def.key] ?? def.default}
                  disabled={saving === def.key}
                  onCheckedChange={(c) => toggle(def.key, c)}
                  aria-label={ar ? def.labelAr : def.labelEn}
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

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

// ─── App Store / Play review OTP bypass ───────────────────────────────
// Admin-only; its own endpoint (never in the public GET /settings/app) so the
// reviewer phone + fixed code are never exposed.
interface ReviewOtp { enabled: boolean; phone: string; code: string }

function ReviewOtpCard() {
  const locale = useLocale();
  const ar = locale !== 'en';
  const { data, mutate, isLoading } = useSWR<ReviewOtp>('/settings/review-otp', fetcher);
  const [r, setR] = useState<ReviewOtp>({ enabled: false, phone: '', code: '' });
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (data) setR(data); }, [data]);

  const save = async () => {
    if (r.enabled && (!r.phone.trim() || !r.code.trim())) {
      notify.error(null, ar ? 'أدخل رقم الجوال والرمز لتفعيل وضع المراجعة' : 'Enter the phone and code to enable review mode');
      return;
    }
    setSaving(true);
    try {
      await api.put('/settings/review-otp', { enabled: r.enabled, phone: r.phone.trim(), code: r.code.trim() });
      await mutate();
      notify.success(ar ? 'تم حفظ وضع مراجعة المتجر' : 'Store-review mode saved');
    } catch (err) { notify.error(err, ar ? 'تعذّر الحفظ' : 'Save failed'); }
    finally { setSaving(false); }
  };

  const on = data?.enabled;
  return (
    <Card className={on ? 'border-amber-500/40' : undefined}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Apple className="h-4 w-4" />
          {ar ? 'وضع مراجعة المتجر (App Store / Play)' : 'Store review mode (App Store / Play)'}
          {on && (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
              {ar ? 'مُفعّل' : 'ON'}
            </span>
          )}
        </CardTitle>
        <CardDescription>
          {ar
            ? 'رقم جوال واحد لمراجِع المتجر يسجّل الدخول برمز تحقق ثابت — حتى أثناء تفعيل OTP الحقيقي لبقية المستخدمين. للاختبار من أبل/جوجل فقط.'
            : 'One reviewer phone signs in with a fixed OTP — even while real OTP is live for everyone else. For Apple/Google review only.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 max-w-2xl">
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {ar ? 'جارٍ التحميل…' : 'Loading…'}
          </div>
        ) : (
          <>
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <p className="text-xs">
                {ar
                  ? 'تجاوز أمني مقصور على رقم واحد لغرض مراجعة المتجر فقط. عطّله فور قبول التطبيق، ولا تستخدم رقم مستخدم حقيقي.'
                  : 'A security bypass limited to one number, for store review only. Disable it right after approval; never use a real user’s number.'}
              </p>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label htmlFor="review-enabled" className="cursor-pointer">
                  {ar ? 'تفعيل وضع المراجعة' : 'Enable review mode'}
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {ar ? 'يقبل الرمز الثابت لرقم المراجِع فقط.' : 'Accepts the fixed code for the reviewer number only.'}
                </p>
              </div>
              <Switch id="review-enabled" checked={r.enabled}
                onCheckedChange={(c) => setR({ ...r, enabled: c })} />
            </div>
            <div className="space-y-2">
              <Label>{ar ? 'رقم جوال المراجِع (صيغة E.164)' : 'Reviewer phone (E.164)'}</Label>
              <Input dir="ltr" className="max-w-[260px]" placeholder="+966500000000"
                value={r.phone} onChange={(e) => setR({ ...r, phone: e.target.value.trim() })} />
            </div>
            <div className="space-y-2">
              <Label>{ar ? 'الرمز الثابت (4–8 أرقام)' : 'Fixed code (4–8 digits)'}</Label>
              <Input dir="ltr" inputMode="numeric" className="max-w-[160px]" placeholder="000000"
                value={r.code} onChange={(e) => setR({ ...r, code: e.target.value.replace(/\D/g, '').slice(0, 8) })} />
            </div>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {ar ? 'حفظ' : 'Save'}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

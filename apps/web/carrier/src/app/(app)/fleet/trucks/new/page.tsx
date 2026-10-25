'use client';
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle2, Loader2, Save, Truck, Upload, X } from 'lucide-react';
import { api } from '@/lib/api';
import { notify } from '@/lib/notify';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { PageHeader } from '@/components/page-header';
import { SAUDI_PLATE_LETTERS, SaudiPlate, type PlateType } from '@/components/saudi-plate';
import { useBrandsStore } from '@/stores/brands-store';
import { useTruckTypesStore } from '@/stores/truck-types-store';
import { cn } from '@/lib/utils';

interface FormState {
  registrationType: PlateType | '';
  letter1: string;   // Arabic letter
  letter2: string;
  letter3: string;
  numbers: string;
  ownership: 'OWNED' | 'FREELANCER';
  truckType: string;
  capacity: string;
  brandId: string;
  modelId: string;
  year: string;
  length: string;
  width: string;
  height: string;
  hasGPS: boolean;
  hasRefrigeration: boolean;
  photos: File[];
}

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 2000 + 1 }, (_, i) => String(currentYear - i)); // newest first

export default function NewTruckPage() {
  const t = useTranslations('fleet');
  const router = useRouter();
  const brands = useBrandsStore((s) => s.brands);
  const truckTypes = useTruckTypesStore((s) => s.types.filter((t) => t.active));

  const [form, setForm] = useState<FormState>({
    registrationType: '',
    letter1: '', letter2: '', letter3: '',
    numbers: '',
    ownership: 'OWNED',
    truckType: '',
    capacity: '',
    brandId: '',
    modelId: '',
    year: '',
    length: '', width: '', height: '',
    hasGPS: false,
    hasRefrigeration: false,
    photos: [],
  });

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const selectedBrand = useMemo(
    () => brands.find((b) => b.id === form.brandId),
    [brands, form.brandId],
  );
  const availableModels = selectedBrand?.models ?? [];

  const selectedType = useMemo(
    () => truckTypes.find((t) => t.id === form.truckType),
    [truckTypes, form.truckType],
  );

  // When user picks a truck type, auto-fill capacity (in tons) from the catalog
  const onTruckTypeChange = (id: string) => {
    const t = truckTypes.find((x) => x.id === id);
    setForm((s) => ({
      ...s,
      truckType: id,
      capacity: t ? String((t.capacityKg / 1000).toFixed(0)) : s.capacity,
    }));
  };

  const onNumbersChange = (val: string) => {
    if (/^\d{0,4}$/.test(val)) set('numbers', val);
  };

  const onPhotosChange = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).slice(0, 5);
    set('photos', arr);
  };

  const removePhoto = (i: number) => {
    set('photos', form.photos.filter((_, idx) => idx !== i));
  };

  const validation = {
    registrationType: !!form.registrationType,
    letters:           !!(form.letter1 || form.letter2 || form.letter3),
    numbers:           form.numbers.length > 0,
    truckType:         !!form.truckType,
    capacity:          !!form.capacity,
    year:              !!form.year,
  };
  const isValid = Object.values(validation).every(Boolean);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!isValid || submitting) return;
    setSubmitting(true);
    const plateNumber = `${form.letter1}${form.letter2}${form.letter3} ${form.numbers}`.trim();
    try {
      // Upload photos via presigned URLs before creating the truck record
      const photoUrls: string[] = [];
      for (const file of form.photos) {
        const presign = await api.post<{ uploadUrl: string; publicUrl: string }>(
          '/uploads/presign',
          { filename: file.name, contentType: file.type, folder: 'trucks', sizeBytes: file.size },
        );
        const { uploadUrl, publicUrl } = presign.data;
        await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
        photoUrls.push(publicUrl);
      }

      await api.post('/fleet/trucks', {
        plateNumber,
        ownership: form.ownership,
        type: form.truckType,
        capacity: Number(form.capacity) || 0,
        length: form.length ? Number(form.length) : undefined,
        width: form.width ? Number(form.width) : undefined,
        height: form.height ? Number(form.height) : undefined,
        make: selectedBrand?.nameEn || selectedBrand?.nameAr,
        model: availableModels.find((m) => m.id === form.modelId)?.name,
        year: Number(form.year) || undefined,
        hasGPS: form.hasGPS,
        hasRefrigeration: form.hasRefrigeration,
        photos: photoUrls.length > 0 ? photoUrls : undefined,
      });
      notify.success(t('newTruck.createdTitle'), t('newTruck.createdDesc', { plate: plateNumber }));
      router.push('/fleet/trucks');
    } catch (err) {
      notify.error(err, t('newTruck.createError'));
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader
        title={t('newTruck.title')}
        subtitle={t('newTruck.subtitle')}
        actions={
          <Button variant="outline" onClick={() => router.push('/fleet/trucks')}>
            <ArrowRight className="h-4 w-4 rtl:rotate-180" /> {t('back')}
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        {/* Form */}
        <div className="space-y-6 order-2 lg:order-1">
          {/* Registration type */}
          <Card>
            <CardHeader>
              <CardTitle>{t('registrationType.label')}</CardTitle>
              <CardDescription className="mt-1">{t('newTruck.regTypeHint')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <RegTypeCard
                  selected={form.registrationType === 'light'}
                  onClick={() => set('registrationType', 'light')}
                  color="#1B3A6B"
                  title={t('registrationType.light')}
                  subtitle="Light Transport"
                />
                <RegTypeCard
                  selected={form.registrationType === 'public'}
                  onClick={() => set('registrationType', 'public')}
                  color="#F5C518"
                  title={t('registrationType.public')}
                  subtitle="Public Transport"
                />
              </div>
            </CardContent>
          </Card>

          {/* Plate number */}
          <Card>
            <CardHeader>
              <CardTitle>{t('plateNumber')}</CardTitle>
              <CardDescription className="mt-1">{t('newTruck.plateHint')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-end gap-2">
                <LetterSelect label={t('newTruck.letterN', { n: 1 })} value={form.letter1} onChange={(v) => set('letter1', v)} />
                <LetterSelect label={t('newTruck.letterN', { n: 2 })} value={form.letter2} onChange={(v) => set('letter2', v)} />
                <LetterSelect label={t('newTruck.letterN', { n: 3 })} value={form.letter3} onChange={(v) => set('letter3', v)} />
                <div className="space-y-2">
                  <Label htmlFor="plate-num">{t('newTruck.numbers')}</Label>
                  <Input
                    id="plate-num"
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={form.numbers}
                    onChange={(e) => onNumbersChange(e.target.value.replace(/[^\d]/g, ''))}
                    placeholder="1234"
                    className="w-[120px] h-11 text-center text-base font-bold tabular-nums"
                    style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Truck info */}
          <Card>
            <CardHeader><CardTitle>{t('newTruck.truckInfo')}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t('ownership.label')}</Label>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { v: 'OWNED', label: t('ownership.ownedLabel'), hint: t('ownership.ownedHint') },
                    { v: 'FREELANCER', label: t('ownership.freelancerLabel'), hint: t('ownership.freelancerHint') },
                  ] as const).map((opt) => (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => set('ownership', opt.v)}
                      className={cn(
                        'rounded-xl border p-3 text-start transition-colors',
                        form.ownership === opt.v
                          ? 'border-[hsl(var(--mint))] bg-[hsl(var(--mint))]/8 ring-1 ring-[hsl(var(--mint))]/30'
                          : 'border-border hover:bg-muted/40',
                      )}
                    >
                      <div className="text-sm font-semibold">{opt.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{opt.hint}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('truckType.label')}</Label>
                  <Select value={form.truckType} onValueChange={onTruckTypeChange}>
                    <SelectTrigger><SelectValue placeholder={t('newTruck.selectType')} /></SelectTrigger>
                    <SelectContent>
                      {truckTypes.map((tt) => (
                        <SelectItem key={tt.id} value={tt.id}>
                          <span className="me-1">{tt.icon}</span>
                          {tt.nameAr}
                          <span className="text-xs text-muted-foreground ms-2 num">({(tt.capacityKg / 1000).toFixed(0)} {t('tons')})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capacity">{t('capacity')}</Label>
                  <div className="relative">
                    <Input
                      id="capacity"
                      type="number"
                      inputMode="numeric"
                      value={form.capacity}
                      onChange={(e) => set('capacity', e.target.value)}
                      placeholder="20"
                      className="pe-12"
                    />
                    <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">{t('tons')}</span>
                  </div>
                  {selectedType && (
                    <p className="text-xs text-success flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      {t('newTruck.capacityAutofill')}
                    </p>
                  )}
                </div>
              </div>

              {/* Selected type preview — image + description */}
              {selectedType && (
                <div className="rounded-lg border bg-card overflow-hidden">
                  <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr]">
                    <div className="aspect-[16/10] sm:aspect-auto bg-muted/40 flex items-center justify-center p-3 border-b sm:border-b-0 sm:border-e">
                      {selectedType.imageUrl ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={selectedType.imageUrl}
                            alt={selectedType.nameAr}
                            className="max-h-full max-w-full object-contain drop-shadow-md"
                            onError={(e) => {
                              const t = e.target as HTMLImageElement;
                              t.style.display = 'none';
                              const fb = t.nextElementSibling as HTMLElement;
                              if (fb) fb.style.display = 'flex';
                            }}
                          />
                          <div className="text-5xl" style={{ display: 'none' }}>{selectedType.icon}</div>
                        </>
                      ) : (
                        <div className="text-5xl">{selectedType.icon}</div>
                      )}
                    </div>
                    <div className="p-4 space-y-1.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <h4 className="font-semibold">{selectedType.nameAr}</h4>
                        <Badge variant="default" className="num">
                          {t('newTruck.capacityBadge', { tons: (selectedType.capacityKg / 1000).toFixed(0) })}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {selectedType.description}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{t('make')}</Label>
                  <Select
                    value={form.brandId}
                    onValueChange={(v) => { set('brandId', v); set('modelId', ''); }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={brands.length ? t('newTruck.selectBrand') : t('newTruck.noBrands')} />
                    </SelectTrigger>
                    <SelectContent>
                      {brands.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.nameAr}
                          {b.nameEn && <span className="text-muted-foreground text-xs ms-2" dir="ltr">{b.nameEn}</span>}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('model')}</Label>
                  <Select
                    value={form.modelId}
                    onValueChange={(v) => set('modelId', v)}
                    disabled={!form.brandId || availableModels.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          !form.brandId
                            ? t('newTruck.selectBrandFirst')
                            : availableModels.length === 0
                            ? t('newTruck.noModels')
                            : t('newTruck.selectModel')
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('year')}</Label>
                  <Select value={form.year} onValueChange={(v) => set('year', v)}>
                    <SelectTrigger><SelectValue placeholder={t('newTruck.yearPlaceholder')} /></SelectTrigger>
                    <SelectContent>
                      {YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dimensions */}
          <Card>
            <CardHeader>
              <CardTitle>{t('newTruck.dimensions')}</CardTitle>
              <CardDescription className="mt-1">{t('newTruck.dimensionsHint')}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <DimensionInput label={t('newTruck.length')} unit={t('newTruck.meterUnit')} id="length" value={form.length} onChange={(v) => set('length', v)} />
              <DimensionInput label={t('newTruck.width')} unit={t('newTruck.meterUnit')} id="width"  value={form.width}  onChange={(v) => set('width',  v)} />
              <DimensionInput label={t('newTruck.height')} unit={t('newTruck.meterUnit')} id="height" value={form.height} onChange={(v) => set('height', v)} />
            </CardContent>
          </Card>

          {/* Equipment toggles */}
          <Card>
            <CardHeader><CardTitle>{t('newTruck.equipment')}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="space-y-0.5">
                  <Label htmlFor="gps">{t('hasGPS')}</Label>
                  <p className="text-xs text-muted-foreground">{t('newTruck.gpsHint')}</p>
                </div>
                <Switch id="gps" checked={form.hasGPS} onCheckedChange={(v) => set('hasGPS', v)} />
              </div>

              {form.truckType === 'REFRIGERATED' && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="space-y-0.5">
                    <Label htmlFor="refrig">{t('newTruck.refrigLabel')}</Label>
                    <p className="text-xs text-muted-foreground">{t('newTruck.refrigHint')}</p>
                  </div>
                  <Switch id="refrig" checked={form.hasRefrigeration} onCheckedChange={(v) => set('hasRefrigeration', v)} />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Photos */}
          <Card>
            <CardHeader>
              <CardTitle>{t('newTruck.photos')}</CardTitle>
              <CardDescription className="mt-1">{t('newTruck.photosHint')}</CardDescription>
            </CardHeader>
            <CardContent>
              <label className="flex flex-col items-center justify-center gap-2 p-6 rounded-lg border-2 border-dashed cursor-pointer hover:bg-muted/30 transition-colors">
                <Upload className="h-6 w-6 text-muted-foreground" />
                <span className="text-sm font-medium">{t('newTruck.uploadPrompt')}</span>
                <span className="text-xs text-muted-foreground">{t('newTruck.uploadHint')}</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => onPhotosChange(e.target.files)}
                />
              </label>
              {form.photos.length > 0 && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {form.photos.map((file, i) => (
                    <div key={i} className="relative aspect-video rounded-md border bg-muted/30 grid place-items-center text-xs text-muted-foreground">
                      <span className="truncate px-2">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute top-1 end-1 h-6 w-6 grid place-items-center rounded-full bg-destructive text-destructive-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => router.push('/fleet/trucks')} disabled={submitting}>{t('cancel')}</Button>
            <Button onClick={submit} disabled={!isValid || submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {submitting ? t('newTruck.saving') : t('newTruck.save')}
            </Button>
          </div>
        </div>

        {/* Live preview — sticky on lg+ */}
        <aside className="order-1 lg:order-2">
          <div className="lg:sticky lg:top-24 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('newTruck.platePreview')}</CardTitle>
                <CardDescription className="mt-1">{t('newTruck.platePreviewHint')}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center gap-4 py-8">
                <SaudiPlate
                  letters={[form.letter1, form.letter2, form.letter3]}
                  numbers={form.numbers}
                  type={(form.registrationType || 'light') as PlateType}
                  size="lg"
                />
                {form.registrationType && (
                  <Badge variant={form.registrationType === 'light' ? 'default' : 'warning'}>
                    {form.registrationType === 'light' ? t('registrationType.light') : t('registrationType.public')}
                  </Badge>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('newTruck.checklist')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <CheckRow label={t('registrationType.label')}      ok={validation.registrationType} />
                <CheckRow label={t('newTruck.checkLetter')} ok={validation.letters} />
                <CheckRow label={t('newTruck.checkNumber')} ok={validation.numbers} />
                <CheckRow label={t('truckType.label')}      ok={validation.truckType} />
                <CheckRow label={t('capacity')} ok={validation.capacity} />
                <CheckRow label={t('year')}          ok={validation.year} />
              </CardContent>
            </Card>
          </div>
        </aside>
      </div>
    </>
  );
}

function RegTypeCard({
  selected, onClick, color, title, subtitle,
}: { selected: boolean; onClick: () => void; color: string; title: string; subtitle: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-start',
        selected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40',
      )}
    >
      <div className="h-10 w-10 rounded shrink-0" style={{ backgroundColor: color }} />
      <div className="flex-1 min-w-0">
        <div className="font-semibold">{title}</div>
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      </div>
      {selected && (
        <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
      )}
    </button>
  );
}

function LetterSelect({
  label, value, onChange,
}: { label: string; value: string; onChange: (v: string) => void }) {
  const t = useTranslations('fleet');
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value || '__empty__'} onValueChange={(v) => onChange(v === '__empty__' ? '' : v)}>
        <SelectTrigger className="w-[100px] h-11"><SelectValue placeholder={t('newTruck.letterPlaceholder')} /></SelectTrigger>
        <SelectContent>
          <SelectItem value="__empty__">{t('newTruck.none')}</SelectItem>
          {SAUDI_PLATE_LETTERS.map((l) => (
            <SelectItem key={l.ar} value={l.ar}>
              <span className="num me-2">{l.en}</span>
              <span className="font-bold">{l.ar}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function DimensionInput({ label, unit, id, value, onChange }: { label: string; unit: string; id: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input id={id} type="number" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} placeholder="0.0" className="pe-12" />
        <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">{unit}</span>
      </div>
    </div>
  );
}

function CheckRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <CheckCircle2 className={cn('h-4 w-4 shrink-0', ok ? 'text-success' : 'text-muted-foreground/30')} />
      <span className={cn(ok ? '' : 'text-muted-foreground')}>{label}</span>
    </div>
  );
}

// Truck import (kept for reference of unused imports)
void Truck;

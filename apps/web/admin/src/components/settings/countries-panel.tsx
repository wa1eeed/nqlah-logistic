'use client';
import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import useSWR from 'swr';
import { Globe, MapPin, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { fetcher, api } from '@/lib/api';
import { notify } from '@/lib/notify';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

// ─── Types mirroring GET /admin/locations ──────────────────────
type City = { id: string; nameAr: string; nameEn: string; active: boolean; sortOrder: number };
type Region = { id: string; nameAr: string; nameEn: string; active: boolean; sortOrder: number; cities: City[] };
type Country = {
  id: string; code: string; nameAr: string; nameEn: string; dialCode: string | null;
  active: boolean; sortOrder: number; regions: Region[];
};

export function CountriesPanel() {
  const t = useTranslations('admin');
  const locale = useLocale();
  const nameOf = (x: { nameAr: string; nameEn: string }) => (locale === 'en' ? x.nameEn || x.nameAr : x.nameAr || x.nameEn);

  const { data: countries, mutate, isLoading } = useSWR<Country[]>('/admin/locations', fetcher);
  const list = countries ?? [];

  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (c) => c.nameAr.toLowerCase().includes(q) || c.nameEn.toLowerCase().includes(q) || c.code.toLowerCase().includes(q),
    );
  }, [list, query]);

  const selected = list.find((c) => c.id === selectedId) ?? filtered[0] ?? list[0] ?? null;
  const activeId = selected?.id ?? null;

  // ─── Add country dialog state ─────────────────────────────
  const [openAdd, setOpenAdd] = useState(false);
  const [draft, setDraft] = useState({ code: '', nameAr: '', nameEn: '', dialCode: '' });
  const [saving, setSaving] = useState(false);
  const codeInvalid = draft.code.length > 0 && !/^[A-Za-z]{2}$/.test(draft.code);

  const resetDraft = () => setDraft({ code: '', nameAr: '', nameEn: '', dialCode: '' });

  const addCountry = async () => {
    if (saving || codeInvalid || !draft.code.trim() || !draft.nameAr.trim() || !draft.nameEn.trim()) return;
    setSaving(true);
    try {
      const res = await api.post('/admin/locations/countries', {
        code: draft.code.trim().toUpperCase(),
        nameAr: draft.nameAr.trim(),
        nameEn: draft.nameEn.trim(),
        dialCode: draft.dialCode.trim() || undefined,
      });
      notify.success(t('settings.countries.toast.countryAdded'));
      await mutate();
      const created = res.data?.data as Country | undefined;
      if (created?.id) setSelectedId(created.id);
      resetDraft();
      setOpenAdd(false);
    } catch (err) {
      notify.error(err, t('settings.countries.toast.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle>{t('settings.countries.title')}</CardTitle>
            <CardDescription className="mt-1">{t('settings.countries.subtitle')}</CardDescription>
          </div>
          <Dialog open={openAdd} onOpenChange={(o) => { setOpenAdd(o); if (!o) resetDraft(); }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4" /> {t('settings.countries.addCountry')}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('settings.countries.addCountry')}</DialogTitle>
                <DialogDescription>{t('settings.countries.addCountryHint')}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="c-code">{t('settings.countries.fields.code')}</Label>
                  <Input id="c-code" dir="ltr" maxLength={2} value={draft.code} placeholder="SA"
                    onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase() }))} />
                  {codeInvalid && <p className="text-xs text-destructive">{t('settings.countries.codeInvalid')}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c-ar">{t('settings.countries.fields.nameAr')}</Label>
                  <Input id="c-ar" value={draft.nameAr} placeholder="المملكة العربية السعودية"
                    onChange={(e) => setDraft((d) => ({ ...d, nameAr: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c-en">{t('settings.countries.fields.nameEn')}</Label>
                  <Input id="c-en" dir="ltr" value={draft.nameEn} placeholder="Saudi Arabia"
                    onChange={(e) => setDraft((d) => ({ ...d, nameEn: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="c-dial">{t('settings.countries.fields.dialCode')}</Label>
                  <Input id="c-dial" dir="ltr" value={draft.dialCode} placeholder="+966"
                    onChange={(e) => setDraft((d) => ({ ...d, dialCode: e.target.value }))} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenAdd(false)}>{t('settings.countries.cancel')}</Button>
                <Button onClick={addCountry} disabled={saving || codeInvalid || !draft.code.trim() || !draft.nameAr.trim() || !draft.nameEn.trim()}>
                  {saving ? t('settings.countries.saving') : t('settings.countries.save')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="py-12 text-center text-muted-foreground">{t('settings.countries.loading')}</div>
        ) : list.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Globe className="h-10 w-10 mx-auto mb-2 opacity-40" />
            {t('settings.countries.empty')}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4">
            {/* Country list + search */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="ps-8" value={query} onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('settings.countries.searchPlaceholder')} />
              </div>
              <div className="space-y-1 max-h-[520px] overflow-y-auto pe-1">
                {filtered.map((c) => (
                  <button key={c.id} type="button" onClick={() => setSelectedId(c.id)}
                    className={`w-full flex items-center justify-between gap-2 rounded-lg border p-3 text-start transition-colors ${
                      activeId === c.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40'
                    } ${!c.active ? 'opacity-60' : ''}`}>
                    <div className="min-w-0">
                      <div className="font-medium truncate flex items-center gap-1.5">
                        {nameOf(c)}
                        {!c.active && <Badge variant="outline" className="shrink-0 text-[10px]">{t('settings.countries.inactive')}</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground truncate" dir="ltr">{c.code}{c.dialCode ? ` · ${c.dialCode}` : ''}</div>
                    </div>
                    <Badge variant="outline" className="shrink-0"><span className="num">{c.regions.length}</span></Badge>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <div className="text-sm text-muted-foreground py-6 text-center">{t('settings.countries.noMatch')}</div>
                )}
              </div>
            </div>

            {/* Detail */}
            {selected ? (
              <CountryDetail key={selected.id} country={selected} nameOf={nameOf}
                onChanged={mutate} onDeleted={() => { setSelectedId(null); mutate(); }} />
            ) : (
              <div className="rounded-lg border border-dashed grid place-items-center text-sm text-muted-foreground p-8">
                {t('settings.countries.selectHint')}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Country detail: edit country + manage its regions & cities ───
function CountryDetail({
  country, nameOf, onChanged, onDeleted,
}: {
  country: Country;
  nameOf: (x: { nameAr: string; nameEn: string }) => string;
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const t = useTranslations('admin');
  const [editOpen, setEditOpen] = useState(false);
  const [edit, setEdit] = useState({ code: country.code, nameAr: country.nameAr, nameEn: country.nameEn, dialCode: country.dialCode ?? '' });
  const [newRegionAr, setNewRegionAr] = useState('');
  const [newRegionEn, setNewRegionEn] = useState('');

  const call = async (fn: () => Promise<unknown>, okMsg: string) => {
    try { await fn(); notify.success(okMsg); onChanged(); }
    catch (err) { notify.error(err, t('settings.countries.toast.saveFailed')); }
  };

  const saveCountry = () =>
    call(() => api.patch(`/admin/locations/countries/${country.id}`, {
      code: edit.code.trim().toUpperCase(),
      nameAr: edit.nameAr.trim(),
      nameEn: edit.nameEn.trim(),
      dialCode: edit.dialCode.trim(),
    }).then(() => setEditOpen(false)), t('settings.countries.toast.countrySaved'));

  const toggleCountry = (active: boolean) =>
    call(() => api.patch(`/admin/locations/countries/${country.id}`, { active }), t('settings.countries.toast.countrySaved'));

  const deleteCountry = async () => {
    if (!confirm(t('settings.countries.confirmDeleteCountry', { name: nameOf(country) }))) return;
    try { await api.delete(`/admin/locations/countries/${country.id}`); notify.success(t('settings.countries.toast.countryDeleted')); onDeleted(); }
    catch (err) { notify.error(err, t('settings.countries.toast.saveFailed')); }
  };

  const addRegion = () => {
    if (!newRegionAr.trim() || !newRegionEn.trim()) return;
    call(() => api.post('/admin/locations/regions', {
      countryId: country.id, nameAr: newRegionAr.trim(), nameEn: newRegionEn.trim(),
    }).then(() => { setNewRegionAr(''); setNewRegionEn(''); }), t('settings.countries.toast.regionAdded'));
  };

  return (
    <div className="rounded-lg border p-4 space-y-4">
      {/* Country header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-lg font-semibold truncate">{country.nameAr}</div>
          <div className="text-sm text-muted-foreground truncate" dir="ltr">
            {country.nameEn} · {country.code}{country.dialCode ? ` · ${country.dialCode}` : ''}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <Switch checked={country.active} onCheckedChange={toggleCountry} id={`c-active-${country.id}`} />
            <Label htmlFor={`c-active-${country.id}`} className="text-xs text-muted-foreground">{t('settings.countries.active')}</Label>
          </div>
          <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (o) setEdit({ code: country.code, nameAr: country.nameAr, nameEn: country.nameEn, dialCode: country.dialCode ?? '' }); }}>
            <DialogTrigger asChild>
              <Button size="sm" variant="ghost"><Pencil className="h-3.5 w-3.5" /> {t('settings.countries.edit')}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{t('settings.countries.editCountry')}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>{t('settings.countries.fields.code')}</Label>
                  <Input dir="ltr" maxLength={2} value={edit.code}
                    onChange={(e) => setEdit((d) => ({ ...d, code: e.target.value.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase() }))} />
                </div>
                <div className="space-y-2">
                  <Label>{t('settings.countries.fields.nameAr')}</Label>
                  <Input value={edit.nameAr} onChange={(e) => setEdit((d) => ({ ...d, nameAr: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>{t('settings.countries.fields.nameEn')}</Label>
                  <Input dir="ltr" value={edit.nameEn} onChange={(e) => setEdit((d) => ({ ...d, nameEn: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>{t('settings.countries.fields.dialCode')}</Label>
                  <Input dir="ltr" value={edit.dialCode} onChange={(e) => setEdit((d) => ({ ...d, dialCode: e.target.value }))} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditOpen(false)}>{t('settings.countries.cancel')}</Button>
                <Button onClick={saveCountry} disabled={!edit.code.trim() || !edit.nameAr.trim() || !edit.nameEn.trim()}>{t('settings.countries.save')}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={deleteCountry}>
            <Trash2 className="h-3.5 w-3.5" /> {t('settings.countries.delete')}
          </Button>
        </div>
      </div>

      <div className="h-px bg-border" />

      {/* Regions */}
      <div>
        <div className="text-sm font-semibold mb-3">{t('settings.countries.regions')} ({country.regions.length})</div>
        <div className="space-y-3">
          {country.regions.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center">{t('settings.countries.noRegions')}</div>
          ) : (
            country.regions.map((r) => (
              <RegionCard key={r.id} region={r} nameOf={nameOf} onChanged={onChanged} />
            ))
          )}
        </div>

        {/* Add region row */}
        <div className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <Input value={newRegionAr} onChange={(e) => setNewRegionAr(e.target.value)} placeholder={t('settings.countries.regionNameAr')} className="flex-1" />
          <Input value={newRegionEn} dir="ltr" onChange={(e) => setNewRegionEn(e.target.value)} placeholder={t('settings.countries.regionNameEn')} className="flex-1" />
          <Button onClick={addRegion} disabled={!newRegionAr.trim() || !newRegionEn.trim()}><Plus className="h-4 w-4" /> {t('settings.countries.addRegion')}</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Region card: edit/delete region + manage its cities ──────────
function RegionCard({
  region, nameOf, onChanged,
}: {
  region: Region;
  nameOf: (x: { nameAr: string; nameEn: string }) => string;
  onChanged: () => void;
}) {
  const t = useTranslations('admin');
  const [editing, setEditing] = useState(false);
  const [draftAr, setDraftAr] = useState(region.nameAr);
  const [draftEn, setDraftEn] = useState(region.nameEn);
  const [newCityAr, setNewCityAr] = useState('');
  const [newCityEn, setNewCityEn] = useState('');

  const call = async (fn: () => Promise<unknown>, okMsg: string) => {
    try { await fn(); notify.success(okMsg); onChanged(); }
    catch (err) { notify.error(err, t('settings.countries.toast.saveFailed')); }
  };

  const saveRegion = () => {
    if (!draftAr.trim() || !draftEn.trim()) return;
    call(() => api.patch(`/admin/locations/regions/${region.id}`, { nameAr: draftAr.trim(), nameEn: draftEn.trim() })
      .then(() => setEditing(false)), t('settings.countries.toast.regionSaved'));
  };
  const toggleRegion = (active: boolean) =>
    call(() => api.patch(`/admin/locations/regions/${region.id}`, { active }), t('settings.countries.toast.regionSaved'));
  const deleteRegion = () => {
    if (!confirm(t('settings.countries.confirmDeleteRegion', { name: nameOf(region) }))) return;
    call(() => api.delete(`/admin/locations/regions/${region.id}`), t('settings.countries.toast.regionDeleted'));
  };
  const addCity = () => {
    if (!newCityAr.trim() || !newCityEn.trim()) return;
    call(() => api.post('/admin/locations/cities', { regionId: region.id, nameAr: newCityAr.trim(), nameEn: newCityEn.trim() })
      .then(() => { setNewCityAr(''); setNewCityEn(''); }), t('settings.countries.toast.cityAdded'));
  };
  const toggleCity = (id: string, active: boolean) =>
    call(() => api.patch(`/admin/locations/cities/${id}`, { active }), t('settings.countries.toast.citySaved'));
  const deleteCity = (c: City) => {
    if (!confirm(t('settings.countries.confirmDeleteCity', { name: nameOf(c) }))) return;
    call(() => api.delete(`/admin/locations/cities/${c.id}`), t('settings.countries.toast.cityDeleted'));
  };

  return (
    <div className={`rounded-lg border p-3 ${!region.active ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        {editing ? (
          <div className="flex-1 space-y-2">
            <Input value={draftAr} onChange={(e) => setDraftAr(e.target.value)} placeholder={t('settings.countries.regionNameAr')} />
            <Input value={draftEn} dir="ltr" onChange={(e) => setDraftEn(e.target.value)} placeholder={t('settings.countries.regionNameEn')} />
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={saveRegion}>{t('settings.countries.save')}</Button>
              <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setDraftAr(region.nameAr); setDraftEn(region.nameEn); }}>{t('settings.countries.cancel')}</Button>
            </div>
          </div>
        ) : (
          <>
            <div className="min-w-0">
              <div className="font-medium truncate flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> {region.nameAr}
              </div>
              <div className="text-xs text-muted-foreground truncate" dir="ltr">{region.nameEn}</div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Switch checked={region.active} onCheckedChange={toggleRegion} />
              <Button size="sm" variant="ghost" onClick={() => { setEditing(true); setDraftAr(region.nameAr); setDraftEn(region.nameEn); }}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={deleteRegion}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Cities */}
      <div className="mt-3 ps-5 space-y-2">
        {region.cities.length === 0 ? (
          <div className="text-xs text-muted-foreground">{t('settings.countries.noCities')}</div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {region.cities.map((c) => (
              <span key={c.id} className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${c.active ? 'bg-muted/40' : 'opacity-50 line-through'}`}>
                {c.nameAr}
                <button type="button" title={t('settings.countries.toggle')} className="text-muted-foreground hover:text-foreground"
                  onClick={() => toggleCity(c.id, !c.active)}>
                  <span className="text-[10px]">{c.active ? '●' : '○'}</span>
                </button>
                <button type="button" title={t('settings.countries.delete')} className="text-muted-foreground hover:text-destructive"
                  onClick={() => deleteCity(c)}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
          <Input value={newCityAr} onChange={(e) => setNewCityAr(e.target.value)} placeholder={t('settings.countries.cityNameAr')} className="h-8 flex-1" />
          <Input value={newCityEn} dir="ltr" onChange={(e) => setNewCityEn(e.target.value)} placeholder={t('settings.countries.cityNameEn')} className="h-8 flex-1" />
          <Button size="sm" variant="outline" onClick={addCity} disabled={!newCityAr.trim() || !newCityEn.trim()}>
            <Plus className="h-3.5 w-3.5" /> {t('settings.countries.addCity')}
          </Button>
        </div>
      </div>
    </div>
  );
}

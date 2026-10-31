'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import useSWR from 'swr';
import { CheckCircle2, Coins, Loader2, Plus, Star, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, fetcher } from '@/lib/api';
import { notify } from '@/lib/notify';
import { useConfirm } from '@/components/confirm';

interface Currency {
  code: string;
  symbol: string;
  nameAr: string;
  nameEn: string;
  decimals: number;
}
interface CurrenciesConfig {
  currencies: Currency[];
  defaultCurrencyCode: string;
}

const EMPTY_DRAFT: Currency = { code: '', symbol: '', nameAr: '', nameEn: '', decimals: 2 };

/**
 * Currencies panel — the admin enables a list of currencies (code, symbol,
 * Arabic + English name, decimals), removes ones, and picks the default. The
 * default's symbol is what every money value renders with across the web
 * dashboards and the mobile app. Persists to the platform key/value store via
 * PUT /settings/currencies; consumed publicly through GET /settings/currencies.
 */
export function CurrenciesPanel() {
  const t = useTranslations('admin');
  const { data, mutate, isLoading } = useSWR<CurrenciesConfig>('/settings/currencies', fetcher);
  const confirm = useConfirm();

  const [list, setList] = useState<Currency[]>([]);
  const [defaultCode, setDefaultCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [openAdd, setOpenAdd] = useState(false);
  const [draft, setDraft] = useState<Currency>(EMPTY_DRAFT);

  useEffect(() => {
    if (data) {
      setList(data.currencies);
      setDefaultCode(data.defaultCurrencyCode);
    }
  }, [data]);

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const codeInvalid = draft.code.length > 0 && !/^[A-Z]{3}$/.test(draft.code);
  const draftComplete =
    /^[A-Z]{3}$/.test(draft.code) && draft.symbol.trim() && draft.nameAr.trim() && draft.nameEn.trim();
  const duplicate = list.some((c) => c.code === draft.code);

  const addCurrency = () => {
    if (!draftComplete || duplicate) return;
    setList([...list, { ...draft, symbol: draft.symbol.trim(), nameAr: draft.nameAr.trim(), nameEn: draft.nameEn.trim() }]);
    setDraft(EMPTY_DRAFT);
    setOpenAdd(false);
  };

  const removeCurrency = async (code: string) => {
    const cur = list.find((c) => c.code === code);
    if (!(await confirm({
      title: t('settings.currencies.removeTitle'),
      description: t('settings.currencies.confirmRemove', { name: cur?.nameAr ?? code }),
      destructive: true,
    }))) return;
    const next = list.filter((c) => c.code !== code);
    setList(next);
    // Keep the default pointing at a currency that still exists.
    if (defaultCode === code) setDefaultCode(next[0]?.code ?? '');
  };

  const save = async () => {
    if (saving) return;
    if (list.length === 0) { notify.error(t('settings.currencies.needOne')); return; }
    if (!list.some((c) => c.code === defaultCode)) { notify.error(t('settings.currencies.pickDefault')); return; }
    setSaving(true);
    try {
      await api.put('/settings/currencies', { currencies: list, defaultCurrencyCode: defaultCode });
      await mutate();
      notify.success(t('settings.currencies.saved'));
    } catch (err) {
      notify.error(err, t('settings.currencies.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <CardTitle>{t('settings.currencies.title')}</CardTitle>
            <CardDescription className="mt-1">{t('settings.currencies.subtitle')}</CardDescription>
          </div>
          <Dialog open={openAdd} onOpenChange={(o) => { setOpenAdd(o); if (!o) setDraft(EMPTY_DRAFT); }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4" /> {t('settings.currencies.add')}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('settings.currencies.addTitle')}</DialogTitle>
                <DialogDescription>{t('settings.currencies.addHint')}</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="cur-code">{t('settings.currencies.fields.code')}</Label>
                  <Input id="cur-code" dir="ltr" maxLength={3} placeholder="USD" value={draft.code}
                    onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3) })} />
                  {codeInvalid && <p className="text-xs text-destructive">{t('settings.currencies.codeInvalid')}</p>}
                  {duplicate && <p className="text-xs text-destructive">{t('settings.currencies.duplicate')}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cur-symbol">{t('settings.currencies.fields.symbol')}</Label>
                  <Input id="cur-symbol" dir="ltr" maxLength={8} placeholder="$" value={draft.symbol}
                    onChange={(e) => setDraft({ ...draft, symbol: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cur-ar">{t('settings.currencies.fields.nameAr')}</Label>
                  <Input id="cur-ar" placeholder="دولار أمريكي" value={draft.nameAr}
                    onChange={(e) => setDraft({ ...draft, nameAr: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cur-en">{t('settings.currencies.fields.nameEn')}</Label>
                  <Input id="cur-en" dir="ltr" placeholder="US Dollar" value={draft.nameEn}
                    onChange={(e) => setDraft({ ...draft, nameEn: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cur-dec">{t('settings.currencies.fields.decimals')}</Label>
                  <Input id="cur-dec" type="number" min={0} max={4} dir="ltr" value={draft.decimals}
                    onChange={(e) => setDraft({ ...draft, decimals: Math.max(0, Math.min(4, Number(e.target.value) || 0)) })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenAdd(false)}>{t('settings.currencies.cancel')}</Button>
                <Button onClick={addCurrency} disabled={!draftComplete || duplicate}>{t('settings.currencies.addAction')}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {list.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Coins className="h-10 w-10 mx-auto mb-2 opacity-40" />
            {t('settings.currencies.empty')}
          </div>
        ) : (
          <div className="space-y-2">
            {list.map((c) => {
              const isDefault = c.code === defaultCode;
              return (
                <div key={c.code}
                  className={`flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors ${
                    isDefault ? 'border-primary bg-primary/5' : 'border-border'
                  }`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <span dir="ltr" className="num text-lg font-semibold w-10 text-center shrink-0">{c.symbol}</span>
                    <div className="min-w-0">
                      <div className="font-medium flex items-center gap-2">
                        <span dir="ltr">{c.code}</span>
                        <span className="text-muted-foreground font-normal truncate">· {c.nameAr}</span>
                      </div>
                      <div className="text-xs text-muted-foreground truncate" dir="ltr">
                        {c.nameEn} · {t('settings.currencies.decimalsLabel', { n: c.decimals })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {isDefault ? (
                      <span className="inline-flex items-center gap-1 text-xs text-primary font-medium px-2">
                        <CheckCircle2 className="h-3.5 w-3.5" /> {t('settings.currencies.defaultBadge')}
                      </span>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => setDefaultCode(c.code)}>
                        <Star className="h-3.5 w-3.5" /> {t('settings.currencies.makeDefault')}
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive"
                      disabled={list.length === 1}
                      onClick={() => removeCurrency(c.code)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-2 pt-2">
          <Button onClick={save} disabled={saving}>
            {saving ? t('settings.currencies.saving') : t('settings.currencies.save')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

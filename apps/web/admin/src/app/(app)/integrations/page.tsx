'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
  Activity, AlertTriangle, Bell, CheckCircle2, CreditCard, Database,
  HelpCircle, Loader2, Mail, MessageSquare, Plug, Save, Settings2, XCircle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/page-header';
import { FadeIn } from '@/components/ui/fade-in';
import { api, fetcher } from '@/lib/api';
import { notify } from '@/lib/notify';

interface ConfigField {
  key: string; labelAr: string; secret: boolean; required: boolean;
  placeholder: string | null; source: 'db' | 'env' | 'none'; hasValue: boolean; display: string;
}
interface Integration {
  domain: string; labelAr: string; descAr: string; icon: string; category: string;
  activeProvider: string; activeImplemented: boolean; enabled: boolean;
  providers: { id: string; labelAr: string; implemented: boolean }[];
  config: ConfigField[];
  status: 'ok' | 'degraded' | 'down' | 'unknown'; statusNote: string | null; lastTestedAt: string | null;
}

const ICONS: Record<string, typeof Plug> = {
  'credit-card': CreditCard, message: MessageSquare, mail: Mail, database: Database, bell: Bell,
};
const STATUS: Record<string, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
  ok: { label: 'يعمل', cls: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30', Icon: CheckCircle2 },
  degraded: { label: 'جزئي', cls: 'bg-amber-500/15 text-amber-600 border-amber-500/30', Icon: AlertTriangle },
  down: { label: 'متوقف', cls: 'bg-red-500/15 text-red-600 border-red-500/30', Icon: XCircle },
  unknown: { label: 'غير مُختبَر', cls: 'bg-muted text-muted-foreground border-border', Icon: HelpCircle },
};

export default function IntegrationsPage() {
  const { data, mutate, isLoading } = useSWR<{ data?: Integration[] } | Integration[]>(
    '/admin/integrations', fetcher,
  );
  const items: Integration[] = Array.isArray(data) ? data : (data?.data ?? []);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Integration Hub"
        title={<span className="inline-flex items-center gap-2"><Plug className="size-6 text-[hsl(var(--mint))]" /> مركز التكاملات</span>}
        subtitle="إدارة كل ربط تقني مع أنظمة خارجية (مدفوعات، رسائل، بريد، تخزين، إشعارات) من مكان واحد — المزوّد، الإعدادات، التفعيل، والحالة."
      />
      {isLoading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((it, i) => (
            <FadeIn key={it.domain} delay={i * 0.05}>
              <IntegrationCard it={it} onChange={() => mutate()} />
            </FadeIn>
          ))}
        </div>
      )}
    </div>
  );
}

function IntegrationCard({ it, onChange }: { it: Integration; onChange: () => void }) {
  const Icon = ICONS[it.icon] ?? Plug;
  const st = STATUS[it.status] ?? STATUS.unknown;
  const [busy, setBusy] = useState<'test' | 'save' | 'toggle' | 'provider' | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [edits, setEdits] = useState<Record<string, string>>({});

  async function patch(body: Record<string, unknown>, kind: typeof busy) {
    setBusy(kind);
    try {
      await api.patch(`/admin/integrations/${it.domain}`, body);
      notify.success('تم الحفظ');
      onChange();
    } catch {
      notify.error('تعذّر الحفظ');
    } finally { setBusy(null); }
  }
  async function test() {
    setBusy('test');
    try {
      const res = await api.post(`/admin/integrations/${it.domain}/test`);
      const r = res.data?.data ?? res.data;
      (r.status === 'ok' ? notify.success : r.status === 'down' ? notify.error : notify.info)(r.note ?? 'تم الاختبار');
      onChange();
    } catch { notify.error('تعذّر الاختبار'); }
    finally { setBusy(null); }
  }
  async function saveConfig() {
    if (Object.keys(edits).length === 0) { setShowConfig(false); return; }
    await patch({ config: edits }, 'save');
    setEdits({});
    setShowConfig(false);
  }

  return (
    <Card className={`h-full ${it.enabled ? '' : 'opacity-70'}`}>
      <CardContent className="flex h-full flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-xl bg-[hsl(var(--mint))]/12 text-[hsl(var(--mint))]">
              <Icon className="size-5" />
            </div>
            <div>
              <div className="font-semibold leading-tight">{it.labelAr}</div>
              <div className="text-xs text-muted-foreground">{it.descAr}</div>
            </div>
          </div>
          <Badge variant="outline" className={`shrink-0 gap-1 ${st.cls}`}>
            <st.Icon className="size-3" /> {st.label}
          </Badge>
        </div>

        {it.statusNote && (
          <div className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">{it.statusNote}</div>
        )}

        <div className="grid gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">المزوّد الفعّال</Label>
            <Select
              value={it.activeProvider}
              onValueChange={(v) => patch({ provider: v }, 'provider')}
              disabled={busy !== null}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {it.providers.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.labelAr}{!p.implemented ? ' — (قريباً)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!it.activeImplemented && (
              <p className="text-[11px] text-amber-600">هذا المزوّد لم يُفعّل بعد — يُستخدم البديل التطويري حتى تتوفّر المفاتيح.</p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-sm">مُفعّل</Label>
            <Switch
              checked={it.enabled}
              onCheckedChange={(v) => patch({ enabled: v }, 'toggle')}
              disabled={busy !== null}
            />
          </div>
        </div>

        {it.config.length > 0 && (
          <div className="rounded-xl border border-border/70 p-3">
            <button
              type="button"
              onClick={() => setShowConfig((s) => !s)}
              className="flex w-full items-center justify-between text-sm font-medium"
            >
              <span className="inline-flex items-center gap-2"><Settings2 className="size-4" /> الإعدادات والمفاتيح</span>
              <span className="text-xs text-muted-foreground">{it.config.filter((c) => c.hasValue).length}/{it.config.length} مضبوط</span>
            </button>
            {showConfig && (
              <div className="mt-3 space-y-3">
                {it.config.map((f) => (
                  <div key={f.key} className="space-y-1">
                    <Label className="flex items-center justify-between text-xs">
                      <span>{f.labelAr}{f.required ? ' *' : ''}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {f.source === 'db' ? 'مخزّن' : f.source === 'env' ? 'من البيئة' : 'غير مضبوط'}
                      </span>
                    </Label>
                    <Input
                      type={f.secret ? 'password' : 'text'}
                      placeholder={f.hasValue ? f.display : (f.placeholder ?? '')}
                      value={edits[f.key] ?? ''}
                      onChange={(e) => setEdits((s) => ({ ...s, [f.key]: e.target.value }))}
                      dir="ltr"
                    />
                  </div>
                ))}
                <Button size="sm" onClick={saveConfig} disabled={busy === 'save'} className="w-full">
                  {busy === 'save' ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  حفظ الإعدادات
                </Button>
              </div>
            )}
          </div>
        )}

        <div className="mt-auto flex items-center gap-2 pt-1">
          <Button variant="outline" size="sm" onClick={test} disabled={busy !== null} className="flex-1">
            {busy === 'test' ? <Loader2 className="size-4 animate-spin" /> : <Activity className="size-4" />}
            اختبار الاتصال
          </Button>
          {it.lastTestedAt && (
            <span className="text-[10px] text-muted-foreground">
              آخر اختبار: {new Date(it.lastTestedAt).toLocaleString('ar-SA', { dateStyle: 'short', timeStyle: 'short' })}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Copy, Megaphone, Pause, Play, Plus, Tag, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { PageHeader } from '@/components/page-header';
import { StatsCard } from '@/components/stats-card';
import { FadeIn } from '@/components/ui/fade-in';
import {
  PROMOTIONS, formatDate, type Promotion, type PromoStatus,
} from '@naqla/shared-utils';

const STATUS_BADGE: Record<PromoStatus, 'default' | 'success' | 'warning' | 'destructive' | 'outline'> = {
  ACTIVE: 'success', PAUSED: 'warning', EXPIRED: 'outline', DRAFT: 'default',
};

export default function PromotionsPage() {
  const t = useTranslations('admin');
  const [items] = useState<Promotion[]>(PROMOTIONS);

  const active   = items.filter((p) => p.status === 'ACTIVE').length;
  const totalUse = items.reduce((s, p) => s + p.usageCount, 0);
  const drafts   = items.filter((p) => p.status === 'DRAFT').length;

  const copy = (code: string) => {
    if (typeof navigator !== 'undefined') navigator.clipboard?.writeText(code);
  };

  return (
    <>
      <PageHeader
        eyebrow={t('promotions.eyebrow')}
        title={t('promotions.title')}
        subtitle={t('promotions.subtitle')}
        actions={
          <Button>
            <Plus className="h-4 w-4" /> {t('promotions.newCampaign')}
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard label={t('promotions.totalCampaigns')} value={items.length} icon={Megaphone} index={0} />
        <StatsCard label={t('promotions.active')} value={active} icon={Play} tone="success" index={1} />
        <StatsCard label={t('promotions.totalUses')} value={totalUse} icon={Tag} index={2} />
        <StatsCard label={t('promotions.drafts')} value={drafts} icon={Pause} tone="warning" index={3} />
      </div>

      <FadeIn delay={0.1}>
      <Card>
        <CardContent className="p-0">
          {/* Mobile: app-like card list */}
          <div className="md:hidden divide-y">
            {items.map((p) => (
              <div key={p.id} className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => copy(p.code)}
                    className="inline-flex items-center gap-2 font-mono text-sm bg-muted px-2 py-1 rounded hover:bg-muted/60"
                    title={t('promotions.copy')}
                  >
                    {p.code}
                    <Copy className="h-3 w-3 text-muted-foreground" />
                  </button>
                  <Badge variant={STATUS_BADGE[p.status]}>{t(`promotions.status.${p.status}`)}</Badge>
                </div>
                <div className="mt-2 text-sm">{p.description}</div>
                <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                  <Badge variant="outline">{t(`promotions.audience.${p.audience}`)}</Badge>
                  <span className="text-xs text-muted-foreground">{t(`promotions.kind.${p.kind}`)}</span>
                  <span className="num text-xs font-medium">
                    {p.kind === 'PERCENTAGE_OFF' ? `${p.value}%` :
                     p.kind === 'FIXED_AMOUNT'   ? t('promotions.fixedAmount', { value: p.value }) :
                     t('promotions.fullWaiver')}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="text-xs">
                    <span className="num font-medium">{p.usageCount.toLocaleString('en-US')}</span>
                    {p.usageLimit && (
                      <span className="text-muted-foreground"> / {p.usageLimit.toLocaleString('en-US')}</span>
                    )}
                    <span className="text-muted-foreground"> · {formatDate(p.startsAt, 'd MMM')} ← {formatDate(p.endsAt, 'd MMM yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {p.status === 'ACTIVE' ? (
                      <Button size="sm" variant="ghost" title={t('promotions.pause')}>
                        <Pause className="h-3.5 w-3.5" />
                      </Button>
                    ) : p.status === 'PAUSED' ? (
                      <Button size="sm" variant="ghost" title={t('promotions.activate')}>
                        <Play className="h-3.5 w-3.5" />
                      </Button>
                    ) : null}
                    <Button size="sm" variant="ghost" title={t('promotions.delete')} className="text-destructive hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('promotions.col.code')}</TableHead>
                <TableHead>{t('promotions.col.description')}</TableHead>
                <TableHead>{t('promotions.col.audience')}</TableHead>
                <TableHead>{t('promotions.col.type')}</TableHead>
                <TableHead>{t('promotions.col.value')}</TableHead>
                <TableHead>{t('promotions.col.usage')}</TableHead>
                <TableHead>{t('promotions.col.validity')}</TableHead>
                <TableHead>{t('promotions.col.status')}</TableHead>
                <TableHead className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <button
                      onClick={() => copy(p.code)}
                      className="inline-flex items-center gap-2 font-mono text-sm bg-muted px-2 py-1 rounded hover:bg-muted/60"
                      title={t('promotions.copy')}
                    >
                      {p.code}
                      <Copy className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </TableCell>
                  <TableCell className="max-w-[260px]">
                    <div className="text-sm truncate">{p.description}</div>
                  </TableCell>
                  <TableCell><Badge variant="outline">{t(`promotions.audience.${p.audience}`)}</Badge></TableCell>
                  <TableCell className="text-xs">{t(`promotions.kind.${p.kind}`)}</TableCell>
                  <TableCell className="num font-medium">
                    {p.kind === 'PERCENTAGE_OFF' ? `${p.value}%` :
                     p.kind === 'FIXED_AMOUNT'   ? t('promotions.fixedAmount', { value: p.value }) :
                     t('promotions.fullWaiver')}
                  </TableCell>
                  <TableCell>
                    <div className="text-xs">
                      <span className="num font-medium">{p.usageCount.toLocaleString('en-US')}</span>
                      {p.usageLimit && (
                        <span className="text-muted-foreground"> / {p.usageLimit.toLocaleString('en-US')}</span>
                      )}
                    </div>
                    {p.usageLimit && (
                      <div className="mt-1 h-1 rounded-full bg-muted overflow-hidden w-16">
                        <div className="h-full bg-primary" style={{ width: `${Math.min(100, (p.usageCount / p.usageLimit) * 100)}%` }} />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatDate(p.startsAt, 'd MMM')} ← {formatDate(p.endsAt, 'd MMM yyyy')}
                  </TableCell>
                  <TableCell><Badge variant={STATUS_BADGE[p.status]}>{t(`promotions.status.${p.status}`)}</Badge></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {p.status === 'ACTIVE' ? (
                        <Button size="sm" variant="ghost" title={t('promotions.pause')}>
                          <Pause className="h-3.5 w-3.5" />
                        </Button>
                      ) : p.status === 'PAUSED' ? (
                        <Button size="sm" variant="ghost" title={t('promotions.activate')}>
                          <Play className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                      <Button size="sm" variant="ghost" title={t('promotions.delete')} className="text-destructive hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
      </FadeIn>
    </>
  );
}

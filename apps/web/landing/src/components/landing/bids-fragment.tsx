'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Star, Truck, Clock } from 'lucide-react';

// A believable fragment of the carrier dashboard's "incoming bids" panel.
// Marked data-ui so the design inspector treats it as a real interface.
const BIDS = [
  { carrier: { ar: 'المسار السريع', en: 'Al-Masar Express' }, rating: 4.9, price: 4200, eta: 18, best: true },
  { carrier: { ar: 'ناقلات الخليج', en: 'Gulf Carriers' },     rating: 4.7, price: 4550, eta: 20, best: false },
  { carrier: { ar: 'أسطول نجد', en: 'Najd Fleet' },            rating: 4.6, price: 4800, eta: 16, best: false },
];

export function BidsFragment({ locale }: { locale: string }) {
  const t = useTranslations('landing.showcase');
  const nf = useMemo(
    () => new Intl.NumberFormat('en-US'),
    [locale],
  );
  const isAr = locale === 'ar';

  return (
    <div
      data-ui
      className="overflow-hidden rounded-xl bg-card text-card-foreground ring-1 ring-black/5"
      style={{ direction: isAr ? 'rtl' : 'ltr' }}
    >
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-4 py-3">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Truck className="h-4 w-4 text-primary" />
          {t('uiTitle')}
        </span>
        <span className="num rounded-full bg-[hsl(var(--mint))]/15 px-2 py-0.5 text-[11px] font-bold text-[hsl(var(--mint))]">
          {nf.format(3)} {t('uiNew')}
        </span>
      </div>
      <div className="divide-y divide-border/50">
        {BIDS.map((b, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 px-4 py-3 ${b.best ? 'bg-[hsl(var(--mint))]/8' : ''}`}
          >
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
              {b.carrier[isAr ? 'ar' : 'en'].split(' ').map((w) => w[0]).slice(0, 2).join('')}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{b.carrier[isAr ? 'ar' : 'en']}</div>
              <div className="num mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-0.5">
                  <Star className="h-3 w-3 fill-[hsl(var(--mint))] text-[hsl(var(--mint))]" />
                  {nf.format(b.rating)}
                </span>
                <span className="flex items-center gap-0.5">
                  <Clock className="h-3 w-3" />
                  {nf.format(b.eta)}{isAr ? ' س' : 'h'}
                </span>
              </div>
            </div>
            <div className="text-end">
              <div className="num text-sm font-extrabold tabular-nums">
                {nf.format(b.price)}
                <span className="text-[10px] font-medium text-muted-foreground"> SAR</span>
              </div>
              <button
                className={`mt-1 rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors ${
                  b.best
                    ? 'bg-[hsl(var(--mint))] text-primary'
                    : 'bg-muted text-foreground hover:bg-secondary'
                }`}
              >
                {t('uiAccept')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

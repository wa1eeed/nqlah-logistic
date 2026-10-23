'use client';

import { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useLocale, useTranslations } from 'next-intl';
import { Plus, Search, Bell, ArrowUpRight, MapPin } from 'lucide-react';

// A premium dark "orders" dashboard preview، the hero product frame.
// Palette is fixed-dark (independent of the page's light theme).
const C = {
  frame: '#0E1117',
  card: '#161C26',
  card2: '#1B2330',
  rowSel: '#0A0D12',
  line: 'rgba(255,255,255,0.07)',
  ink: '#E9EEF2',
  sub: '#8C95A4',
  mint: '#1FE3B0',
  mintInk: '#05241C',
};

const ROWS = [
  { route: { ar: 'الرياض ← جدة', en: 'Riyadh → Jeddah' }, status: 'transit', amount: '3,600', av: 'RJ', tint: '#1FE3B0' },
  { route: { ar: 'الدمام ← الرياض', en: 'Dammam → Riyadh' }, status: 'bidding', amount: '—', av: 'DR', tint: '#5B8CFF' },
  { route: { ar: 'جدة ← مكة', en: 'Jeddah → Makkah' }, status: 'loading', amount: '2,150', av: 'JM', tint: '#F05B8C', sel: true },
  { route: { ar: 'القصيم ← حائل', en: 'Qassim → Hail' }, status: 'done', amount: '1,890', av: 'QH', tint: '#8C7BFF' },
];

export function DashboardMockup() {
  const t = useTranslations('landing.dash');
  const locale = useLocale();
  const isAr = locale === 'ar';
  const ref = useRef<HTMLDivElement>(null);

  // subtle parallax tilt
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [6, -6]), { stiffness: 120, damping: 14 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-7, 7]), { stiffness: 120, damping: 14 });

  const onMove = (e: React.MouseEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const reset = () => { mx.set(0); my.set(0); };

  const statusLabel = (s: string) => t(`status.${s}`);
  const tab = (k: string, active = false) => (
    <span
      key={k}
      className="rounded-full px-3 py-1.5 text-[11px] font-semibold"
      style={active ? { background: C.mint, color: C.mintInk } : { color: C.sub }}
    >
      {t(`tabs.${k}`)}
    </span>
  );

  return (
    <div style={{ perspective: 1200 }} onMouseMove={onMove} onMouseLeave={reset}>
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        style={{ rotateX: rx, rotateY: ry, transformStyle: 'preserve-3d', background: C.frame, color: C.ink }}
        className="overflow-hidden rounded-[22px] p-3 shadow-2xl sm:p-4"
        dir={isAr ? 'rtl' : 'ltr'}
      >
        {/* top bar */}
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg" style={{ background: C.mint, color: C.mintInk }}>
            <MapPin className="h-3.5 w-3.5" />
          </span>
          <div className="flex items-center gap-0.5 rounded-full px-1 py-0.5" style={{ background: C.card }}>
            {tab('overview')}{tab('orders', true)}{tab('bids')}{tab('payments')}
          </div>
          <div className="ms-auto flex items-center gap-1.5">
            {[Search, Bell].map((Icon, i) => (
              <span key={i} className="grid h-7 w-7 place-items-center rounded-lg" style={{ background: C.card }}>
                <Icon className="h-3.5 w-3.5" style={{ color: C.sub }} />
              </span>
            ))}
            <span className="h-7 w-7 rounded-full" style={{ background: C.mint }} />
          </div>
        </div>

        {/* title */}
        <div className="mt-4 flex items-center justify-between">
          <h3 className="text-xl font-bold sm:text-2xl">{t('title')}</h3>
          <span className="num flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold" style={{ background: C.mint, color: C.mintInk }}>
            <Plus className="h-3 w-3" /> {t('newOrder')}
          </span>
        </div>

        {/* stat row */}
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {([
            ['inProgress', '12'],
            ['completed', '128'],
            ['avgBid', '4'],
          ] as const).map(([k, v]) => (
            <div key={k} className="rounded-xl p-3" style={{ background: C.card }}>
              <div className="text-[10px]" style={{ color: C.sub }}>{t(`stat.${k}`)}</div>
              <div className="num mt-1 text-lg font-extrabold">{v}{k === 'avgBid' ? <span className="text-[10px] font-medium" style={{ color: C.sub }}> {t('min')}</span> : null}</div>
            </div>
          ))}
          <div className="rounded-xl p-3" style={{ background: C.mint, color: C.mintInk }}>
            <div className="text-[10px] opacity-70">{t('stat.payout')}</div>
            <div className="num mt-1 text-lg font-extrabold">214,390</div>
          </div>
        </div>

        {/* body: table + detail */}
        <div className="mt-2 grid grid-cols-1 gap-2 lg:grid-cols-5">
          {/* white table card */}
          <div className="rounded-xl bg-white p-3 lg:col-span-3" style={{ color: '#0E1117' }}>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold">{t('activeShipments')}</span>
              <span className="num rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-bold">4</span>
            </div>
            <div className="space-y-1">
              {ROWS.map((r) => (
                <div
                  key={r.av}
                  className="flex items-center gap-2.5 rounded-lg px-2 py-2"
                  style={r.sel ? { background: C.rowSel, color: C.ink } : {}}
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white" style={{ background: r.tint }}>
                    {r.av}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold">{r.route[isAr ? 'ar' : 'en']}</span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={
                      r.status === 'transit' || r.status === 'loading'
                        ? { background: C.mint, color: C.mintInk }
                        : r.sel ? { background: 'rgba(255,255,255,0.1)', color: C.sub } : { background: 'rgba(0,0,0,0.06)', color: '#5B6472' }
                    }
                  >
                    {statusLabel(r.status)}
                  </span>
                  <span className="num w-14 shrink-0 text-end text-xs font-extrabold">{r.amount}</span>
                </div>
              ))}
            </div>
          </div>

          {/* detail panel */}
          <div className="rounded-xl p-3 lg:col-span-2" style={{ background: C.card }}>
            <div className="flex items-center justify-between">
              <span className="num text-sm font-extrabold">#SH-427</span>
              <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: C.mint, color: C.mintInk }}>{statusLabel('loading')}</span>
            </div>
            <div className="mt-1 text-[11px]" style={{ color: C.sub }}>{t('company')}</div>
            <div className="mt-3 grid grid-cols-3 gap-1.5">
              {([['distance', '950'], ['weight', '24'], ['commission', '8%']] as const).map(([k, v]) => (
                <div key={k} className="rounded-lg p-2" style={{ background: C.card2 }}>
                  <div className="num text-sm font-extrabold">{v}</div>
                  <div className="text-[9px]" style={{ color: C.sub }}>{t(`detail.${k}`)}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-1.5 border-t pt-3 text-[11px]" style={{ borderColor: C.line }}>
              {([['total', '3,600'], ['fee', '288'], ['due', '3,312']] as const).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between">
                  <span style={{ color: C.sub }}>{t(`detail.${k}`)}</span>
                  <span className="num font-bold">{v}</span>
                </div>
              ))}
            </div>
            <button className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg py-2 text-xs font-bold" style={{ background: C.mint, color: C.mintInk }}>
              {t('track')} <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

'use client';

import { useEffect, useState, useRef } from 'react';
import { AnimatePresence, motion, useInView } from 'framer-motion';
import { useLocale, useTranslations } from 'next-intl';
import { ChevronLeft } from 'lucide-react';

type Kind = 'real' | 'flat';
const TYPES: { key: string; img: string; kind: Kind }[] = [
  { key: 'van',       img: '/img/fleet/van.webp',          kind: 'real' },
  { key: 'box',       img: '/img/fleet/box-truck.webp',    kind: 'real' },
  { key: 'curtain',   img: '/img/fleet/curtain-semi.webp', kind: 'real' },
  { key: 'lowboy',    img: '/img/fleet/lowboy.png',        kind: 'flat' },
  { key: 'dryVan',    img: '/img/fleet/dry-van.png',       kind: 'flat' },
  { key: 'livestock', img: '/img/fleet/livestock.png',     kind: 'flat' },
  { key: 'flatbed',   img: '/img/fleet/flatbed.png',       kind: 'flat' },
];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function FleetConfigurator() {
  const t = useTranslations('landing.fleet');
  const locale = useLocale();
  const isAr = locale === 'ar';
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: '-80px' });

  useEffect(() => {
    if (!auto || !inView) return;
    const id = setInterval(() => setActive((a) => (a + 1) % TYPES.length), 3800);
    return () => clearInterval(id);
  }, [auto, inView]);

  const cur = TYPES[active];
  const dir = isAr ? -1 : 1;

  return (
    <div ref={ref} className="grid grid-cols-1 overflow-hidden rounded-2xl bg-card shadow-tile md:grid-cols-5">
      {/* Stage */}
      <div className="relative order-2 min-h-[360px] overflow-hidden md:order-1 md:col-span-3">
        {/* soft brand spotlight */}
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-[70%] w-[75%] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: 'hsl(var(--mint) / 0.14)', filter: 'blur(70px)' }}
        />
        {/* type name, large */}
        <div className="absolute inset-x-0 top-0 z-10 p-6 sm:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={cur.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35 }}
            >
              <h3 className="text-3xl font-extrabold tracking-tight text-primary sm:text-4xl">{t(cur.key)}</h3>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">{t(`desc${cap(cur.key)}`)}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* truck stage */}
        <div className="absolute inset-0 flex items-end justify-center pb-10">
          <AnimatePresence mode="wait">
            <motion.img
              key={cur.img}
              src={cur.img}
              alt={t(cur.key)}
              initial={{ opacity: 0, x: dir * 70 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -70 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-[1] max-h-[220px] w-auto max-w-[88%] object-contain sm:max-h-[260px]"
            />
          </AnimatePresence>
          {/* ground shadow */}
          <div
            className="pointer-events-none absolute bottom-8 left-1/2 h-5 w-[60%] -translate-x-1/2 rounded-[50%]"
            style={{ background: 'hsl(174 45% 16% / 0.18)', filter: 'blur(14px)' }}
          />
        </div>

        {/* progress dots */}
        <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
          {TYPES.map((tp, i) => (
            <button
              key={tp.key}
              aria-label={t(tp.key)}
              onClick={() => { setActive(i); setAuto(false); }}
              className={`h-1.5 rounded-full transition-all ${i === active ? 'w-6 bg-[hsl(var(--mint))]' : 'w-1.5 bg-border'}`}
            />
          ))}
        </div>
      </div>

      {/* Selector list */}
      <div className="order-1 flex flex-col bg-secondary/50 p-2 md:order-2 md:col-span-2">
        {TYPES.map((tp, i) => {
          const isActive = i === active;
          return (
            <button
              key={tp.key}
              onClick={() => { setActive(i); setAuto(false); }}
              className={`group flex items-center gap-3 rounded-xl p-3 text-start transition-colors ${
                isActive ? 'bg-card shadow-tile' : 'hover:bg-card/60'
              }`}
            >
              <span className={`grid h-12 w-16 shrink-0 place-items-center overflow-hidden rounded-lg ${isActive ? 'bg-[hsl(var(--mint))]/10' : 'bg-card/70'}`}>
                <img src={tp.img} alt="" className="max-h-9 w-auto object-contain" />
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block truncate text-sm font-bold ${isActive ? 'text-primary' : 'text-foreground'}`}>{t(tp.key)}</span>
                <span className="block truncate text-xs text-muted-foreground">{t(`desc${cap(tp.key)}`)}</span>
              </span>
              <ChevronLeft
                className={`h-4 w-4 shrink-0 transition-all ${isAr ? '' : 'rotate-180'} ${
                  isActive ? 'text-[hsl(var(--mint))] opacity-100' : 'text-muted-foreground opacity-0 group-hover:opacity-100'
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { ArrowLeftRight, MapPin, Truck } from 'lucide-react';
import {
  CITIES, CITY_MAP, project, haversineKm, estimatePrice, carriersOnLane,
  type CityKey, type CargoKey,
} from '@/lib/cities';

const CARGOS: CargoKey[] = ['general', 'refrigerated', 'heavy', 'containers'];

export function LiveQuote({
  locale,
  clientUrl,
}: {
  locale: string;
  clientUrl: string;
}) {
  const t = useTranslations('landing.quote');
  const [from, setFrom] = useState<CityKey>('riyadh');
  const [to, setTo] = useState<CityKey>('jeddah');
  const [cargo, setCargo] = useState<CargoKey>('general');

  const nf = useMemo(
    () => new Intl.NumberFormat('en-US'),
    [locale],
  );

  const a = CITY_MAP[from];
  const b = CITY_MAP[to];
  const km = useMemo(() => Math.round(haversineKm(a, b)), [a, b]);
  const price = useMemo(() => estimatePrice(km, cargo), [km, cargo]);
  const carriers = useMemo(() => carriersOnLane(a, b), [a, b]);

  const pa = project(a);
  const pb = project(b);

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  return (
    <div className="flex h-full flex-col gap-4 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-bold text-primary-foreground sm:text-lg">{t('from')} → {t('to')}</h3>
        <span className="num flex items-center gap-1.5 rounded-full bg-[hsl(var(--mint))]/15 px-2.5 py-1 text-xs font-semibold text-[hsl(var(--mint))]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[hsl(var(--mint))]" />
          {nf.format(carriers)} {t('biddingNow')}
        </span>
      </div>

      {/* Route selectors */}
      <div className="flex items-end gap-2">
        <label className="flex-1">
          <span className="mb-1 block text-xs text-white/60">{t('from')}</span>
          <CitySelect value={from} onChange={setFrom} exclude={to} locale={locale} />
        </label>
        <button
          type="button"
          onClick={swap}
          aria-label="swap"
          className="mb-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white/10 text-white transition-colors hover:bg-white/20"
        >
          <ArrowLeftRight className="h-4 w-4" />
        </button>
        <label className="flex-1">
          <span className="mb-1 block text-xs text-white/60">{t('to')}</span>
          <CitySelect value={to} onChange={setTo} exclude={from} locale={locale} />
        </label>
      </div>

      {/* Cargo chips */}
      <div className="flex flex-wrap gap-1.5">
        {CARGOS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCargo(c)}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              cargo === c
                ? 'bg-[hsl(var(--mint))] text-primary'
                : 'bg-white/10 text-white/70 hover:bg-white/15'
            }`}
          >
            {t(
              c === 'general' ? 'cargoGeneral'
              : c === 'refrigerated' ? 'cargoRefrigerated'
              : c === 'heavy' ? 'cargoHeavy'
              : 'cargoContainers',
            )}
          </button>
        ))}
      </div>

      {/* Map + route */}
      <div className="relative flex-1 overflow-hidden rounded-xl bg-primary/40 ring-1 ring-white/10">
        <RouteMap pa={pa} pb={pb} />
      </div>

      {/* Result */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-xs text-white/60">{t('estimate')}</div>
          <div className="num text-2xl font-extrabold text-white sm:text-3xl">
            {nf.format(price)}{' '}
            <span className="text-base font-semibold text-[hsl(var(--mint))]">SAR</span>
          </div>
        </div>
        <div className="text-end">
          <div className="text-xs text-white/60">{t('distance')}</div>
          <div className="num text-lg font-bold text-white">
            {nf.format(km)} <span className="text-sm font-normal text-white/60">{t('km')}</span>
          </div>
        </div>
      </div>

      <a
        href={`${clientUrl}/login`}
        className="glow-mint block rounded-xl bg-[hsl(var(--mint))] py-3 text-center text-sm font-bold text-primary transition-transform hover:scale-[1.01] active:scale-[0.99]"
      >
        {t('cta')}
      </a>
      <p className="text-center text-[11px] leading-snug text-white/45">{t('disclaimer')}</p>
    </div>
  );
}

function CitySelect({
  value, onChange, exclude, locale,
}: {
  value: CityKey;
  onChange: (c: CityKey) => void;
  exclude: CityKey;
  locale: string;
}) {
  const tc = useTranslations('landing.quote.cities');
  return (
    <div className="relative">
      <MapPin className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--mint))] ltr:left-2.5 rtl:right-2.5" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as CityKey)}
        className="w-full appearance-none rounded-lg bg-white/10 py-2.5 text-sm font-semibold text-white outline-none ring-1 ring-white/10 focus:ring-[hsl(var(--mint))] ltr:pl-8 ltr:pr-3 rtl:pr-8 rtl:pl-3"
        style={{ direction: locale === 'ar' ? 'rtl' : 'ltr' }}
      >
        {CITIES.filter((c) => c.key !== exclude).map((c) => (
          <option key={c.key} value={c.key} className="text-primary">
            {tc(c.key)}
          </option>
        ))}
      </select>
    </div>
  );
}

function RouteMap({ pa, pb }: { pa: { x: number; y: number }; pb: { x: number; y: number } }) {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" preserveAspectRatio="xMidYMid slice">
      {/* faint dot grid as desert texture */}
      <defs>
        <pattern id="dots" width="6" height="6" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.5" fill="white" opacity="0.08" />
        </pattern>
      </defs>
      <rect width="100" height="100" fill="url(#dots)" />

      {/* all city nodes */}
      {CITIES.map((c) => {
        const p = project(c);
        return <circle key={c.key} cx={p.x} cy={p.y} r="0.9" fill="white" opacity="0.25" />;
      })}

      {/* route line (animated draw) */}
      <motion.line
        x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
        stroke="hsl(var(--mint))"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeDasharray="3 3"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        key={`${pa.x}-${pb.x}`}
      />

      {/* endpoints */}
      <circle cx={pa.x} cy={pa.y} r="2" fill="hsl(var(--mint))" />
      <circle cx={pb.x} cy={pb.y} r="2" fill="white" />

      {/* moving truck dot */}
      <motion.circle
        r="1.6"
        fill="white"
        initial={{ cx: pa.x, cy: pa.y }}
        animate={{ cx: [pa.x, pb.x], cy: [pa.y, pb.y] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', repeatType: 'reverse' }}
        key={`truck-${pa.x}-${pb.x}`}
      />
    </svg>
  );
}

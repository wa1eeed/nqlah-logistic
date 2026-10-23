'use client';

import { useTranslations } from 'next-intl';

const FLEET: [string, string][] = [
  ['van', '/img/fleet/van.webp'],
  ['box', '/img/fleet/box-truck.webp'],
  ['curtain', '/img/fleet/curtain-semi.webp'],
  ['lowboy', '/img/fleet/lowboy.png'],
  ['dryVan', '/img/fleet/dry-van.png'],
  ['livestock', '/img/fleet/livestock.png'],
  ['flatbed', '/img/fleet/flatbed.png'],
];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function FleetCarousel() {
  const t = useTranslations('landing.fleet');
  return (
    <div
      className="truck-marquee relative overflow-hidden"
      dir="ltr"
      style={{
        WebkitMaskImage: 'linear-gradient(to left, transparent, #000 6%, #000 94%, transparent)',
        maskImage: 'linear-gradient(to left, transparent, #000 6%, #000 94%, transparent)',
      }}
    >
      <div className="truck-marquee-track flex w-max py-1">
        {[...FLEET, ...FLEET, ...FLEET, ...FLEET].map(([k, src], i) => (
          <div
            key={i}
            dir="rtl"
            className="me-3 w-56 shrink-0 rounded-2xl border border-border/70 bg-card p-5 shadow-tile"
          >
            <div className="grid h-24 place-items-center">
              <img src={src} alt={t(k)} loading="lazy" className="max-h-20 w-auto object-contain" />
            </div>
            <h3 className="mt-2 text-center text-sm font-bold">{t(k)}</h3>
            <p className="mt-1 text-center text-xs leading-snug text-muted-foreground">{t(`desc${cap(k)}`)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

'use client';

// A continuous, interactive strip of the different truck types sliding side by
// side — used inside the "direct request" feature card. Pauses on hover.
const TRUCKS = [
  '/img/fleet/van.webp',
  '/img/fleet/box-truck.webp',
  '/img/fleet/curtain-semi.webp',
  '/img/fleet/lowboy.png',
  '/img/fleet/flatbed.png',
  '/img/fleet/dry-van.png',
  '/img/fleet/livestock.png',
];

export function TruckMarquee() {
  return (
    <div
      className="truck-marquee relative overflow-hidden"
      style={{
        WebkitMaskImage: 'linear-gradient(to left, transparent, #000 10%, #000 90%, transparent)',
        maskImage: 'linear-gradient(to left, transparent, #000 10%, #000 90%, transparent)',
      }}
    >
      <div className="truck-marquee-track flex w-max items-end gap-10" dir="ltr">
        {[...TRUCKS, ...TRUCKS].map((src, i) => (
          <img
            key={i}
            src={src}
            alt=""
            loading="lazy"
            className="h-20 w-auto shrink-0 object-contain sm:h-24"
          />
        ))}
      </div>
    </div>
  );
}

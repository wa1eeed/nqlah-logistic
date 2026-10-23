'use client';

import { motion } from 'framer-motion';
import { CITY_MAP, project, type CityKey } from '@/lib/cities';

// A live logistics network behind the hero: Saudi cities linked by flowing
// routes with traveling packets، the marketplace spanning the Kingdom.
const LINKS: [CityKey, CityKey][] = [
  ['riyadh', 'jeddah'], ['riyadh', 'dammam'], ['riyadh', 'abha'],
  ['riyadh', 'tabuk'], ['riyadh', 'qassim'], ['jeddah', 'makkah'],
  ['dammam', 'jubail'], ['qassim', 'hail'], ['madinah', 'tabuk'],
  ['riyadh', 'madinah'],
];
const PACKETS: [CityKey, CityKey, number][] = [
  ['riyadh', 'jeddah', 0], ['dammam', 'riyadh', 1.1], ['riyadh', 'abha', 2.2],
];

export function HeroNetwork() {
  const p = (k: CityKey) => project(CITY_MAP[k]);
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      className="h-full w-full"
      aria-hidden
      style={{
        WebkitMaskImage: 'radial-gradient(ellipse 65% 60% at 50% 45%, #000 35%, transparent 80%)',
        maskImage: 'radial-gradient(ellipse 65% 60% at 50% 45%, #000 35%, transparent 80%)',
      }}
    >
      {/* links */}
      {LINKS.map(([a, b], i) => {
        const pa = p(a), pb = p(b);
        return (
          <line
            key={i}
            x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
            stroke="hsl(var(--mint))" strokeWidth="0.25" strokeOpacity="0.4"
            strokeDasharray="1.4 2.4" className="route-line"
            style={{ animationDelay: `${(i % 5) * 0.3}s` }}
          />
        );
      })}

      {/* nodes */}
      {Object.keys(CITY_MAP).map((k) => {
        const pt = p(k as CityKey);
        const hub = k === 'riyadh';
        return (
          <g key={k}>
            <motion.circle
              cx={pt.x} cy={pt.y} r={hub ? 2.4 : 1.6}
              fill="hsl(var(--mint))" fillOpacity="0.12"
              animate={{ scale: [1, 1.8, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2.6, repeat: Infinity, delay: Math.random() * 2 }}
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            />
            <circle cx={pt.x} cy={pt.y} r={hub ? 1.1 : 0.7} fill="hsl(var(--mint))" fillOpacity={hub ? 0.9 : 0.6} />
          </g>
        );
      })}

      {/* traveling packets */}
      {PACKETS.map(([a, b, delay], i) => {
        const pa = p(a), pb = p(b);
        return (
          <motion.circle
            key={i} r="0.9" fill="hsl(var(--primary))"
            animate={{ cx: [pa.x, pb.x], cy: [pa.y, pb.y], opacity: [0, 1, 1, 0] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: 'linear', delay, times: [0, 0.1, 0.9, 1] }}
          />
        );
      })}
    </svg>
  );
}

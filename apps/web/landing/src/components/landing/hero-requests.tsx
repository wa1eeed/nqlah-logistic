'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Package } from 'lucide-react';

// Live-looking shipment requests floating over the hero network — conveys an
// active, open freight marketplace.
const SETS: [string, string][] = [
  ['الرياض ← جدة', 'طلب جديد'],
  ['الدمام ← الرياض', '5 عروض'],
  ['جدة ← مكة', 'قيد التفاوض'],
  ['القصيم ← حائل', 'طلب جديد'],
  ['تبوك ← المدينة', '3 عروض'],
  ['أبها ← الرياض', 'طلب جديد'],
];

function FloatChip({ className, start, delay }: { className: string; start: number; delay: number }) {
  const [i, setI] = useState(start);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 3) % SETS.length), 3200);
    return () => clearInterval(t);
  }, []);
  const [route, status] = SETS[i];
  return (
    <motion.div
      className={`absolute ${className}`}
      animate={{ y: [0, -7, 0] }}
      transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0.9, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.3)] ring-1 ring-black/5"
        >
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[hsl(var(--mint))]/15 text-[hsl(var(--mint))]">
            <Package className="h-3 w-3" />
          </span>
          <span className="whitespace-nowrap text-xs font-bold text-[#0E1117]">{route}</span>
          <span className="whitespace-nowrap text-[10px] font-medium text-[hsl(var(--mint))]">{status}</span>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

export function HeroRequests() {
  return (
    <div className="pointer-events-none absolute inset-0 z-[1] hidden md:block" aria-hidden>
      <FloatChip start={0} delay={0}   className="top-[16%] ltr:left-[5%] rtl:right-[5%]" />
      <FloatChip start={2} delay={0.8} className="top-[30%] ltr:right-[6%] rtl:left-[6%]" />
      <FloatChip start={4} delay={1.6} className="bottom-[20%] ltr:left-[9%] rtl:right-[9%]" />
    </div>
  );
}

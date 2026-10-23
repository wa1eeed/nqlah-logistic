'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Radio, CheckCircle2, MessageSquare, Wallet, UserRound } from 'lucide-react';

const TRUCKS = [
  '/img/fleet/van.webp', '/img/fleet/box-truck.webp', '/img/fleet/curtain-semi.webp',
  '/img/fleet/lowboy.png', '/img/fleet/flatbed.png', '/img/fleet/dry-van.png', '/img/fleet/livestock.png',
];

type Notif = { type: 'push' | 'sms'; icon: typeof Radio; title: string; msg: string; time: string };
const NOTIFS: Notif[] = [
  { type: 'push', icon: Radio,        title: 'طلب شحنة جديد: الرياض ← جدة',   msg: 'شركة الجزيرة للطاقة', time: 'الآن' },
  { type: 'sms',  icon: CheckCircle2, title: 'قُبل عرضك على شحنة الدمام ← الرياض', msg: 'مؤسسة الواحة للأغذية', time: 'قبل دقيقة' },
  { type: 'push', icon: CheckCircle2, title: 'تم تأكيد التسليم بنجاح',          msg: 'شحنة ORD-2025-0142', time: 'قبل 4 د' },
  { type: 'push', icon: Wallet,       title: 'دفعة بانتظار التحصيل: 3,600 ريال', msg: 'تحويل بنكي خلال الدورة الأسبوعية', time: 'قبل 7 د' },
  { type: 'push', icon: Radio,        title: 'طلب شحنة جديد: جدة ← مكة',       msg: 'شركة المسار السريع للنقل', time: 'قبل 9 د' },
  { type: 'sms',  icon: MessageSquare, title: 'سائق متاح على خط القصيم ← حائل',  msg: 'أسطول نجد', time: 'قبل 15 د' },
];

export function DirectRequestScene() {
  const [items, setItems] = useState(() => [{ id: 1, i: 1 }, { id: 0, i: 0 }]);
  const idRef = useRef(2);

  useEffect(() => {
    const t = setInterval(() => {
      const nid = idRef.current++;
      setItems((prev) => [{ id: nid, i: nid % NOTIFS.length }, ...prev].slice(0, 2));
    }, 2600);
    return () => clearInterval(t);
  }, []);

  const mask = 'linear-gradient(to left, transparent, #000 8%, #000 92%, transparent)';

  return (
    <div className="relative flex h-60 flex-col overflow-hidden rounded-xl bg-secondary/40">
      {/* notifications region — clipped to its own area so switching never covers the trucks */}
      <div className="relative flex-1 overflow-hidden p-3">
        <div className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {items.map((it, pos) => {
            const n = NOTIFS[it.i];
            const Icon = n.icon;
            const isSms = n.type === 'sms';
            return (
              <motion.div
                key={it.id}
                layout
                initial={{ opacity: 0, y: -14, scale: 0.96 }}
                animate={{ opacity: pos === 0 ? 1 : 0.45, y: 0, scale: pos === 0 ? 1 : 0.96 }}
                exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.25 } }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-start gap-2.5 rounded-2xl bg-white p-2.5 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.25)] ring-1 ring-black/5"
              >
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${isSms ? 'bg-primary text-white' : 'bg-[hsl(var(--mint))] text-primary'}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1 text-start">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1 truncate text-[11px] font-bold text-[#0E1117]">
                      {isSms ? <MessageSquare className="h-3 w-3 text-primary" /> : <UserRound className="h-3 w-3 text-[hsl(var(--mint))]" />}
                      {isSms ? 'رسالة نصية' : 'نقلة لوجيستك'}
                    </span>
                    <span className="shrink-0 text-[10px] text-slate-400">{n.time}</span>
                  </div>
                  <p className="mt-0.5 truncate text-[11px] font-semibold text-[#0E1117]">{n.title}</p>
                  <p className="truncate text-[10px] text-slate-500">{n.msg}</p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        </div>
      </div>

      {/* continuous trucks — a separate bottom strip the notifications never overlap */}
      <div className="relative h-24 shrink-0 overflow-hidden" dir="ltr" style={{ WebkitMaskImage: mask, maskImage: mask }}>
        <div className="truck-marquee-track flex w-max items-end pb-3">
          {[...TRUCKS, ...TRUCKS, ...TRUCKS, ...TRUCKS].map((src, i) => (
            <img key={i} src={src} alt="" className="me-4 h-16 w-auto shrink-0 object-contain sm:h-20" />
          ))}
        </div>
      </div>
    </div>
  );
}

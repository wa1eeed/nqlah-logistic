'use client';
import { useState } from 'react';
import { Megaphone, X } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * A dismissible promotional banner, shown only when the `promoBanner` feature
 * flag is on (toggled server-side from the admin). Purely additive — it never
 * gates existing content.
 */
export function PromoBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 rounded-2xl border border-[hsl(var(--mint))]/20 bg-[hsl(var(--mint))]/10 p-4"
    >
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[hsl(var(--mint))]/15 text-[hsl(var(--mint))]">
        <Megaphone className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">عروض وخصومات حصرية</p>
        <p className="mt-0.5 text-xs text-muted-foreground">تابع أحدث العروض على شحناتك داخل المنصة.</p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        aria-label="إغلاق"
        className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
}

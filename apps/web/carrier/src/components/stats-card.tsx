'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StatsCardProps {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon: LucideIcon;
  tone?: 'default' | 'success' | 'warning' | 'danger';
  /** optional trend chip, e.g. +12% */
  delta?: { value: string; up?: boolean };
}

const TONE: Record<NonNullable<StatsCardProps['tone']>, string> = {
  default: 'bg-[hsl(var(--mint))]/12 text-[hsl(var(--mint))]',
  success: 'bg-success/12 text-success',
  warning: 'bg-warning/12 text-warning',
  danger:  'bg-destructive/12 text-destructive',
};

function AnimatedCounter({ value }: { value: number }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    if (value === 0) { setCount(0); return; }
    const step = value / (900 / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= value) { setCount(value); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [value]);
  return <>{count.toLocaleString('en-US')}</>;
}

export function StatsCard({ label, value, hint, icon: Icon, tone = 'default', delta }: StatsCardProps) {
  const isNumeric = typeof value === 'number';
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="group rounded-2xl border border-border/70 bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_34px_-20px_hsl(174_45%_16%/0.22)]"
    >
      <div className="flex items-center justify-between">
        <div className={cn('grid h-11 w-11 place-items-center rounded-xl', TONE[tone])}>
          <Icon className="h-5 w-5" />
        </div>
        {delta && (
          <span className={cn(
            'num inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold',
            delta.up ? 'bg-success/12 text-success' : 'bg-destructive/12 text-destructive',
          )}>
            {delta.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {delta.value}
          </span>
        )}
      </div>
      <div className="mt-4 num text-3xl font-extrabold tracking-tight text-foreground">
        {isNumeric ? <AnimatedCounter value={value as number} /> : value}
      </div>
      <p className="mt-1 text-sm font-medium text-muted-foreground">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground/70">{hint}</p>}
    </motion.div>
  );
}

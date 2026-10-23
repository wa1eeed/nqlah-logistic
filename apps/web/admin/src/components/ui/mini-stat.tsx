'use client';

import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface MiniStatProps {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'muted';
  index?: number;
}

const TONE: Record<NonNullable<MiniStatProps['tone']>, string> = {
  default: 'bg-[hsl(var(--mint))]/12 text-[hsl(var(--mint))]',
  success: 'bg-success/12 text-success',
  warning: 'bg-warning/12 text-warning',
  danger:  'bg-destructive/12 text-destructive',
  muted:   'bg-muted text-muted-foreground',
};

/** Compact KPI tile for dense toolbar rows (smaller than StatsCard). */
export function MiniStat({ label, value, icon: Icon, tone = 'default', index = 0 }: MiniStatProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut', delay: index * 0.04 }}
      className="flex items-center gap-3 rounded-xl border border-border/70 bg-card px-4 py-3 shadow-[var(--shadow-card)]"
    >
      {Icon && (
        <div className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-lg', TONE[tone])}>
          <Icon className="h-4 w-4" />
        </div>
      )}
      <div className="min-w-0">
        <div className="num text-lg font-bold leading-tight tracking-tight">{value}</div>
        <div className="truncate text-xs text-muted-foreground">{label}</div>
      </div>
    </motion.div>
  );
}

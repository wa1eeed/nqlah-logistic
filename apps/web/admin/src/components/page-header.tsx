'use client';

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

export interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** small uppercase label above the title */
  eyebrow?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, eyebrow, actions }: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="flex flex-col gap-3 pb-6 border-b border-border/70 md:flex-row md:items-end md:justify-between"
    >
      <div className="flex flex-col gap-1">
        {eyebrow && (
          <span className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--mint))]">{eyebrow}</span>
        )}
        <h1 className="text-2xl font-bold tracking-tight md:text-[1.75rem]">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </motion.div>
  );
}

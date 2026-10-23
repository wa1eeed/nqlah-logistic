'use client';

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

/** Lightweight entrance wrapper for page sections / cards. */
export function FadeIn({
  children,
  className,
  delay = 0,
  y = 14,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut', delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

'use client';
import { motion } from 'framer-motion';
import { type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Link from 'next/link';

/**
 * The brand-tinted empty-state medallion: a soft mint field with a subtle ring
 * and an inner tile holding the icon in the brand colour. Use it in place of a
 * bare, washed-out icon so an empty list reads as intentional and on-brand.
 */
export function EmptyMedallion({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  return (
    <div className={cn('relative flex h-20 w-20 items-center justify-center', className)}>
      <div className="absolute inset-0 rounded-2xl bg-[hsl(var(--mint))]/5 ring-1 ring-[hsl(var(--mint))]/10" />
      <div className="relative flex h-14 w-14 items-center justify-center rounded-xl bg-[hsl(var(--mint))]/10 text-[hsl(var(--mint))] ring-1 ring-[hsl(var(--mint))]/15">
        <Icon className="h-7 w-7" />
      </div>
    </div>
  );
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; href: string };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
    >
      <EmptyMedallion icon={Icon} className="mb-5" />
      <h3 className="text-base font-semibold">{title}</h3>
      {description && <p className="mt-1.5 text-sm text-muted-foreground max-w-xs">{description}</p>}
      {action && (
        <Link href={action.href} className="mt-5">
          <Button size="sm">{action.label}</Button>
        </Link>
      )}
    </motion.div>
  );
}

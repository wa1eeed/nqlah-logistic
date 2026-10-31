'use client';
import * as React from 'react';
import Link from 'next/link';
import { Lock, Sparkles } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * "Locked but visible" plan gating. A feature the current plan doesn't include
 * is NOT hidden — it stays in place with a lock icon + «Pro» badge, and
 * activating it opens {@link FeatureLockDialog} (which explains the feature and
 * links to the subscription page) instead of performing the action.
 *
 * Wrap any nav entry / card / button:
 *
 *   <LockedFeature
 *     locked={!allowed}
 *     featureName="عملائي"
 *     description="سجِّل عملاءك وأدِر طلباتهم..."
 *     planName={requiredPlanName}
 *   >
 *     {inner}            // icon + label — rendered as-is when unlocked
 *   </LockedFeature>
 *
 * When `locked` is false the children render untouched (zero wrapper).
 */
export interface LockedFeatureProps {
  locked: boolean;
  /** Feature name — dialog title and badge context. */
  featureName: string;
  /** One-line explanation of what the feature does. */
  description: React.ReactNode;
  /** Plan the user must upgrade to (shown in the accent line). */
  planName?: string;
  /** Where «ترقية الباقة» links. Defaults to the subscription page. */
  upgradeHref?: string;
  /** Classes for the locked trigger wrapper (match the unlocked element). */
  className?: string;
  children: React.ReactNode;
}

/** Small lock + «Pro» marker appended to a locked entry. */
export function ProLockBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'relative z-10 inline-flex items-center gap-1 rounded-md bg-[hsl(var(--mint))]/12 px-1.5 py-0.5 text-[10px] font-bold text-[hsl(var(--mint))]',
        className,
      )}
    >
      <Lock className="h-3 w-3" aria-hidden />
      Pro
    </span>
  );
}

export function LockedFeature({
  locked, featureName, description, planName, upgradeHref = '/subscription',
  className, children,
}: LockedFeatureProps) {
  const [open, setOpen] = React.useState(false);

  if (!locked) return <>{children}</>;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${featureName} — ميزة Pro`}
        className={cn('group/lock w-full text-start', className)}
      >
        {children}
        <ProLockBadge className="ms-auto" />
      </button>
      <FeatureLockDialog
        open={open}
        onOpenChange={setOpen}
        featureName={featureName}
        description={description}
        planName={planName}
        upgradeHref={upgradeHref}
      />
    </>
  );
}

export interface FeatureLockDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  featureName: string;
  description: React.ReactNode;
  planName?: string;
  upgradeHref?: string;
}

/**
 * Explains a locked feature and routes to the upgrade page. Built on the shared
 * Radix Dialog — focus trap, Esc-to-close and overlay dismissal come for free.
 */
export function FeatureLockDialog({
  open, onOpenChange, featureName, description, planName, upgradeHref = '/subscription',
}: FeatureLockDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[hsl(var(--mint))]/12 text-[hsl(var(--mint))]">
              <Sparkles className="h-4 w-4" />
            </span>
            {featureName}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {/* Accent-colored availability line — distinct from the body copy. */}
        <p className="rounded-lg bg-[hsl(var(--mint))]/8 px-3 py-2.5 text-sm font-semibold text-[hsl(var(--mint))]">
          هذه الميزة متاحة في الباقة {planName ?? 'الأعلى'}
        </p>

        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>إغلاق</Button>
          <Button asChild>
            <Link href={upgradeHref} onClick={() => onOpenChange(false)}>
              <Sparkles className="h-4 w-4" /> ترقية الباقة
            </Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

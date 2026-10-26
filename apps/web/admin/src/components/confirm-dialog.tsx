'use client';
import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { notify } from '@/lib/notify';

/**
 * Reusable confirmation for destructive actions. `onConfirm` runs the action; the
 * dialog shows a spinner, closes on success, and surfaces errors via the toast.
 * `children` is an optional slot for dependency-resolution controls (e.g. reassign
 * subscribers before deleting a plan).
 */
export function ConfirmDialog({
  open, onOpenChange, title, description, confirmLabel = 'حذف', cancelLabel = 'إلغاء',
  destructive = true, confirmDisabled, onConfirm, children,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  confirmDisabled?: boolean;
  onConfirm: () => Promise<void> | void;
  children?: React.ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try { await onConfirm(); onOpenChange(false); }
    catch (e) { notify.error(e); }
    finally { setBusy(false); }
  };
  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy) onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {destructive && <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />}
            {title}
          </DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>{cancelLabel}</Button>
          <Button variant={destructive ? 'destructive' : 'default'} onClick={run} disabled={busy || confirmDisabled}>
            {busy ? '…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

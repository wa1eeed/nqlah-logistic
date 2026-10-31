'use client';
import * as React from 'react';
import { AlertTriangle } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

/**
 * Imperative confirmation, mirroring the mobile app's `nqConfirm`: every
 * consequential action pops a dialog that states what will happen and waits for
 * an explicit choice. Usage:
 *
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title, description, destructive: true }))) return;
 *   await doTheAction();
 *
 * Mount `<ConfirmProvider>` once near the app root (layout). The promise
 * resolves `true` only when the user presses the confirm button; cancel, Esc,
 * overlay-click and close all resolve `false`.
 */
export interface ConfirmOptions {
  /** Short, action-named heading, e.g. «سحب العرض». */
  title: string;
  /** What happens on confirm (and, where relevant, how to undo it). */
  description?: React.ReactNode;
  /** Confirm button label. Defaults to «تأكيد». */
  confirmLabel?: string;
  /** Cancel button label. Defaults to «إلغاء». */
  cancelLabel?: string;
  /** Red confirm button + warning icon for irreversible / money-moving actions. */
  destructive?: boolean;
}

type Confirm = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = React.createContext<Confirm | null>(null);

/** Returns a `confirm(opts) => Promise<boolean>` function. */
export function useConfirm(): Confirm {
  const ctx = React.useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within a <ConfirmProvider>');
  return ctx;
}

interface Pending {
  opts: ConfirmOptions;
  settle: (ok: boolean) => void;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = React.useState<Pending | null>(null);

  const confirm = React.useCallback<Confirm>((opts) => {
    return new Promise<boolean>((resolve) => {
      setPending({ opts, settle: (ok) => { setPending(null); resolve(ok); } });
    });
  }, []);

  const o = pending?.opts;
  const destructive = o?.destructive ?? false;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={!!pending} onOpenChange={(v) => { if (!v) pending?.settle(false); }}>
        {pending && (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {destructive && <AlertTriangle className="h-5 w-5 shrink-0 text-destructive" />}
                {o?.title}
              </DialogTitle>
              {o?.description && <DialogDescription>{o.description}</DialogDescription>}
            </DialogHeader>
            <DialogFooter className="justify-between sm:justify-between">
              <Button variant="ghost" onClick={() => pending.settle(false)}>
                {o?.cancelLabel ?? 'إلغاء'}
              </Button>
              <Button
                variant={destructive ? 'destructive' : 'default'}
                onClick={() => pending.settle(true)}
                autoFocus
              >
                {o?.confirmLabel ?? 'تأكيد'}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </ConfirmContext.Provider>
  );
}

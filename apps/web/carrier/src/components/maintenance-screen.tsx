'use client';
import { useLocale } from 'next-intl';
import { Wrench, RefreshCw } from 'lucide-react';
import type { MaintenanceState } from '@/lib/use-maintenance';

/**
 * Full-screen maintenance page, shown while the platform is in maintenance mode.
 * Renders the admin's localized message (or a sensible default) and a refresh.
 */
export function MaintenanceScreen({ state }: { state: MaintenanceState }) {
  const locale = useLocale();
  const ar = locale !== 'en';
  const message = (ar ? state.messageAr : state.messageEn).trim();
  const fallback = ar
    ? 'نقوم بأعمال صيانة وتحديثات على المنصة. نعود إليك قريبًا.'
    : 'We are performing maintenance and updates on the platform. We will be back shortly.';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-muted/30 px-6 text-center">
      <div className="grid h-20 w-20 place-items-center rounded-2xl bg-[hsl(var(--mint))]/10 text-[hsl(var(--mint))] ring-1 ring-[hsl(var(--mint))]/15">
        <Wrench className="h-9 w-9" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-extrabold tracking-tight">
          {ar ? 'المنصة تحت الصيانة' : 'Under maintenance'}
        </h1>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">{message || fallback}</p>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="mt-2 inline-flex items-center gap-2 rounded-full border border-border bg-background px-5 py-2 text-sm font-medium transition-colors hover:bg-muted"
      >
        <RefreshCw className="h-4 w-4" />
        {ar ? 'إعادة المحاولة' : 'Try again'}
      </button>
    </div>
  );
}

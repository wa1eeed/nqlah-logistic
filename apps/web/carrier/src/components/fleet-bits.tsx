'use client';
import {
  Activity, AlertTriangle, ArrowRight, CheckCircle2, Flag, Link2, Link2Off, MapPin, Navigation, PowerOff, Wrench,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/status-badge';
import { Currency } from '@/components/currency';
import { cn } from '@/lib/utils';
import { formatDate, formatDateTime, localizeCity, type FleetAuditEvent, type FleetEventType, type TruckTrip } from '@naqla/shared-utils';

/** Driver-worded status labels (StatusBadge's defaults are truck-worded). */
const DRIVER_STATUS_LABEL: Record<string, string> = {
  AVAILABLE: 'متاح',
  ON_TRIP: 'في رحلة',
  OFF_DUTY: 'خارج الخدمة',
};

export function DriverStatusBadge({ status }: { status: string }) {
  return <StatusBadge status={status} label={DRIVER_STATUS_LABEL[status]} />;
}

/**
 * Ownership tag: OWNED (the provider's own fleet) vs FREELANCER (contracted,
 * paid per delivery). FREELANCER is mint-outlined to stand out in lists.
 */
export function OwnershipBadge({ ownership, className }: { ownership: string; className?: string }) {
  const freelancer = ownership === 'FREELANCER';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium',
        freelancer
          ? 'border-[hsl(var(--mint))]/30 bg-[hsl(var(--mint))]/10 text-[hsl(var(--mint))]'
          : 'border-border bg-muted/50 text-muted-foreground',
        className,
      )}
    >
      {freelancer ? <Link2 className="h-3 w-3" /> : <Flag className="h-3 w-3" />}
      {freelancer ? 'فري‑لانسر' : 'تابع'}
    </span>
  );
}

/** Days until `dateStr` and a severity bucket (soon = within `soonDays`). */
export function expiryState(dateStr?: string, soonDays = 60): { days: number; state: 'expired' | 'soon' | 'ok' } | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  const days = Math.ceil((d.getTime() - Date.now()) / 86_400_000);
  return { days, state: days < 0 ? 'expired' : days <= soonDays ? 'soon' : 'ok' };
}

/** Small amber/red chip shown when a licence or inspection is near/past expiry. */
export function ExpiryBadge({ date, soonDays = 60, className }: { date?: string; soonDays?: number; className?: string }) {
  const e = expiryState(date, soonDays);
  if (!e || e.state === 'ok') return null;
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
      e.state === 'expired' ? 'bg-destructive/10 text-destructive' : 'bg-warning/15 text-warning',
      className,
    )}>
      <AlertTriangle className="h-3 w-3" />
      {e.state === 'expired' ? 'منتهية' : `تنتهي خلال ${e.days} يوم`}
    </span>
  );
}

/** +1 year from the last inspection = the next inspection due date. */
export function nextInspection(lastInspection?: string): string | undefined {
  if (!lastInspection) return undefined;
  const d = new Date(lastInspection);
  if (Number.isNaN(d.getTime())) return undefined;
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString();
}

export function ConfirmDialog({
  open, onOpenChange, title, description, confirmLabel = 'تأكيد', destructive, onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-start gap-3">
            {destructive && (
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <AlertTriangle className="h-5 w-5" />
              </span>
            )}
            <div className="space-y-1">
              <DialogTitle>{title}</DialogTitle>
              {description && <DialogDescription>{description}</DialogDescription>}
            </div>
          </div>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button
            className={destructive ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : undefined}
            onClick={() => { onConfirm(); onOpenChange(false); }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const TRUCK_STATUS_OPTIONS = [
  { value: 'AVAILABLE', label: 'متاحة' },
  { value: 'ON_TRIP', label: 'في رحلة' },
  { value: 'MAINTENANCE', label: 'صيانة' },
  { value: 'OFF_DUTY', label: 'خارج الخدمة' },
] as const;

export const DRIVER_STATUS_OPTIONS = [
  { value: 'AVAILABLE', label: 'متاح' },
  { value: 'ON_TRIP', label: 'في رحلة' },
  { value: 'OFF_DUTY', label: 'خارج الخدمة' },
] as const;

export function FleetStatusSelect({
  value, options, onChange, disabled,
}: {
  value: string;
  options: readonly { value: string; label: string }[];
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
      <SelectContent>
        {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

const EVENT_ICON: Record<FleetEventType, React.ComponentType<{ className?: string }>> = {
  ASSIGN: Link2,
  UNASSIGN: Link2Off,
  ONLINE: CheckCircle2,
  OFFLINE: PowerOff,
  TRIP_START: Navigation,
  TRIP_END: Flag,
  MAINTENANCE: Wrench,
  STATUS: Activity,
};

// Mint for positive/active events, muted for negatives — no gold/orange.
const EVENT_TONE: Record<FleetEventType, string> = {
  ASSIGN: 'bg-[hsl(var(--mint))]/15 text-[hsl(var(--mint))]',
  TRIP_START: 'bg-[hsl(var(--mint))]/15 text-[hsl(var(--mint))]',
  TRIP_END: 'bg-[hsl(var(--mint))]/15 text-[hsl(var(--mint))]',
  ONLINE: 'bg-[hsl(var(--mint))]/15 text-[hsl(var(--mint))]',
  UNASSIGN: 'bg-destructive/10 text-destructive',
  OFFLINE: 'bg-muted text-muted-foreground',
  MAINTENANCE: 'bg-muted text-muted-foreground',
  STATUS: 'bg-muted text-muted-foreground',
};

export function TripsTimeline({ trips, emptyLabel = 'لا توجد رحلات بعد' }: { trips: TruckTrip[]; emptyLabel?: string }) {
  if (!trips.length) {
    return <p className="text-sm text-muted-foreground text-center py-10">{emptyLabel}</p>;
  }
  return (
    <ol className="relative space-y-5 before:absolute before:top-2 before:bottom-2 before:start-[7px] before:w-px before:bg-border">
      {trips.map((t) => {
        const active = t.status === 'IN_TRANSIT' || t.status === 'PUBLISHED';
        return (
          <li key={t.orderId} className="relative ps-7">
            <span className={`absolute start-0 top-1 h-3.5 w-3.5 rounded-full border-2 ${active ? 'border-[hsl(var(--mint))] bg-[hsl(var(--mint))]' : 'border-border bg-background'}`} />
            <div
              className="rounded-lg border p-3 hover:bg-muted/40 cursor-pointer transition-colors"
              onClick={() => (window.location.href = `/orders/${t.orderId}`)}
            >
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <span className="font-mono text-xs text-primary">{t.orderId}</span>
                <StatusBadge status={t.status} />
              </div>
              <div className="mt-2 flex items-center gap-2 text-sm font-medium flex-wrap">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                {localizeCity(t.originCity)}
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground rtl:rotate-180" />
                {localizeCity(t.destinationCity)}
                <span className="text-xs text-muted-foreground num">· {t.distanceKm.toLocaleString('en-US')} كم</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-3 flex-wrap text-xs text-muted-foreground">
                <span className="truncate max-w-[200px]">{t.clientName}</span>
                <span className="num">
                  {formatDate(t.startedAt, 'd MMM')} {t.finishedAt ? `← ${formatDate(t.finishedAt, 'd MMM')}` : '· جارية'}
                </span>
              </div>
              <div className="mt-1.5 text-end"><Currency amount={t.amount} /></div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function AuditTimeline({
  events, emptyLabel = 'لا يوجد نشاط', max = 14,
}: {
  events: FleetAuditEvent[];
  emptyLabel?: string;
  max?: number;
}) {
  if (!events.length) {
    return <p className="text-sm text-muted-foreground text-center py-6">{emptyLabel}</p>;
  }
  return (
    <ol className="space-y-3.5">
      {events.slice(0, max).map((e) => {
        const Icon = EVENT_ICON[e.type] ?? Activity;
        return (
          <li key={e.id} className="flex gap-3">
            <span className={`mt-0.5 h-7 w-7 rounded-full grid place-items-center shrink-0 ${EVENT_TONE[e.type] ?? EVENT_TONE.STATUS}`}>
              <Icon className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-snug">{e.message}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                <span className="num">{formatDateTime(e.at)}</span> · {e.actor}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

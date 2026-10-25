import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Variant = 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'outline';

// Carrier-facing variant mapping. Labels resolve via `common.status.<code>`
// so the same status codes render in the active locale (English default).
const MAP: Record<string, Variant> = {
  DRAFT:        'secondary',
  PUBLISHED:    'default',
  BIDDING:      'warning',
  ASSIGNED:     'warning',
  CONFIRMED:    'default',
  IN_TRANSIT:   'success',
  DELIVERED:    'success',
  COMPLETED:    'success',
  CANCELLED:    'destructive',
  DISPUTED:     'warning',

  PENDING_VERIFICATION: 'warning',
  APPROVED:             'success',
  REJECTED:             'destructive',
  ACTIVE:               'success',
  SUSPENDED:            'destructive',

  HELD:     'warning',
  RELEASED: 'success',
  REFUNDED: 'default',
  FAILED:   'destructive',

  ISSUED:   'default',
  PAID:     'success',
  OVERDUE:  'destructive',

  OPEN:         'destructive',
  UNDER_REVIEW: 'warning',
  RESOLVED:     'success',
  CLOSED:       'secondary',

  ACCEPTED:  'success',
  WITHDRAWN: 'secondary',
  EXPIRED:   'destructive',

  // Fleet — truck statuses
  AVAILABLE:   'success',
  ON_TRIP:     'default',
  MAINTENANCE: 'warning',
  OFFLINE:     'secondary',
  INACTIVE:    'secondary',

  // Fleet — driver statuses
  ON_DUTY:  'success',
  OFF_DUTY: 'secondary',
  ON_LEAVE: 'warning',
};

const PULSE_STATUSES = new Set(['PUBLISHED', 'IN_TRANSIT', 'BIDDING', 'ASSIGNED']);

const PULSE_COLOR: Record<string, string> = {
  default: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  destructive: 'bg-destructive',
  secondary: 'bg-muted-foreground',
  outline: 'bg-foreground',
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const t = useTranslations('common');
  const variant = MAP[status] ?? ('secondary' as Variant);
  const resolved = label ?? (status in MAP ? t(`status.${status}`) : status);
  const showPulse = PULSE_STATUSES.has(status);

  return (
    <Badge variant={variant} className="gap-1.5">
      {showPulse && (
        <span className="relative flex h-2 w-2 shrink-0">
          <span
            className={cn(
              'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
              PULSE_COLOR[variant] ?? 'bg-primary',
            )}
          />
          <span
            className={cn(
              'relative inline-flex rounded-full h-2 w-2',
              PULSE_COLOR[variant] ?? 'bg-primary',
            )}
          />
        </span>
      )}
      {resolved}
    </Badge>
  );
}

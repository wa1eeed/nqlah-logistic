import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';

type Variant = 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'outline';

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

  // Fleet (trucks & drivers)
  AVAILABLE:   'success',
  ON_TRIP:     'warning',
  MAINTENANCE: 'warning',
  OFF_DUTY:    'secondary',
  INACTIVE:    'secondary',
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const t = useTranslations('common');
  const variant = MAP[status] ?? ('secondary' as Variant);
  const resolved = label ?? (status in MAP ? t(`status.${status}`) : status);
  return <Badge variant={variant}>{resolved}</Badge>;
}

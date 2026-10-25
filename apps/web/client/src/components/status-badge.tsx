import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';

type Variant = 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'outline';

const ACTIVE_STATUSES = new Set(['PUBLISHED', 'IN_TRANSIT', 'BIDDING', 'ASSIGNED']);

const MAP: Record<string, Variant> = {
  DRAFT:        'secondary',
  PUBLISHED:    'default',
  BIDDING:      'default',
  ASSIGNED:     'default',
  CONFIRMED:    'default',
  IN_TRANSIT:   'success',
  DELIVERED:    'success',
  COMPLETED:    'success',
  CANCELLED:    'destructive',
  DISPUTED:     'destructive',

  PENDING_VERIFICATION: 'secondary',
  APPROVED:             'success',
  REJECTED:             'destructive',
  ACTIVE:               'success',
  SUSPENDED:            'destructive',

  HELD:     'default',
  RELEASED: 'success',
  REFUNDED: 'default',
  FAILED:   'destructive',

  ISSUED:   'default',
  PAID:     'success',
  OVERDUE:  'destructive',

  OPEN:         'destructive',
  UNDER_REVIEW: 'secondary',
  RESOLVED:     'success',
  CLOSED:       'secondary',

  ACCEPTED:  'success',
  WITHDRAWN: 'secondary',
  EXPIRED:   'destructive',
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const t = useTranslations('common');
  const variant = MAP[status] ?? ('secondary' as Variant);
  const resolved = label ?? (status in MAP ? t(`status.${status}`) : status);
  return (
    <Badge variant={variant} pulse={ACTIVE_STATUSES.has(status)}>
      {resolved}
    </Badge>
  );
}

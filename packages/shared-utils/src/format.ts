import { format, formatDistanceToNow } from 'date-fns';
// date-fns 2.x — CJS-compatible (works in both Node API + Next.js webpack).
// v3 was ESM-only and caused interop pain in our monorepo; staying on v2.
import ar from 'date-fns/locale/ar';
import enUS from 'date-fns/locale/en-US';

export function formatCurrency(
  amount: number | null | undefined,
  currency: string = 'SAR',
  locale: 'ar' | 'en' = 'ar',
): string {
  if (amount === null || amount === undefined) return '—';
  const intlLocale = locale === 'ar' ? 'ar-SA' : 'en-US';
  return new Intl.NumberFormat(intlLocale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(
  value: number | null | undefined,
  locale: 'ar' | 'en' = 'ar',
): string {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : 'en-US').format(value);
}

export function formatDate(
  date: string | Date | null | undefined,
  pattern: string = 'd MMMM yyyy',
  locale: 'ar' | 'en' = 'ar',
): string {
  if (!date) return '—';
  return format(new Date(date), pattern, { locale: locale === 'ar' ? ar : enUS });
}

export function formatDateTime(
  date: string | Date | null | undefined,
  locale: 'ar' | 'en' = 'ar',
): string {
  return formatDate(date, 'd MMM yyyy، HH:mm', locale);
}

export function formatRelative(
  date: string | Date | null | undefined,
  locale: 'ar' | 'en' = 'ar',
): string {
  if (!date) return '—';
  return formatDistanceToNow(new Date(date), {
    addSuffix: true,
    locale: locale === 'ar' ? ar : enUS,
  });
}

export function formatWeight(kg: number | null | undefined): string {
  if (kg === null || kg === undefined) return '—';
  if (kg >= 1000) return `${formatNumber(kg / 1000)} طن`;
  return `${formatNumber(kg)} كجم`;
}

export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('966')) {
    return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  }
  return phone;
}

export function truncate(text: string | null | undefined, max: number = 60): string {
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

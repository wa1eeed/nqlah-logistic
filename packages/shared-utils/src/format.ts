export function formatCurrency(
  amount: number | null | undefined,
  currency: string = 'SAR',
  locale: 'ar' | 'en' = 'ar',
): string {
  if (amount === null || amount === undefined) return '—';
  const intlLocale = locale === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US';
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
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US').format(value);
}

/**
 * The active UI locale, read from the <html lang> the layout sets from the
 * locale cookie. Lets locale-agnostic utils follow the current language without
 * threading a locale through every call site. Falls back to English (the
 * platform default) on the server or if unset.
 */
export function detectLocale(fallback: 'ar' | 'en' = 'en'): 'ar' | 'en' {
  // Read via globalThis so this file doesn't need the DOM lib (shared-utils
  // builds standalone). On the server `document` is undefined → fallback.
  const doc = (globalThis as { document?: { documentElement?: { lang?: string } } }).document;
  const l = doc?.documentElement?.lang;
  if (l === 'ar' || l === 'en') return l;
  return fallback;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/**
 * A UNIFIED numeric timestamp — `dd/MM/yyyy`, plus ` HH:mm` when the pattern
 * asks for time. Always Western/Latin digits and the same digit order in both
 * languages, so month names never flip against the numbers under RTL. The
 * `pattern`/`locale` params are kept for call-site compatibility; only whether
 * the pattern contains `HH:mm` is read.
 */
export function formatDate(
  date: string | Date | null | undefined,
  pattern: string = '',
  _locale: 'ar' | 'en' = 'en',
): string {
  if (!date) return '—';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '—';
  const base = `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
  if (pattern.includes('HH:mm')) {
    return `${base} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  }
  return base;
}

export function formatDateTime(
  date: string | Date | null | undefined,
  locale: 'ar' | 'en' = 'en',
): string {
  return formatDate(date, 'HH:mm', locale);
}

export function formatRelative(
  date: string | Date | null | undefined,
  locale?: 'ar' | 'en',
): string {
  if (!date) return '—';
  const loc = locale ?? detectLocale();
  const diffMs = new Date(date).getTime() - Date.now();
  const absMs = Math.abs(diffMs);
  const rtf = new Intl.RelativeTimeFormat(loc === 'ar' ? 'ar-SA-u-nu-latn' : 'en-US', { numeric: 'auto' });
  if (absMs < 60_000) return rtf.format(Math.round(diffMs / 1000), 'second');
  if (absMs < 3_600_000) return rtf.format(Math.round(diffMs / 60_000), 'minute');
  if (absMs < 86_400_000) return rtf.format(Math.round(diffMs / 3_600_000), 'hour');
  if (absMs < 2_592_000_000) return rtf.format(Math.round(diffMs / 86_400_000), 'day');
  if (absMs < 31_536_000_000) return rtf.format(Math.round(diffMs / 2_592_000_000), 'month');
  return rtf.format(Math.round(diffMs / 31_536_000_000), 'year');
}

export function formatWeight(kg: number | null | undefined, locale?: 'ar' | 'en'): string {
  if (kg === null || kg === undefined) return '—';
  const loc = locale ?? detectLocale();
  const ton = loc === 'ar' ? 'طن' : 'tons';
  const kgUnit = loc === 'ar' ? 'كجم' : 'kg';
  if (kg >= 1000) return `${formatNumber(kg / 1000, loc)} ${ton}`;
  return `${formatNumber(kg, loc)} ${kgUnit}`;
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

import { cookies, headers } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';
import {
  DEFAULT_LOCALE,
  isSupportedLocale as isSupported,
  LOCALE_COOKIE,
  type Locale,
} from './i18n-config';

// Re-export the client-safe constants so existing `@/i18n` server imports keep
// working. Client Components must import these from `@/i18n-config` instead —
// this module pulls in `next/headers`, which is server-only. See docs/I18N.md.
export {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  RTL_LOCALES,
  isRtlLocale,
  LOCALE_COOKIE,
} from './i18n-config';
export type { Locale } from './i18n-config';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/**
 * Platform default locale, configured by the admin and stored under the
 * `platform.defaultLocale` Setting (exposed on the public GET /settings/platform).
 * Cached for a few minutes so we don't fetch on every render. Falls back to the
 * app's built-in DEFAULT_LOCALE if the API is unreachable or the value is unset.
 */
async function getPlatformDefaultLocale(): Promise<Locale> {
  try {
    const res = await fetch(`${API_URL}/api/settings/platform`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return DEFAULT_LOCALE;
    const data = (await res.json()) as { defaultLocale?: string };
    return isSupported(data.defaultLocale) ? data.defaultLocale : DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
}

/**
 * Cookie-based locale resolution for the internal apps (admin/client/carrier).
 * Resolution order:
 *   1. the user's explicit choice (cookie) — always wins
 *   2. the platform default locale (admin-configured)
 *   3. Accept-Language header
 *   4. the app's built-in DEFAULT_LOCALE
 */
export async function resolveLocale(): Promise<Locale> {
  const cookieLocale = cookies().get(LOCALE_COOKIE)?.value;
  if (isSupported(cookieLocale)) return cookieLocale;

  // No explicit choice — honour the platform default.
  const platformDefault = await getPlatformDefaultLocale();
  if (platformDefault !== DEFAULT_LOCALE) return platformDefault;

  const accept = headers().get('accept-language')?.toLowerCase() ?? '';
  if (accept.startsWith('ur')) return 'ur';
  if (accept.startsWith('en')) return 'en';
  if (accept.startsWith('ar')) return 'ar';
  return platformDefault;
}

async function buildConfig() {
  const locale = await resolveLocale();
  const [common, auth, orders, fleet, payments, notifications, admin, companies, compliance, settings, landing] = await Promise.all([
    import(`../messages/${locale}/common.json`).then((m) => m.default),
    import(`../messages/${locale}/auth.json`).then((m) => m.default),
    import(`../messages/${locale}/orders.json`).then((m) => m.default),
    import(`../messages/${locale}/fleet.json`).then((m) => m.default),
    import(`../messages/${locale}/payments.json`).then((m) => m.default),
    import(`../messages/${locale}/notifications.json`).then((m) => m.default),
    import(`../messages/${locale}/admin.json`).then((m) => m.default),
    import(`../messages/${locale}/companies.json`).then((m) => m.default),
    import(`../messages/${locale}/compliance.json`).then((m) => m.default),
    import(`../messages/${locale}/settings.json`).then((m) => m.default),
    import(`../messages/${locale}/landing.json`).then((m) => m.default),
  ]);
  return {
    locale,
    messages: { common, auth, orders, fleet, payments, notifications, admin, companies, compliance, settings, landing },
    timeZone: 'Asia/Riyadh',
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const config: any = getRequestConfig(buildConfig);
export default config;

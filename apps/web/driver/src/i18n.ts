import { cookies, headers } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';

export const SUPPORTED_LOCALES = ['ar', 'en'] as const;
export const DEFAULT_LOCALE = 'en';
export type Locale = (typeof SUPPORTED_LOCALES)[number];
// Cookies are scoped by hostname only, not port. On localhost all portals would
// share one locale cookie and flip each other's language. Use a portal-specific
// cookie name so the driver app keeps its own locale.
export const LOCALE_COOKIE = 'naqla-locale-driver';

/**
 * Cookie-based locale resolution for the driver portal. Default is English;
 * the in-app language switcher sets the cookie and reloads. No URL prefix.
 */
export function readLocaleFromHeaders(): Locale {
  // Cookie wins
  const cookieLocale = cookies().get(LOCALE_COOKIE)?.value;
  if (cookieLocale === 'ar' || cookieLocale === 'en') return cookieLocale;

  // Fallback to Accept-Language
  const accept = headers().get('accept-language')?.toLowerCase() ?? '';
  if (accept.startsWith('en')) return 'en';
  return DEFAULT_LOCALE;
}

async function buildConfig() {
  const locale = readLocaleFromHeaders();
  const [common, auth, driver] = await Promise.all([
    import(`../messages/${locale}/common.json`).then((m) => m.default),
    import(`../messages/${locale}/auth.json`).then((m) => m.default),
    import(`../messages/${locale}/driver.json`).then((m) => m.default),
  ]);
  return {
    locale,
    messages: { common, auth, driver },
    timeZone: 'Asia/Riyadh',
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const config: any = getRequestConfig(buildConfig);
export default config;

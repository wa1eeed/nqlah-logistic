import { cookies, headers } from 'next/headers';
import { getRequestConfig } from 'next-intl/server';

// Supported UI locales. Adding a new language is a two-step change:
//   1. drop a `messages/<lang>/*.json` folder (copy en, translate what you can)
//   2. add the code here (and to RTL_LOCALES below if it's right-to-left)
// Everything else — dynamic import, <html dir>, the language switcher — reads
// from these two lists. See docs/I18N.md.
export const SUPPORTED_LOCALES = ['ar', 'en', 'ur'] as const;
export const DEFAULT_LOCALE = 'en';
export type Locale = (typeof SUPPORTED_LOCALES)[number];

// Right-to-left locales. Arabic and Urdu both use the Arabic script.
export const RTL_LOCALES: readonly Locale[] = ['ar', 'ur'];
export function isRtlLocale(locale: string): boolean {
  return (RTL_LOCALES as readonly string[]).includes(locale);
}

function isSupported(value: string | undefined | null): value is Locale {
  return !!value && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

// Cookies are scoped by hostname only, not port. On localhost all three
// portals would share `naqla-locale` and flip each other's language. Use
// a portal-specific cookie name so each app keeps its own locale.
export const LOCALE_COOKIE = 'naqla-locale-client';

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
  const [common, auth, orders, fleet, payments, notifications, client, settings, landing] = await Promise.all([
    import(`../messages/${locale}/common.json`).then((m) => m.default),
    import(`../messages/${locale}/auth.json`).then((m) => m.default),
    import(`../messages/${locale}/orders.json`).then((m) => m.default),
    import(`../messages/${locale}/fleet.json`).then((m) => m.default),
    import(`../messages/${locale}/payments.json`).then((m) => m.default),
    import(`../messages/${locale}/notifications.json`).then((m) => m.default),
    import(`../messages/${locale}/client.json`).then((m) => m.default),
    import(`../messages/${locale}/settings.json`).then((m) => m.default),
    import(`../messages/${locale}/landing.json`).then((m) => m.default),
  ]);
  return {
    locale,
    messages: { common, auth, orders, fleet, payments, notifications, client, settings, landing },
    timeZone: 'Asia/Riyadh',
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const config: any = getRequestConfig(buildConfig);
export default config;

import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';

// Supported UI locales. Adding a new language is a two-step change: drop a
// `messages/<lang>/*.json` folder and add the code here (and to RTL_LOCALES if
// it's right-to-left). Keep this list in sync with src/navigation.ts (the
// middleware reads the locale list from there). See docs/I18N.md.
export const SUPPORTED_LOCALES = ['ar', 'en', 'ur'] as const;
export const DEFAULT_LOCALE = 'ar';
export type Locale = (typeof SUPPORTED_LOCALES)[number];

// Right-to-left locales. Arabic and Urdu both use the Arabic script.
export const RTL_LOCALES: readonly Locale[] = ['ar', 'ur'];
export function isRtlLocale(locale: string): boolean {
  return (RTL_LOCALES as readonly string[]).includes(locale);
}

/**
 * URL-based locale routing for the landing site.
 *   - `/`        → middleware redirects to `/ar` (Accept-Language aware)
 *   - `/ar/...`  → Arabic, RTL, Tajawal
 *   - `/en/...`  → English, LTR, Inter
 *   - `/ur/...`  → Urdu, RTL, Tajawal
 */
async function buildConfig({ locale }: { locale: string }) {
  if (!SUPPORTED_LOCALES.includes(locale as Locale)) notFound();
  const [common, auth, orders, fleet, payments, notifications, settings, landing] = await Promise.all([
    import(`../messages/${locale}/common.json`).then((m) => m.default),
    import(`../messages/${locale}/auth.json`).then((m) => m.default),
    import(`../messages/${locale}/orders.json`).then((m) => m.default),
    import(`../messages/${locale}/fleet.json`).then((m) => m.default),
    import(`../messages/${locale}/payments.json`).then((m) => m.default),
    import(`../messages/${locale}/notifications.json`).then((m) => m.default),
    import(`../messages/${locale}/settings.json`).then((m) => m.default),
    import(`../messages/${locale}/landing.json`).then((m) => m.default),
  ]);
  return {
    messages: { common, auth, orders, fleet, payments, notifications, settings, landing },
    timeZone: 'Asia/Riyadh',
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const config: any = getRequestConfig(buildConfig);
export default config;

// Client-safe i18n constants. This module must NOT import `next/headers` or any
// other server-only API, so it can be imported from Client Components (e.g. the
// settings page's language tab). The server-only request config lives in
// `i18n.ts`, which re-exports these for server callers.

// Supported UI locales. Adding a new language is a two-step change:
//   1. drop a `messages/<lang>/*.json` folder (copy en, translate what you can)
//   2. add the code here (and to RTL_LOCALES below if it's right-to-left)
export const SUPPORTED_LOCALES = ['ar', 'en', 'ur'] as const;
export const DEFAULT_LOCALE = 'en';
export type Locale = (typeof SUPPORTED_LOCALES)[number];

// Right-to-left locales. Arabic and Urdu both use the Arabic script.
export const RTL_LOCALES: readonly Locale[] = ['ar', 'ur'];
export function isRtlLocale(locale: string): boolean {
  return (RTL_LOCALES as readonly string[]).includes(locale);
}

export function isSupportedLocale(value: string | undefined | null): value is Locale {
  return !!value && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

// Cookies are scoped by hostname only, not port. On localhost all three
// portals would share one cookie and flip each other's language. Use a
// portal-specific cookie name so each app keeps its own locale.
export const LOCALE_COOKIE = 'naqla-locale-admin';

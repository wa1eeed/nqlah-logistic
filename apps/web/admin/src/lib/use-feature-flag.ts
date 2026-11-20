'use client';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';

export type AppFlags = Record<string, boolean>;
interface AppConfig { flags?: AppFlags }

/** Built-in defaults — mirror the API flag registry (feature-flags.ts), used
 *  until GET /settings/app resolves (or if it's unavailable). */
const DEFAULTS: AppFlags = {
  inAppChat: true,
  liveTracking: true,
  promoBanner: false,
  guestBrowsing: true,
};

/**
 * Server-driven feature flags (admin-managed via Settings → App Settings).
 * SWR-cached from the public GET /settings/app and shared across the app, so a
 * feature can be toggled platform-wide with no redeploy. Falls back to the
 * built-in defaults.
 */
export function useFeatureFlags(): AppFlags {
  const { data } = useSWR<AppConfig>('/settings/app', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5 * 60 * 1000,
  });
  return { ...DEFAULTS, ...(data?.flags ?? {}) };
}

/** Watch a single flag, with the registry default while loading / on error. */
export function useFeatureFlag(key: string, fallback = true): boolean {
  const flags = useFeatureFlags();
  return flags[key] ?? fallback;
}

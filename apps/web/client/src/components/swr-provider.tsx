'use client';
import { SWRConfig } from 'swr';
import { fetcher } from '@/lib/api';

/**
 * App-wide SWR defaults. `keepPreviousData` is the key one: when a key changes
 * (navigation, a changed filter/period) the last data stays on screen instead
 * of the page blanking to `undefined` while the next request is in flight, so
 * pages no longer flash empty. `dedupingInterval` + `focusThrottleInterval`
 * also collapse the burst of revalidations that fire on window refocus.
 */
export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher,
        keepPreviousData: true,
        revalidateOnFocus: true,
        focusThrottleInterval: 10000,
        dedupingInterval: 3000,
        errorRetryCount: 2,
      }}
    >
      {children}
    </SWRConfig>
  );
}

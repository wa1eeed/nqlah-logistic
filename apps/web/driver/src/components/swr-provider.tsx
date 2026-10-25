'use client';
import { SWRConfig } from 'swr';
import { fetcher } from '@/lib/api';

/**
 * App-wide SWR defaults. `keepPreviousData` keeps the last data on screen while
 * the next request is in flight so pages don't flash empty on navigation; the
 * focus/dedupe intervals collapse the burst of revalidations on window refocus.
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

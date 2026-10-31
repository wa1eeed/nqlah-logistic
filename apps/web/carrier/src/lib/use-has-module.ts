import useSWR from 'swr';
import { fetcher } from './api';

type MineSub = { plan?: { modules?: Array<{ key: string }> } } | null;

/**
 * Whether the acting provider's current plan includes a gated add-on module
 * (opt-in — absent plan/module ⇒ false). Backed by `GET /policies/subscription/mine`
 * (SWR-deduped), mirroring the backend `PoliciesService.hasModule` check.
 */
export function useHasModule(key: string): { has: boolean; loading: boolean } {
  const { data, isLoading } = useSWR<MineSub>('/policies/subscription/mine', fetcher);
  const has = !!data?.plan?.modules?.some((m) => m.key === key);
  return { has, loading: isLoading };
}

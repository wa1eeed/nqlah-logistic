import useSWR from 'swr';
import { fetcher } from './api';

type PlanModule = { key: string; name?: string };
type Plan = { name?: string; price?: number | { monthly?: number } | null; modules?: PlanModule[] };
type MineSub = { plan?: Plan | null } | null;

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

function monthlyPrice(p: Plan['price']): number {
  if (p == null) return 0;
  if (typeof p === 'number') return p;
  return Number(p.monthly ?? 0);
}

export interface ModuleAccess {
  /** Plan includes the module key (opt-in; absent ⇒ false). */
  allowed: boolean;
  /** Either subscription or the plan catalogue is still loading. */
  loading: boolean;
  /** Name of the provider's current plan, if any. */
  planName?: string;
  /**
   * Name of the cheapest public plan that grants this module — what the user
   * must upgrade to. Falls back to a generic «الباقة الأعلى» when the catalogue
   * exposes no plan carrying the key.
   */
  requiredPlanName: string;
}

/**
 * Richer companion to {@link useHasModule} for "locked but visible" gating.
 * Reads the current subscription (`/policies/subscription/mine`) for access +
 * current plan name, and the public plan catalogue (`/policies/plans/public`)
 * to work out which plan the user would have to upgrade to for `key`. Both
 * fetches are SWR-deduped, so this adds no cost over code already loading them.
 */
export function useModuleAccess(key: string): ModuleAccess {
  const { data: sub, isLoading: subLoading } = useSWR<MineSub>('/policies/subscription/mine', fetcher);
  const { data: plans, isLoading: plansLoading } = useSWR<Plan[]>('/policies/plans/public', fetcher);

  const allowed = !!sub?.plan?.modules?.some((m) => m.key === key);

  // Cheapest public plan whose modules include the key = the upgrade target.
  const requiredPlan = (Array.isArray(plans) ? plans : [])
    .filter((p) => p.modules?.some((m) => m.key === key))
    .sort((a, b) => monthlyPrice(a.price) - monthlyPrice(b.price))[0];

  return {
    allowed,
    loading: subLoading || plansLoading,
    planName: sub?.plan?.name ?? undefined,
    requiredPlanName: requiredPlan?.name ?? 'الباقة الأعلى',
  };
}

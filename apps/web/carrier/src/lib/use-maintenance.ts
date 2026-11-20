'use client';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';

export interface MaintenanceState {
  enabled: boolean;
  messageAr: string;
  messageEn: string;
}
interface AppConfig { maintenance?: MaintenanceState }

const OFF: MaintenanceState = { enabled: false, messageAr: '', messageEn: '' };

/**
 * Platform maintenance state, read from the public GET /settings/app (which the
 * API keeps reachable even during maintenance). SWR-cached and re-checked on a
 * short interval so the app leaves maintenance on its own once the admin turns
 * it off. Falls back to "off" so the app never locks itself out on a read error.
 */
export function useMaintenance(): MaintenanceState {
  const { data } = useSWR<AppConfig>('/settings/app', fetcher, {
    refreshInterval: 30_000,
    revalidateOnFocus: true,
    dedupingInterval: 10_000,
  });
  return data?.maintenance ?? OFF;
}

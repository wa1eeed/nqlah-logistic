'use client';
import useSWR from 'swr';
import { fetcher } from '@/lib/api';

export interface CurrencyInfo {
  code: string;
  symbol: string;
  nameAr: string;
  nameEn: string;
  decimals: number;
}

export interface CurrenciesConfig {
  currencies: CurrencyInfo[];
  defaultCurrencyCode: string;
}

/**
 * Fallback used until GET /settings/currencies resolves (or if it's
 * unavailable): the Saudi Riyal with its official U+20C1 sign.
 */
export const SAR_FALLBACK: CurrencyInfo = {
  code: 'SAR', symbol: '⃁', nameAr: 'ريال سعودي', nameEn: 'Saudi Riyal', decimals: 2,
};

/**
 * The platform's default currency (admin-managed via Settings → Currencies).
 * SWR-cached and shared across every mounted <Currency>. Falls back to SAR.
 */
export function useDefaultCurrency(): CurrencyInfo {
  const { data } = useSWR<CurrenciesConfig>('/settings/currencies', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5 * 60 * 1000,
  });
  if (!data || !Array.isArray(data.currencies) || data.currencies.length === 0) return SAR_FALLBACK;
  return data.currencies.find((c) => c.code === data.defaultCurrencyCode) ?? data.currencies[0] ?? SAR_FALLBACK;
}

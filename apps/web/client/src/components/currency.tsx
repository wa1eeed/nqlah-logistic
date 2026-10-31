'use client';
import { cn } from '@/lib/utils';
import { useDefaultCurrency } from '@/lib/use-currency';

export interface CurrencyProps {
  amount: number | null | undefined;
  /** Override the rendered symbol; defaults to the platform's default currency. */
  unit?: string;
  className?: string;
}

/**
 * Inline currency renderer — Inter tabular-nums for the figure, muted unit.
 * Western digits + comma thousands for column alignment. The currency symbol
 * and decimal places come from the admin-managed default currency
 * (GET /settings/currencies, SAR with the official U+20C1 sign by default)
 * unless an explicit `unit` is passed.
 */
export function Currency({ amount, unit, className }: CurrencyProps) {
  const currency = useDefaultCurrency();
  if (amount === null || amount === undefined) {
    return <span className="text-muted-foreground">—</span>;
  }
  const symbol = unit ?? currency.symbol;
  // Keep clean integers symbol-free of trailing zeros, but honour the
  // currency's decimals for fractional amounts.
  const fractionDigits = Number.isInteger(amount) ? 0 : currency.decimals;
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amount);
  return (
    <span className={cn('inline-flex items-baseline gap-1 whitespace-nowrap', className)}>
      <span dir="ltr" className="num font-medium">{formatted}</span>
      <span className="text-xs text-muted-foreground">{symbol}</span>
    </span>
  );
}

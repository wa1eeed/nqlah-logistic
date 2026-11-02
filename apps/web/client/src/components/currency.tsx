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
/**
 * The official new Saudi Riyal symbol (SAMA 2025) as inline SVG. The Unicode
 * sign (U+20C1) is too new for most installed fonts, so it renders as a stray
 * glyph — the SVG renders identically everywhere. Scales with the text and
 * inherits `currentColor`.
 */
export function RiyalSign({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1124.14 1256.39"
      role="img"
      aria-label="ر.س"
      fill="currentColor"
      className={className}
      style={{ height: '0.82em', width: 'auto', verticalAlign: '-0.06em', display: 'inline-block' }}
    >
      <path d="M699.62,1113.02h0c-20.06,44.48-33.32,92.75-38.4,143.37l424.51-90.24c20.06-44.47,33.31-92.75,38.4-143.37l-424.51,90.24Z" />
      <path d="M1085.73,895.8c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.33v-135.2l292.27-62.11c20.06-44.47,33.32-92.75,38.4-143.37l-330.68,70.27V66.13c-50.67,28.45-95.67,66.32-132.25,110.99v403.35l-132.25,28.11V0c-50.67,28.44-95.67,66.32-132.25,110.99v525.69l-295.91,62.88c-20.06,44.47-33.33,92.75-38.42,143.37l334.33-71.05v170.26l-358.3,76.14c-20.06,44.47-33.32,92.75-38.4,143.37l375.04-79.7c30.53-6.35,56.77-24.4,73.83-49.24l68.78-101.97v-.02c7.14-10.55,11.3-23.27,11.3-36.97v-149.98l132.25-28.11v270.4l424.53-90.28Z" />
    </svg>
  );
}

export function Currency({ amount, unit, className }: CurrencyProps) {
  const currency = useDefaultCurrency();
  if (amount === null || amount === undefined) {
    return <span className="text-muted-foreground">—</span>;
  }
  const symbol = unit ?? currency.symbol;
  const useRiyalGlyph = !unit && currency.code === 'SAR';
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
      <span className="text-muted-foreground">
        {useRiyalGlyph ? <RiyalSign /> : <span className="text-xs">{symbol}</span>}
      </span>
    </span>
  );
}

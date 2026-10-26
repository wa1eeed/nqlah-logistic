// ─── Order financials: commission + VAT (Saudi, ZATCA-aligned) ───────────────
//
// A single, pure computation of an order's money breakdown, driven by the
// client's effective policy (commission rate / who bears it / price VAT-inclusive)
// and the carrier's VAT-registration status. Two VATs are modelled:
//   • service VAT  — on the carrier's transport service (only if the carrier is
//     VAT-registered), paid by the client to the carrier,
//   • commission VAT — on the platform's commission (the platform is always
//     VAT-registered), invoiced separately.
//
// All amounts are rounded to 2 decimals. Keep this pure + framework-free so it is
// trivially unit-testable.

export const VAT_RATE = 0.15;
export const DEFAULT_COMMISSION_RATE = 0.08;

export type CommissionAppliesTo = 'CLIENT' | 'CARRIER' | 'BOTH';

export interface PricingInput {
  /** The negotiated/agreed transport price. */
  price: number;
  /** Whether `price` already includes the service VAT (else VAT is added on top). */
  priceVatInclusive?: boolean;
  /** Platform commission rate (e.g. 0.08). Falls back to the default. */
  commissionRate?: number;
  /** Who bears the platform commission. Defaults to CARRIER. */
  commissionAppliesTo?: CommissionAppliesTo;
  /** Whether the carrier is registered for VAT (drives the service VAT). */
  carrierVatRegistered?: boolean;
}

export interface OrderFinancials {
  // Carrier service (carrier → client)
  serviceBase: number;   // ex-VAT transport price
  serviceVat: number;    // VAT on the service (0 if the carrier isn't registered)
  serviceTotal: number;  // base + VAT
  // Platform commission (platform → the bearer)
  commission: number;      // ex-VAT commission
  commissionVat: number;   // VAT on the commission
  commissionTotal: number; // commission + its VAT
  // Settlement
  carrierAmount: number;   // net credited to the carrier
  clientTotalDue: number;  // total the client pays
  // Echoed config
  commissionRate: number;
  commissionAppliesTo: CommissionAppliesTo;
}

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Compute an order's full commission + VAT breakdown. */
export function computeOrderFinancials(input: PricingInput): OrderFinancials {
  const price = Math.max(0, input.price || 0);
  const rate = input.commissionRate != null ? input.commissionRate : DEFAULT_COMMISSION_RATE;
  const appliesTo: CommissionAppliesTo = input.commissionAppliesTo ?? 'CARRIER';
  const carrierVatRegistered = input.carrierVatRegistered !== false;

  // Service base + VAT.
  let serviceBase: number;
  let serviceVat: number;
  if (carrierVatRegistered) {
    if (input.priceVatInclusive) {
      serviceBase = price / (1 + VAT_RATE);
      serviceVat = price - serviceBase;
    } else {
      serviceBase = price;
      serviceVat = price * VAT_RATE;
    }
  } else {
    serviceBase = price;
    serviceVat = 0;
  }
  serviceBase = r2(serviceBase);
  serviceVat = r2(serviceVat);
  const serviceTotal = r2(serviceBase + serviceVat);

  // Commission (on the net service base) + its own VAT (platform is registered).
  const commission = r2(serviceBase * rate);
  const commissionVat = r2(commission * VAT_RATE);
  const commissionTotal = r2(commission + commissionVat);

  // Who bears the commission.
  let carrierAmount: number;
  let clientTotalDue: number;
  if (appliesTo === 'CLIENT') {
    carrierAmount = serviceTotal;
    clientTotalDue = r2(serviceTotal + commissionTotal);
  } else if (appliesTo === 'BOTH') {
    const half = r2(commissionTotal / 2);
    carrierAmount = r2(serviceTotal - half);
    clientTotalDue = r2(serviceTotal + half);
  } else {
    // CARRIER (default)
    carrierAmount = r2(serviceTotal - commissionTotal);
    clientTotalDue = serviceTotal;
  }

  return {
    serviceBase, serviceVat, serviceTotal,
    commission, commissionVat, commissionTotal,
    carrierAmount, clientTotalDue,
    commissionRate: rate, commissionAppliesTo: appliesTo,
  };
}

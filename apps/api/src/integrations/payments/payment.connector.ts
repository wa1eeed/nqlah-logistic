/// A request to charge a client for an order (online/escrow collection).
export interface ChargeRequest {
  orderId: string;
  companyId: string;
  amount: number;
  description: string;
}

export interface ChargeResult {
  ok: boolean;
  reference: string;
  raw?: unknown;
}

/// Port for the online payment provider (escrow charge + refund). The payment
/// collection flow depends only on this; concrete connectors (a mock in dev, a
/// Saudi gateway such as Moyasar / Tap / HyperPay in prod) are swapped behind
/// the `PAYMENT_CONNECTOR` token via `PaymentsIntegrationModule` — part of the
/// integrations gateway, so no payment vendor leaks into feature code.
export interface PaymentConnector {
  /// Charge [req.amount] for the order (PREPAID_GATEWAY / escrow funding).
  charge(req: ChargeRequest): Promise<ChargeResult>;
  /// Refund (fully or partially) a prior charge by its provider [reference].
  refund(reference: string, amount: number): Promise<ChargeResult>;
}

export const PAYMENT_CONNECTOR = Symbol('PAYMENT_CONNECTOR');

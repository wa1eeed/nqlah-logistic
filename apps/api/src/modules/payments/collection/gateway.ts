import { Injectable } from '@nestjs/common';

/**
 * Online payment gateway abstraction. A concrete provider (Moyasar / Tap /
 * HyperPay) implements this interface; the collection flow depends only on it.
 * Until a provider is chosen, `StubGateway` simulates a successful charge/refund
 * so the PREPAID_GATEWAY method is exercisable end-to-end without live keys.
 */
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

export abstract class PaymentGateway {
  abstract charge(req: ChargeRequest): Promise<ChargeResult>;
  abstract refund(reference: string, amount: number): Promise<ChargeResult>;
}

/** No-network stand-in: always succeeds, returns a deterministic-looking ref. */
@Injectable()
export class StubGateway extends PaymentGateway {
  async charge(req: ChargeRequest): Promise<ChargeResult> {
    return { ok: true, reference: `STUB-CHG-${req.orderId.slice(-6)}-${Date.now().toString(36)}` };
  }
  async refund(reference: string): Promise<ChargeResult> {
    return { ok: true, reference: `STUB-RFD-${reference.slice(-6)}-${Date.now().toString(36)}` };
  }
}

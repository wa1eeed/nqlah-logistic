import { Injectable, Logger } from '@nestjs/common';
import type {
  ChargeRequest,
  ChargeResult,
  PaymentConnector,
} from './payment.connector';

/// No-network stand-in: always succeeds and returns a deterministic-looking
/// reference, so the PREPAID_GATEWAY / escrow flow is exercisable end to end
/// without live provider keys.
@Injectable()
export class MockPaymentConnector implements PaymentConnector {
  private readonly logger = new Logger('Payments');

  async charge(req: ChargeRequest): Promise<ChargeResult> {
    const reference = `MOCK-CHG-${req.orderId.slice(-6)}-${Date.now().toString(36)}`;
    this.logger.log(`💳 charge ${req.amount} for order ${req.orderId} → ${reference}`);
    return { ok: true, reference };
  }

  async refund(reference: string, amount: number): Promise<ChargeResult> {
    const ref = `MOCK-RFD-${reference.slice(-6)}-${Date.now().toString(36)}`;
    this.logger.log(`💳 refund ${amount} of ${reference} → ${ref}`);
    return { ok: true, reference: ref };
  }
}

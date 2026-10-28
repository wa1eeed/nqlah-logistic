import { ForbiddenException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import type { CreateOrderDto } from './dto/create-order.dto';

/**
 * Unit tests for policy-driven sourcing on order creation
 * (`OrdersService.resolveSourcing`). The default policy allows everything with
 * no forced carrier, so ungrouped clients behave exactly as before; a group's
 * policy can pin a carrier or forbid a sourcing/pricing mode.
 */
const DEFAULT_POLICY = {
  allowMarket: true,
  allowDirect: true,
  forcedCarrierId: undefined as string | undefined,
  allowMarketPricing: true,
  allowFixedPricing: true,
  allowPrepaid: true,
  allowCOD: true,
};

function makeService(policy: typeof DEFAULT_POLICY) {
  const policies = {
    effectiveForCompany: jest.fn().mockResolvedValue(policy),
    visibleCarrierIds: jest.fn().mockResolvedValue(null),
  };
  const collection = { resolveMethod: jest.fn().mockReturnValue('ESCROW') };
  const service = new OrdersService({} as never, {} as never, policies as never, collection as never, {} as never, {} as never);
  // resolveSourcing is private; exercise it directly for a focused unit test.
  const resolve = (dto: Partial<CreateOrderDto>) =>
    (service as unknown as {
      resolveSourcing(d: CreateOrderDto, companyId: string): Promise<{
        mode: 'OPEN' | 'DIRECT'; targetCarrierId: string | null; fixedPrice: number | null;
        priceMode: 'FIXED' | 'BIDDING'; collectionMethod: string;
      }>;
    }).resolveSourcing(dto as CreateOrderDto, 'client-1');
  return { resolve, policies, collection };
}

describe('OrdersService.resolveSourcing', () => {
  it('leaves an OPEN order untouched under the permissive default', async () => {
    const { resolve } = makeService(DEFAULT_POLICY);
    await expect(resolve({ mode: 'OPEN' })).resolves.toEqual({
      mode: 'OPEN', targetCarrierId: null, fixedPrice: null, priceMode: 'BIDDING', collectionMethod: 'ESCROW',
    });
  });

  it('keeps a DIRECT order with its target and upfront price', async () => {
    const { resolve } = makeService(DEFAULT_POLICY);
    await expect(resolve({ mode: 'DIRECT', targetCarrierId: 'c-9', agreedPriceUpfront: 1500 }))
      .resolves.toEqual({ mode: 'DIRECT', targetCarrierId: 'c-9', fixedPrice: 1500, priceMode: 'FIXED', collectionMethod: 'ESCROW' });
  });

  it('publishes to the market with a FIXED price (pricing decoupled from assignment)', async () => {
    const { resolve } = makeService(DEFAULT_POLICY);
    await expect(resolve({ mode: 'OPEN', agreedPriceUpfront: 2400 }))
      .resolves.toEqual({ mode: 'OPEN', targetCarrierId: null, fixedPrice: 2400, priceMode: 'FIXED', collectionMethod: 'ESCROW' });
  });

  it('forces DIRECT to the pinned carrier when the group sets forcedCarrierId', async () => {
    const { resolve } = makeService({ ...DEFAULT_POLICY, forcedCarrierId: 'pinned-7' });
    await expect(resolve({ mode: 'OPEN' })).resolves.toEqual({
      mode: 'DIRECT', targetCarrierId: 'pinned-7', fixedPrice: null, priceMode: 'BIDDING', collectionMethod: 'ESCROW',
    });
  });

  it('blocks market posting when allowMarket is false', async () => {
    const { resolve } = makeService({ ...DEFAULT_POLICY, allowMarket: false });
    await expect(resolve({ mode: 'OPEN' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('blocks direct assignment when allowDirect is false', async () => {
    const { resolve } = makeService({ ...DEFAULT_POLICY, allowDirect: false });
    await expect(resolve({ mode: 'DIRECT', targetCarrierId: 'c-9' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('blocks a fixed upfront price when allowFixedPricing is false', async () => {
    const { resolve } = makeService({ ...DEFAULT_POLICY, allowFixedPricing: false });
    await expect(resolve({ mode: 'DIRECT', targetCarrierId: 'c-9', agreedPriceUpfront: 1500 }))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('blocks a FIXED market order when allowFixedPricing is false', async () => {
    const { resolve } = makeService({ ...DEFAULT_POLICY, allowFixedPricing: false });
    await expect(resolve({ mode: 'OPEN', agreedPriceUpfront: 2400 })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('blocks bidding when allowMarketPricing is false', async () => {
    const { resolve } = makeService({ ...DEFAULT_POLICY, allowMarketPricing: false });
    await expect(resolve({ mode: 'OPEN' })).rejects.toBeInstanceOf(ForbiddenException);
  });
});

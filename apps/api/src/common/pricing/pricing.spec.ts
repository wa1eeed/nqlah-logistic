import { computeOrderFinancials } from './pricing';

describe('computeOrderFinancials', () => {
  it('VAT-exclusive price, commission on CARRIER, carrier registered (default 8%)', () => {
    const f = computeOrderFinancials({ price: 10000, priceVatInclusive: false, commissionRate: 0.08, commissionAppliesTo: 'CARRIER', carrierVatRegistered: true });
    expect(f.serviceBase).toBe(10000);
    expect(f.serviceVat).toBe(1500);
    expect(f.serviceTotal).toBe(11500);
    expect(f.commission).toBe(800);
    expect(f.commissionVat).toBe(120);
    expect(f.commissionTotal).toBe(920);
    expect(f.carrierAmount).toBe(10580); // 11500 - 920
    expect(f.clientTotalDue).toBe(11500);
  });

  it('VAT-inclusive price, commission on CARRIER, carrier registered', () => {
    const f = computeOrderFinancials({ price: 10000, priceVatInclusive: true, commissionRate: 0.08, carrierVatRegistered: true });
    expect(f.serviceBase).toBe(8695.65);
    expect(f.serviceVat).toBe(1304.35);
    expect(f.serviceTotal).toBe(10000);
    expect(f.commission).toBe(695.65);
    expect(f.commissionVat).toBe(104.35);
    expect(f.commissionTotal).toBe(800);
    expect(f.carrierAmount).toBe(9200);  // 10000 - 800
    expect(f.clientTotalDue).toBe(10000);
  });

  it('commission on CLIENT adds the commission to what the client pays', () => {
    const f = computeOrderFinancials({ price: 10000, commissionRate: 0.08, commissionAppliesTo: 'CLIENT', carrierVatRegistered: true });
    expect(f.carrierAmount).toBe(11500);          // carrier gets the full service total
    expect(f.clientTotalDue).toBe(12420);         // 11500 + 920
  });

  it('commission BOTH splits the commission total 50/50', () => {
    const f = computeOrderFinancials({ price: 10000, commissionRate: 0.08, commissionAppliesTo: 'BOTH', carrierVatRegistered: true });
    expect(f.carrierAmount).toBe(11040);          // 11500 - 460
    expect(f.clientTotalDue).toBe(11960);         // 11500 + 460
  });

  it('carrier NOT VAT-registered → no service VAT', () => {
    const f = computeOrderFinancials({ price: 10000, commissionRate: 0.08, carrierVatRegistered: false });
    expect(f.serviceVat).toBe(0);
    expect(f.serviceTotal).toBe(10000);
    expect(f.commission).toBe(800);
    expect(f.commissionVat).toBe(120);            // our commission still has VAT
    expect(f.carrierAmount).toBe(9080);           // 10000 - 920
    expect(f.clientTotalDue).toBe(10000);
  });

  it('a per-plan commission rate is honoured', () => {
    const f = computeOrderFinancials({ price: 10000, commissionRate: 0.05, carrierVatRegistered: true });
    expect(f.commission).toBe(500);
    expect(f.commissionTotal).toBe(575);
  });

  it('defaults: rate 8%, applies to CARRIER, carrier registered', () => {
    const f = computeOrderFinancials({ price: 1000 });
    expect(f.commissionRate).toBe(0.08);
    expect(f.commissionAppliesTo).toBe('CARRIER');
    expect(f.serviceVat).toBe(150);
    expect(f.carrierAmount).toBe(1058); // 1150 - 92
  });
});

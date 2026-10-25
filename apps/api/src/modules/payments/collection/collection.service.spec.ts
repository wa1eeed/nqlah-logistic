import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { CollectionService } from './collection.service';
import { StubGateway } from './gateway';

/**
 * Unit tests for collection-method resolution against policy. The default policy
 * permits everything, so ESCROW (and any allowed method) passes; a group that
 * disables prepaid or COD rejects those methods.
 */
function makeService() {
  return new CollectionService({} as never, new StubGateway());
}
const ALLOW_ALL = { allowPrepaid: true, allowCOD: true };

describe('CollectionService.resolveMethod', () => {
  const svc = makeService();

  it('defaults to ESCROW when none requested', () => {
    expect(svc.resolveMethod(undefined, ALLOW_ALL)).toBe('ESCROW');
  });

  it('allows prepaid + COD when the policy permits', () => {
    expect(svc.resolveMethod('PREPAID_WALLET', ALLOW_ALL)).toBe('PREPAID_WALLET');
    expect(svc.resolveMethod('PREPAID_GATEWAY', ALLOW_ALL)).toBe('PREPAID_GATEWAY');
    expect(svc.resolveMethod('COD', ALLOW_ALL)).toBe('COD');
  });

  it('rejects prepaid when allowPrepaid is false', () => {
    expect(() => svc.resolveMethod('PREPAID_WALLET', { allowPrepaid: false, allowCOD: true }))
      .toThrow(ForbiddenException);
  });

  it('rejects COD when allowCOD is false', () => {
    expect(() => svc.resolveMethod('COD', { allowPrepaid: true, allowCOD: false }))
      .toThrow(ForbiddenException);
  });

  it('always allows ESCROW regardless of toggles', () => {
    expect(svc.resolveMethod('ESCROW', { allowPrepaid: false, allowCOD: false })).toBe('ESCROW');
  });

  it('rejects an unknown method', () => {
    expect(() => svc.resolveMethod('BITCOIN', ALLOW_ALL)).toThrow(BadRequestException);
  });

  // ─── Admin-configured per-group defaults ───────────────────────
  it('uses the group default collection method when none requested', () => {
    expect(svc.resolveMethod(undefined, { ...ALLOW_ALL, defaultCollectionMethod: 'PREPAID_WALLET' }))
      .toBe('PREPAID_WALLET');
  });

  it('lets the client override the group default when not enforced', () => {
    expect(svc.resolveMethod('COD', { ...ALLOW_ALL, defaultCollectionMethod: 'PREPAID_WALLET' }))
      .toBe('COD');
  });

  it('forces the admin default and ignores the client when enforced', () => {
    expect(svc.resolveMethod('PREPAID_WALLET', {
      ...ALLOW_ALL, defaultCollectionMethod: 'COD', enforceCollectionMethod: true,
    })).toBe('COD');
  });

  it('still validates an enforced default against the allow toggles', () => {
    expect(() => svc.resolveMethod('ESCROW', {
      allowPrepaid: true, allowCOD: false, defaultCollectionMethod: 'COD', enforceCollectionMethod: true,
    })).toThrow(ForbiddenException);
  });
});

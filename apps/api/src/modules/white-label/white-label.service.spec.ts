import { ForbiddenException } from '@nestjs/common';
import { WhiteLabelService } from './white-label.service';

const carrier = { id: 'car-1', role: 'CARRIER_ADMIN', companyId: 'car-1' } as never;

function makeService(whiteLabelEnabled: boolean) {
  const prisma = {
    company: {
      findUnique: jest.fn(async () => ({ whiteLabelEnabled })),
      update: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({ id: 'car-1', ...data })),
    },
  };
  return { svc: new WhiteLabelService(prisma as never), prisma };
}

describe('WhiteLabelService', () => {
  it('rejects branding updates when white-label is disabled', async () => {
    const { svc } = makeService(false);
    await expect(svc.update(carrier, { brandName: 'Acme' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('applies branding when white-label is enabled', async () => {
    const { svc, prisma } = makeService(true);
    await svc.update(carrier, { brandName: 'Acme', brandColor: '#0F766E' });
    expect(prisma.company.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { brandName: 'Acme', brandColor: '#0F766E' } }),
    );
  });

  it('rejects non-carriers', () => {
    const { svc } = makeService(true);
    expect(() => svc.mine({ role: 'CLIENT_ADMIN', companyId: 'cl-1' } as never))
      .toThrow(ForbiddenException);
  });
});

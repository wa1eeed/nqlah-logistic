import { BadRequestException, ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { normalizeSaudiPhone } from '@naqla/shared-utils';
import { PrismaService } from '../../common/prisma/prisma.service';
import { companyCode } from '../../common/codes';
import type { AuthUser } from '../../common/decorators/current-user.decorator';

interface CreateOwnedClientDto {
  companyNameAr: string;
  companyNameEn?: string;
  city: string;
  region: string;
  contactPhone: string;
  contactEmail?: string;
  firstName: string;
  lastName: string;
  phone: string;
  password: string;
}

/**
 * Sub-tenancy: a carrier registers and manages its own private clients. An
 * owned client is an ordinary CLIENT company stamped with `ownerCarrierId`, so
 * its orders route privately to the owner (enforced in PoliciesService) and
 * stay invisible to the open market and other carriers. The owned client's
 * user signs in and orders through the normal client dashboard.
 */
@Injectable()
export class OwnedClientsService {
  constructor(private prisma: PrismaService) {}

  private assertCarrier(actor: AuthUser) {
    if (!actor.companyId || (actor.role !== 'CARRIER_ADMIN' && actor.role !== 'CARRIER_USER')) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'خاص بالمزوّدين' });
    }
    return actor.companyId;
  }

  async list(actor: AuthUser) {
    const carrierId = this.assertCarrier(actor);
    return this.prisma.company.findMany({
      where: { ownerCarrierId: carrierId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, nameAr: true, nameEn: true, city: true, region: true,
        contactPhone: true, contactEmail: true, createdAt: true,
        _count: { select: { ordersAsClient: true } },
      },
    });
  }

  async create(dto: CreateOwnedClientDto, actor: AuthUser) {
    const carrierId = this.assertCarrier(actor);
    const phone = normalizeSaudiPhone(dto.phone);
    const email = dto.contactEmail?.toLowerCase();

    const existing = await this.prisma.user.findFirst({ where: { phone } });
    if (existing) throw new ConflictException({ code: 'USER_EXISTS', message: 'رقم الجوال مسجّل مسبقاً' });
    if (!dto.password || dto.password.length < 8) {
      throw new BadRequestException({ code: 'WEAK_PASSWORD', message: 'كلمة المرور قصيرة' });
    }

    const passwordHash = await bcrypt.hash(dto.password, Number(process.env.BCRYPT_ROUNDS ?? 12));
    return this.prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          type: 'CLIENT',
          code: companyCode(),
          nameAr: dto.companyNameAr,
          nameEn: dto.companyNameEn,
          city: dto.city,
          region: dto.region,
          contactPhone: dto.contactPhone,
          contactEmail: email ?? `noreply+${phone}@phone.${process.env.APP_DOMAIN ?? 'nqlah.nx.sa'}`,
          ownerCarrierId: carrierId,
        },
      });
      await tx.user.create({
        data: {
          phone,
          email: email ?? null,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: 'CLIENT_ADMIN',
          companyId: company.id,
          companyRole: 'OWNER' as never,
          isPhoneVerified: true,
          isEmailVerified: false,
        },
      });
      return company;
    });
  }
}

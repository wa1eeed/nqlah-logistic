import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PoliciesService } from '../policies/policies.service';
import type { AuthUser } from '../../common/decorators/current-user.decorator';

interface BrandingDto { brandName?: string; brandLogo?: string; brandColor?: string }

const SELECT = {
  id: true, whiteLabelEnabled: true, brandName: true, brandLogo: true, brandColor: true,
} as const;

/**
 * White-label branding. An admin enables it per carrier (a subscription gate);
 * the carrier then sets its brand name / logo / color. The branding is read by
 * the carrier's own client area and (later) its white-label driver app so they
 * render under the carrier's brand instead of Naqla's.
 */
@Injectable()
export class WhiteLabelService {
  constructor(private prisma: PrismaService, private policies: PoliciesService) {}

  private carrierId(actor: AuthUser) {
    if (!actor.companyId || (actor.role !== 'CARRIER_ADMIN' && actor.role !== 'CARRIER_USER')) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'خاص بالمزوّدين' });
    }
    return actor.companyId;
  }

  mine(actor: AuthUser) {
    return this.prisma.company.findUnique({ where: { id: this.carrierId(actor) }, select: SELECT });
  }

  async update(actor: AuthUser, dto: BrandingDto) {
    const id = this.carrierId(actor);
    const co = await this.prisma.company.findUnique({ where: { id }, select: { whiteLabelEnabled: true } });
    if (!co?.whiteLabelEnabled) {
      throw new ForbiddenException({ code: 'WHITE_LABEL_DISABLED', message: 'خدمة الوايت ليبل غير مفعّلة لحسابك' });
    }
    return this.prisma.company.update({
      where: { id },
      data: {
        ...(dto.brandName !== undefined ? { brandName: dto.brandName } : {}),
        ...(dto.brandLogo !== undefined ? { brandLogo: dto.brandLogo } : {}),
        ...(dto.brandColor !== undefined ? { brandColor: dto.brandColor } : {}),
      },
      select: SELECT,
    });
  }

  /** Admin: turn the white-label subscription on/off for a carrier. Enabling
   *  requires the carrier's plan to grant the `whiteLabel` capability. */
  async setEnabled(companyId: string, enabled: boolean) {
    const co = await this.prisma.company.findUnique({ where: { id: companyId } });
    if (!co) throw new NotFoundException({ code: 'COMPANY_NOT_FOUND', message: 'الشركة غير موجودة' });
    if (enabled && !(await this.policies.hasFeature(companyId, 'whiteLabel'))) {
      throw new ForbiddenException({ code: 'FEATURE_WHITE_LABEL_DISABLED', message: 'ميزة الوايت ليبل غير متاحة في باقة هذا المزوّد' });
    }
    return this.prisma.company.update({ where: { id: companyId }, data: { whiteLabelEnabled: enabled }, select: SELECT });
  }
}

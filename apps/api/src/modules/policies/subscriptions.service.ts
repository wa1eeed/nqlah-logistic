import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma } from '../../generated/prisma';

type Cycle = 'MONTHLY' | 'YEARLY';

/**
 * Subscription lifecycle — the recurring membership a company holds against a
 * Plan. Payment is stubbed (the gateway isn't wired yet): a free plan is ACTIVE
 * immediately, a paid plan starts TRIALING when the plan offers a trial else
 * ACTIVE, and the period/renewal date are tracked so the billing layer can be
 * added later without reshaping the data. One subscription per company.
 */
@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}

  /** A plan's effective monthly/yearly price (base + included module prices). */
  priceOf(plan: {
    isFree: boolean; basePrice: Prisma.Decimal | number; yearlyDiscountPct: Prisma.Decimal | number;
    modules?: Array<{ module: { price: Prisma.Decimal | number; active: boolean } }>;
  }) {
    const modulesTotal = (plan.modules ?? []).filter((m) => m.module.active).reduce((s, m) => s + Number(m.module.price), 0);
    const monthly = plan.isFree ? 0 : +(Number(plan.basePrice) + modulesTotal).toFixed(2);
    const yearly = +(monthly * 12 * (1 - (Number(plan.yearlyDiscountPct) || 0) / 100)).toFixed(2);
    return { monthly, yearly, modulesTotal: +modulesTotal.toFixed(2) };
  }

  private addPeriod(from: Date, cycle: Cycle): Date {
    const d = new Date(from);
    if (cycle === 'YEARLY') d.setFullYear(d.getFullYear() + 1);
    else d.setMonth(d.getMonth() + 1);
    return d;
  }

  /**
   * Subscribe a company to a plan (create or switch). Sets Company.planId too, so
   * the policy engine resolves against the plan immediately. Returns the record.
   */
  async subscribe(companyId: string, planId: string, cycle?: Cycle) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId }, select: { id: true } });
    if (!company) throw new NotFoundException({ code: 'COMPANY_NOT_FOUND', message: 'الشركة غير موجودة' });
    const plan = await this.prisma.plan.findUnique({ where: { id: planId }, include: { modules: { include: { module: true } } } });
    if (!plan) throw new NotFoundException({ code: 'PLAN_NOT_FOUND', message: 'الباقة غير موجودة' });
    if (!plan.active) throw new BadRequestException({ code: 'PLAN_INACTIVE', message: 'الباقة غير مفعّلة' });

    const billingCycle: Cycle = cycle ?? (plan.billingCycle === 'YEARLY' ? 'YEARLY' : 'MONTHLY');
    const price = this.priceOf(plan);
    const priceSnapshot = billingCycle === 'YEARLY' ? price.yearly : price.monthly;
    const now = new Date();
    const trialing = !plan.isFree && plan.trialDays > 0;
    const trialEndsAt = trialing ? new Date(now.getTime() + plan.trialDays * 86400000) : null;
    // A trialing subscription's first paid period starts when the trial ends.
    const currentPeriodStart = now;
    const currentPeriodEnd = trialing ? trialEndsAt : this.addPeriod(now, billingCycle);
    const status = plan.isFree ? 'ACTIVE' : (trialing ? 'TRIALING' : 'ACTIVE');

    const data = {
      planId, status, billingCycle, priceSnapshot,
      currentPeriodStart, currentPeriodEnd, trialEndsAt,
      cancelAtPeriodEnd: false, canceledAt: null,
    };
    const [sub] = await this.prisma.$transaction([
      this.prisma.subscription.upsert({
        where: { companyId },
        create: { companyId, ...data },
        update: data,
      }),
      this.prisma.company.update({ where: { id: companyId }, data: { planId } }),
    ]);
    return this.withPlan(sub.companyId);
  }

  /** Cancel a subscription — at period end (default) or immediately. */
  async cancel(companyId: string, atPeriodEnd = true) {
    const sub = await this.prisma.subscription.findUnique({ where: { companyId } });
    if (!sub) throw new NotFoundException({ code: 'SUBSCRIPTION_NOT_FOUND', message: 'لا يوجد اشتراك' });
    if (atPeriodEnd) {
      await this.prisma.subscription.update({ where: { companyId }, data: { cancelAtPeriodEnd: true, canceledAt: new Date() } });
    } else {
      await this.prisma.$transaction([
        this.prisma.subscription.update({ where: { companyId }, data: { status: 'CANCELLED', cancelAtPeriodEnd: false, canceledAt: new Date() } }),
        this.prisma.company.update({ where: { id: companyId }, data: { planId: null } }),
      ]);
    }
    return this.withPlan(companyId);
  }

  /** The company's subscription enriched with its plan + computed price. */
  async withPlan(companyId: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { companyId },
      include: { plan: { include: { modules: { include: { module: true } } } } },
    });
    if (!sub) return null;
    return {
      ...sub,
      priceSnapshot: Number(sub.priceSnapshot),
      plan: sub.plan && {
        id: sub.plan.id, name: sub.plan.name, nameEn: sub.plan.nameEn, tier: sub.plan.tier,
        isFree: sub.plan.isFree, basePrice: Number(sub.plan.basePrice),
        includedTruckLimit: sub.plan.includedTruckLimit,
        price: this.priceOf(sub.plan),
        modules: sub.plan.modules.map((m) => ({ key: m.module.key, name: m.module.name, price: Number(m.module.price) })),
      },
    };
  }
}

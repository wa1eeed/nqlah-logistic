import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma } from '../../generated/prisma';
import { CreateGroupDto, UpdateGroupDto } from './dto/policy.dto';

type Features = Record<string, boolean | number> | undefined;

const DEFAULT_POLICY = {
  allowMarket: true,
  allowDirect: true,
  forcedCarrierId: undefined as string | undefined,
  allowMarketPricing: true,
  allowFixedPricing: true,
  allowPrepaid: true,
  allowCOD: true,
  defaultAssignment: undefined as string | undefined,
  defaultPricing: undefined as string | undefined,
  defaultCollectionMethod: undefined as string | undefined,
  enforceCollectionMethod: false,
  visibilityScope: 'ALL',
  visibleCarrierGroupId: undefined as string | undefined,
  // Capability layer — absent features mean "allowed" (full access by default).
  features: undefined as Features,
  commissionRate: undefined as number | undefined,
  commissionAppliesTo: undefined as string | undefined,
  priceVatInclusive: false,
};

type GroupRow = {
  id: string; name: string; description: string | null;
  allowMarket: boolean; allowDirect: boolean; forcedCarrierId: string | null;
  allowMarketPricing: boolean; allowFixedPricing: boolean; allowPrepaid: boolean; allowCOD: boolean;
  defaultAssignment: string | null; defaultPricing: string | null;
  defaultCollectionMethod: string | null; enforceCollectionMethod: boolean;
  visibilityScope: string; visibleCarrierGroupId: string | null;
  features: unknown; commissionRate: unknown; commissionAppliesTo: string | null; priceVatInclusive: boolean;
  clientIds: string[];
};

/** Map a DB row to the frontend PolicyGroup shape (nested `policy`). */
function toDto(g: GroupRow) {
  return {
    id: g.id,
    name: g.name,
    description: g.description ?? undefined,
    policy: {
      allowMarket: g.allowMarket,
      allowDirect: g.allowDirect,
      forcedCarrierId: g.forcedCarrierId ?? undefined,
      allowMarketPricing: g.allowMarketPricing,
      allowFixedPricing: g.allowFixedPricing,
      allowPrepaid: g.allowPrepaid,
      allowCOD: g.allowCOD,
      defaultAssignment: g.defaultAssignment ?? undefined,
      defaultPricing: g.defaultPricing ?? undefined,
      defaultCollectionMethod: g.defaultCollectionMethod ?? undefined,
      enforceCollectionMethod: g.enforceCollectionMethod,
      visibilityScope: g.visibilityScope,
      visibleCarrierGroupId: g.visibleCarrierGroupId ?? undefined,
      features: (g.features as Features) ?? undefined,
      commissionRate: g.commissionRate != null ? Number(g.commissionRate) : undefined,
      commissionAppliesTo: g.commissionAppliesTo ?? undefined,
      priceVatInclusive: g.priceVatInclusive,
    },
    clientIds: g.clientIds,
  };
}

@Injectable()
export class PoliciesService {
  constructor(private prisma: PrismaService) {}

  async listGroups() {
    const rows = await this.prisma.policyGroup.findMany({ orderBy: { createdAt: 'asc' } });
    return rows.map(toDto);
  }

  async createGroup(dto: CreateGroupDto) {
    const row = await this.prisma.policyGroup.create({
      data: { name: dto.name, description: dto.description, clientIds: [] },
    });
    return toDto(row);
  }

  async updateGroup(id: string, dto: UpdateGroupDto) {
    await this.ensure(id);
    const p = dto.policy;
    // A client belongs to at most one group. When this update sets the
    // membership list, strip those clients from every other group first so the
    // effective policy is never ambiguous (same invariant as `assignClient`).
    if (dto.clientIds && dto.clientIds.length) {
      const others = await this.prisma.policyGroup.findMany({
        where: { id: { not: id }, clientIds: { hasSome: dto.clientIds } },
      });
      if (others.length) {
        await this.prisma.$transaction(
          others.map((g) =>
            this.prisma.policyGroup.update({
              where: { id: g.id },
              data: { clientIds: g.clientIds.filter((c) => !dto.clientIds!.includes(c)) },
            }),
          ),
        );
      }
    }
    const row = await this.prisma.policyGroup.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        clientIds: dto.clientIds,
        ...(p
          ? {
              allowMarket: p.allowMarket,
              allowDirect: p.allowDirect,
              forcedCarrierId: p.forcedCarrierId ?? null,
              allowMarketPricing: p.allowMarketPricing,
              allowFixedPricing: p.allowFixedPricing,
              allowPrepaid: p.allowPrepaid,
              allowCOD: p.allowCOD,
              defaultAssignment: p.defaultAssignment ?? null,
              defaultPricing: p.defaultPricing ?? null,
              defaultCollectionMethod: p.defaultCollectionMethod ?? null,
              enforceCollectionMethod: p.enforceCollectionMethod ?? false,
              visibilityScope: p.visibilityScope ?? 'ALL',
              visibleCarrierGroupId: p.visibleCarrierGroupId ?? null,
              ...(p.features !== undefined ? { features: p.features ?? Prisma.DbNull } : {}),
              ...(p.commissionRate !== undefined ? { commissionRate: p.commissionRate ?? null } : {}),
              ...(p.commissionAppliesTo !== undefined ? { commissionAppliesTo: p.commissionAppliesTo ?? null } : {}),
              ...(p.priceVatInclusive !== undefined ? { priceVatInclusive: p.priceVatInclusive } : {}),
            }
          : {}),
      },
    });
    return toDto(row);
  }

  async deleteGroup(id: string) {
    await this.ensure(id);
    await this.prisma.policyGroup.delete({ where: { id } });
    return { id };
  }

  /** Move a client into one group (removing it from any others), or null. */
  async assignClient(clientId: string, groupId: string | null | undefined) {
    const groups = await this.prisma.policyGroup.findMany();
    await this.prisma.$transaction(
      groups
        .map((g) => {
          const without = g.clientIds.filter((c) => c !== clientId);
          const next = g.id === groupId ? [...without, clientId] : without;
          if (next.length === g.clientIds.length && next.every((c, i) => c === g.clientIds[i])) return null;
          return this.prisma.policyGroup.update({ where: { id: g.id }, data: { clientIds: next } });
        })
        .filter((x): x is NonNullable<typeof x> => x !== null),
    );
    return this.listGroups();
  }

  /**
   * The effective operating policy for a company — the heart of the Policy
   * Engine. Resolution precedence:
   *   1. sub-tenancy  (a carrier-owned client is private to its owner),
   *   2. Plan         (the company's membership → its Policy Profile),
   *   3. legacy direct group membership (`clientIds`),
   *   4. default      (full access, no limits).
   */
  async effectiveForCompany(companyId: string | null | undefined) {
    if (!companyId) return DEFAULT_POLICY;
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: {
        ownerCarrierId: true,
        plan: { include: { policyGroup: true, modules: { include: { module: true } } } },
      },
    });
    // 1. Sub-tenancy overrides everything.
    if (company?.ownerCarrierId) {
      return {
        ...DEFAULT_POLICY,
        allowMarket: false,
        allowDirect: true,
        forcedCarrierId: company.ownerCarrierId,
        allowMarketPricing: false,
        visibilityScope: 'CARRIER',
      };
    }
    // 2. Plan → its Policy Profile (with an optional plan-level commission override).
    //    The plan's included priced modules each grant their feature key, and the
    //    plan's included truck limit becomes the `maxFleetSize` capability limit —
    //    layered on top of the profile's own features.
    if (company?.plan?.active && company.plan.policyGroup) {
      const policy = toDto(company.plan.policyGroup as GroupRow).policy;
      if (company.plan.commissionRateOverride != null) {
        policy.commissionRate = Number(company.plan.commissionRateOverride);
      }
      const planModuleKeys = (company.plan.modules ?? [])
        .filter((m) => m.module.active)
        .map((m) => m.module.key);
      if (planModuleKeys.length || company.plan.includedTruckLimit != null) {
        const features: Record<string, boolean | number> = { ...(policy.features ?? {}) };
        for (const key of planModuleKeys) features[key] = true;
        if (company.plan.includedTruckLimit != null) features.maxFleetSize = company.plan.includedTruckLimit;
        policy.features = features;
      }
      return policy;
    }
    // 3. Legacy direct group membership.
    const g = await this.prisma.policyGroup.findFirst({ where: { clientIds: { has: companyId } } });
    return g ? toDto(g as GroupRow).policy : DEFAULT_POLICY;
  }

  /** Whether a company's effective policy grants a capability (absent = allowed). */
  async hasFeature(companyId: string | null | undefined, key: string): Promise<boolean> {
    const policy = await this.effectiveForCompany(companyId);
    const f = policy.features as Record<string, boolean | number> | undefined;
    return f?.[key] !== false;
  }

  // ─── Provider visibility ─────────────────────────────────────

  /**
   * The carrier ids a client may see/deal with, or `null` for the whole
   * marketplace. ALL (or no group) → null; CARRIER → the single forced carrier;
   * GROUP → the carriers in the group's visible carrier group.
   */
  async visibleCarrierIds(clientId: string | null | undefined): Promise<string[] | null> {
    if (!clientId) return null;
    // A carrier-owned client can only ever deal with its owner.
    const company = await this.prisma.company.findUnique({
      where: { id: clientId },
      select: { ownerCarrierId: true },
    });
    if (company?.ownerCarrierId) return [company.ownerCarrierId];
    const g = await this.prisma.policyGroup.findFirst({ where: { clientIds: { has: clientId } } });
    if (!g || g.visibilityScope === 'ALL') return null;
    if (g.visibilityScope === 'CARRIER') return g.forcedCarrierId ? [g.forcedCarrierId] : [];
    if (g.visibleCarrierGroupId) {
      const cg = await this.prisma.carrierGroup.findUnique({ where: { id: g.visibleCarrierGroupId } });
      return cg?.carrierIds ?? [];
    }
    return [];
  }

  /**
   * The active carriers a client may target for a DIRECT order — the visible
   * subset per its group's visibility scope, or all active carriers when the
   * scope is ALL. Powers the client order form's carrier picker so it only
   * offers providers the server would actually accept.
   */
  async visibleCarriersForClient(clientId: string | null | undefined) {
    const ids = await this.visibleCarrierIds(clientId);
    return this.prisma.company.findMany({
      where: {
        type: 'CARRIER',
        status: 'ACTIVE',
        ...(ids === null ? {} : { id: { in: ids } }),
      },
      select: { id: true, nameAr: true, nameEn: true, city: true },
      orderBy: { nameAr: 'asc' },
    });
  }

  /** Whether a carrier may see/bid on a given client's marketplace orders. */
  async canCarrierServeClient(carrierId: string, clientId: string): Promise<boolean> {
    const allowed = await this.visibleCarrierIds(clientId);
    return allowed === null || allowed.includes(carrierId);
  }

  /**
   * Client ids whose marketplace orders are hidden from this carrier — used to
   * filter the carrier's market listing. A client restricts a carrier when its
   * group's visibility is not ALL and the carrier is not in the allowed set.
   */
  async restrictedClientIdsForCarrier(carrierId: string): Promise<string[]> {
    const groups = await this.prisma.policyGroup.findMany({ where: { NOT: { visibilityScope: 'ALL' } } });
    if (groups.length === 0) return [];
    const cgIds = groups.map((g) => g.visibleCarrierGroupId).filter((x): x is string => !!x);
    const cgs = cgIds.length
      ? await this.prisma.carrierGroup.findMany({ where: { id: { in: cgIds } } })
      : [];
    const cgMap = new Map(cgs.map((c) => [c.id, c.carrierIds]));
    const restricted: string[] = [];
    for (const g of groups) {
      const allowed = g.visibilityScope === 'CARRIER'
        ? (g.forcedCarrierId ? [g.forcedCarrierId] : [])
        : (g.visibleCarrierGroupId ? cgMap.get(g.visibleCarrierGroupId) ?? [] : []);
      if (!allowed.includes(carrierId)) restricted.push(...g.clientIds);
    }
    return Array.from(new Set(restricted));
  }

  // ─── Provider (carrier) groups ───────────────────────────────

  listCarrierGroups() {
    return this.prisma.carrierGroup.findMany({ orderBy: { createdAt: 'asc' } });
  }

  createCarrierGroup(dto: { name: string; description?: string }) {
    return this.prisma.carrierGroup.create({
      data: { name: dto.name, description: dto.description, carrierIds: [] },
    });
  }

  async updateCarrierGroup(id: string, dto: { name?: string; description?: string; carrierIds?: string[] }) {
    const g = await this.prisma.carrierGroup.findUnique({ where: { id } });
    if (!g) throw new NotFoundException({ code: 'CARRIER_GROUP_NOT_FOUND', message: 'مجموعة المزوّدين غير موجودة' });
    return this.prisma.carrierGroup.update({
      where: { id },
      data: { name: dto.name, description: dto.description, carrierIds: dto.carrierIds },
    });
  }

  async deleteCarrierGroup(id: string) {
    const g = await this.prisma.carrierGroup.findUnique({ where: { id } });
    if (!g) throw new NotFoundException({ code: 'CARRIER_GROUP_NOT_FOUND', message: 'مجموعة المزوّدين غير موجودة' });
    // Detach any client group that pointed at this carrier group.
    await this.prisma.policyGroup.updateMany({
      where: { visibleCarrierGroupId: id },
      data: { visibleCarrierGroupId: null, visibilityScope: 'ALL' },
    });
    await this.prisma.carrierGroup.delete({ where: { id } });
    return { id };
  }

  private async ensure(id: string) {
    const g = await this.prisma.policyGroup.findUnique({ where: { id } });
    if (!g) throw new NotFoundException({ code: 'GROUP_NOT_FOUND', message: 'المجموعة غير موجودة' });
    return g;
  }

  // ─── Plans (memberships) ─────────────────────────────────────

  /** Compute a plan's prices from its base + included modules (the source of
   *  truth for the "dynamic pricing" shown in the admin builder and at signup). */
  private priceOf(plan: {
    isFree: boolean; basePrice: Prisma.Decimal | number; yearlyDiscountPct: Prisma.Decimal | number;
    modules?: Array<{ module: { price: Prisma.Decimal | number; active: boolean } }>;
  }) {
    const modulesTotal = (plan.modules ?? [])
      .filter((m) => m.module.active)
      .reduce((s, m) => s + Number(m.module.price), 0);
    const monthly = plan.isFree ? 0 : +(Number(plan.basePrice) + modulesTotal).toFixed(2);
    const discount = Number(plan.yearlyDiscountPct) || 0;
    const yearly = +(monthly * 12 * (1 - discount / 100)).toFixed(2);
    return { monthly, yearly, modulesTotal: +modulesTotal.toFixed(2) };
  }

  private planInclude = {
    policyGroup: { select: { id: true, name: true } },
    modules: { include: { module: true } },
    _count: { select: { companies: true, subscriptions: true } },
  } as const;

  private toPlanDto = (plan: Prisma.PlanGetPayload<{ include: PoliciesService['planInclude'] }>) => ({
    ...plan,
    basePrice: Number(plan.basePrice),
    yearlyDiscountPct: Number(plan.yearlyDiscountPct),
    commissionRateOverride: plan.commissionRateOverride != null ? Number(plan.commissionRateOverride) : null,
    moduleIds: plan.modules.map((m) => m.moduleId),
    modules: plan.modules.map((m) => ({ ...m.module, price: Number(m.module.price) })),
    price: this.priceOf(plan),
  });

  async listPlans() {
    const plans = await this.prisma.plan.findMany({
      orderBy: [{ audience: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: this.planInclude,
    });
    return plans.map((p) => this.toPlanDto(p));
  }

  async getPlan(id: string) {
    const plan = await this.prisma.plan.findUnique({ where: { id }, include: this.planInclude });
    if (!plan) throw new NotFoundException({ code: 'PLAN_NOT_FOUND', message: 'الباقة غير موجودة' });
    return this.toPlanDto(plan);
  }

  private async validModuleIds(moduleIds: string[] | undefined) {
    if (!moduleIds || moduleIds.length === 0) return [];
    const found = await this.prisma.planModule.findMany({ where: { id: { in: moduleIds } }, select: { id: true } });
    const set = new Set(found.map((m) => m.id));
    const missing = moduleIds.filter((id) => !set.has(id));
    if (missing.length) throw new NotFoundException({ code: 'PLAN_MODULE_NOT_FOUND', message: `موديول غير موجود: ${missing.join(', ')}` });
    return moduleIds;
  }

  async createPlan(dto: {
    name: string; nameEn?: string; description?: string; tier?: string;
    audience?: string; policyGroupId: string; commissionRateOverride?: number;
    isDefault?: boolean; active?: boolean;
    isFree?: boolean; basePrice?: number; billingCycle?: string; yearlyDiscountPct?: number;
    includedTruckLimit?: number | null; trialDays?: number; sortOrder?: number; moduleIds?: string[];
  }) {
    await this.ensure(dto.policyGroupId); // the profile must exist
    const moduleIds = await this.validModuleIds(dto.moduleIds);
    const plan = await this.prisma.plan.create({
      data: {
        name: dto.name, nameEn: dto.nameEn, description: dto.description, tier: dto.tier,
        audience: dto.audience ?? 'BOTH', policyGroupId: dto.policyGroupId,
        commissionRateOverride: dto.commissionRateOverride ?? null,
        isDefault: dto.isDefault ?? false, active: dto.active ?? true,
        isFree: dto.isFree ?? true, basePrice: dto.basePrice ?? 0,
        billingCycle: dto.billingCycle ?? 'MONTHLY', yearlyDiscountPct: dto.yearlyDiscountPct ?? 0,
        includedTruckLimit: dto.includedTruckLimit ?? null, trialDays: dto.trialDays ?? 0,
        sortOrder: dto.sortOrder ?? 0,
        modules: { create: moduleIds.map((moduleId) => ({ moduleId })) },
      },
    });
    if (plan.isDefault) await this.clearOtherDefaults(plan.id, plan.audience);
    return this.getPlan(plan.id);
  }

  async updatePlan(id: string, dto: {
    name?: string; nameEn?: string; description?: string; tier?: string;
    audience?: string; policyGroupId?: string; commissionRateOverride?: number | null;
    isDefault?: boolean; active?: boolean;
    isFree?: boolean; basePrice?: number; billingCycle?: string; yearlyDiscountPct?: number;
    includedTruckLimit?: number | null; trialDays?: number; sortOrder?: number; moduleIds?: string[];
  }) {
    const existing = await this.prisma.plan.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException({ code: 'PLAN_NOT_FOUND', message: 'الباقة غير موجودة' });
    if (dto.policyGroupId) await this.ensure(dto.policyGroupId);
    // Replace the module set when moduleIds is provided.
    if (dto.moduleIds !== undefined) {
      await this.validModuleIds(dto.moduleIds);
      await this.prisma.planModuleLink.deleteMany({ where: { planId: id } });
    }
    const plan = await this.prisma.plan.update({
      where: { id },
      data: {
        name: dto.name, nameEn: dto.nameEn, description: dto.description, tier: dto.tier,
        audience: dto.audience, policyGroupId: dto.policyGroupId,
        ...(dto.commissionRateOverride !== undefined ? { commissionRateOverride: dto.commissionRateOverride } : {}),
        isDefault: dto.isDefault, active: dto.active,
        isFree: dto.isFree, basePrice: dto.basePrice,
        billingCycle: dto.billingCycle, yearlyDiscountPct: dto.yearlyDiscountPct,
        ...(dto.includedTruckLimit !== undefined ? { includedTruckLimit: dto.includedTruckLimit } : {}),
        trialDays: dto.trialDays, sortOrder: dto.sortOrder,
        ...(dto.moduleIds !== undefined ? { modules: { create: dto.moduleIds.map((moduleId) => ({ moduleId })) } } : {}),
      },
    });
    if (plan.isDefault) await this.clearOtherDefaults(plan.id, plan.audience);
    return this.getPlan(plan.id);
  }

  async deletePlan(id: string) {
    const plan = await this.prisma.plan.findUnique({ where: { id }, include: { _count: { select: { companies: true } } } });
    if (!plan) throw new NotFoundException({ code: 'PLAN_NOT_FOUND', message: 'الباقة غير موجودة' });
    // Detach any subscribers first (they fall back to default/legacy resolution).
    if (plan._count.companies > 0) {
      await this.prisma.company.updateMany({ where: { planId: id }, data: { planId: null } });
    }
    await this.prisma.plan.delete({ where: { id } });
    return { id };
  }

  // ─── Plan modules (priced capability catalog) ────────────────

  async listPlanModules() {
    const mods = await this.prisma.planModule.findMany({
      orderBy: [{ audience: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: { _count: { select: { plans: true } } },
    });
    return mods.map((m) => ({ ...m, price: Number(m.price) }));
  }

  async createPlanModule(dto: {
    key: string; name: string; nameEn?: string; description?: string;
    audience?: string; price?: number; active?: boolean; sortOrder?: number;
  }) {
    const exists = await this.prisma.planModule.findUnique({ where: { key: dto.key } });
    if (exists) throw new BadRequestException({ code: 'PLAN_MODULE_KEY_TAKEN', message: 'مفتاح الموديول مستخدم بالفعل' });
    const m = await this.prisma.planModule.create({
      data: {
        key: dto.key, name: dto.name, nameEn: dto.nameEn, description: dto.description,
        audience: dto.audience ?? 'CARRIER', price: dto.price ?? 0,
        active: dto.active ?? true, sortOrder: dto.sortOrder ?? 0,
      },
    });
    return { ...m, price: Number(m.price) };
  }

  async updatePlanModule(id: string, dto: {
    name?: string; nameEn?: string; description?: string;
    audience?: string; price?: number; active?: boolean; sortOrder?: number;
  }) {
    const existing = await this.prisma.planModule.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException({ code: 'PLAN_MODULE_NOT_FOUND', message: 'الموديول غير موجود' });
    const m = await this.prisma.planModule.update({
      where: { id },
      data: {
        name: dto.name, nameEn: dto.nameEn, description: dto.description,
        audience: dto.audience, price: dto.price, active: dto.active, sortOrder: dto.sortOrder,
      },
    });
    return { ...m, price: Number(m.price) };
  }

  async deletePlanModule(id: string) {
    const m = await this.prisma.planModule.findUnique({ where: { id } });
    if (!m) throw new NotFoundException({ code: 'PLAN_MODULE_NOT_FOUND', message: 'الموديول غير موجود' });
    await this.prisma.planModule.delete({ where: { id } }); // cascades its plan links
    return { id };
  }

  /** Subscribe a company to a plan (or clear it). */
  async assignPlan(companyId: string, planId: string | null | undefined) {
    const company = await this.prisma.company.findUnique({ where: { id: companyId }, select: { id: true } });
    if (!company) throw new NotFoundException({ code: 'COMPANY_NOT_FOUND', message: 'الشركة غير موجودة' });
    if (planId) {
      const plan = await this.prisma.plan.findUnique({ where: { id: planId }, select: { id: true } });
      if (!plan) throw new NotFoundException({ code: 'PLAN_NOT_FOUND', message: 'الباقة غير موجودة' });
    }
    await this.prisma.company.update({ where: { id: companyId }, data: { planId: planId ?? null } });
    return { companyId, planId: planId ?? null };
  }

  /** Only one default plan per audience. */
  private async clearOtherDefaults(planId: string, audience: string) {
    await this.prisma.plan.updateMany({
      where: { id: { not: planId }, audience, isDefault: true },
      data: { isDefault: false },
    });
  }
}

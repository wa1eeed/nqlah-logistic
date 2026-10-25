import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateGroupDto, UpdateGroupDto } from './dto/policy.dto';

const DEFAULT_POLICY = {
  allowMarket: true,
  allowDirect: true,
  forcedCarrierId: undefined as string | undefined,
  allowMarketPricing: true,
  allowFixedPricing: true,
  allowPrepaid: true,
  allowCOD: true,
  visibilityScope: 'ALL',
  visibleCarrierGroupId: undefined as string | undefined,
};

type GroupRow = {
  id: string; name: string; description: string | null;
  allowMarket: boolean; allowDirect: boolean; forcedCarrierId: string | null;
  allowMarketPricing: boolean; allowFixedPricing: boolean; allowPrepaid: boolean; allowCOD: boolean;
  visibilityScope: string; visibleCarrierGroupId: string | null;
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
      visibilityScope: g.visibilityScope,
      visibleCarrierGroupId: g.visibleCarrierGroupId ?? undefined,
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
              visibilityScope: p.visibilityScope ?? 'ALL',
              visibleCarrierGroupId: p.visibleCarrierGroupId ?? null,
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

  /** The effective policy for a client company: its group's policy, else default. */
  async effectiveForCompany(companyId: string | null | undefined) {
    if (!companyId) return DEFAULT_POLICY;
    const g = await this.prisma.policyGroup.findFirst({ where: { clientIds: { has: companyId } } });
    return g ? toDto(g as GroupRow).policy : DEFAULT_POLICY;
  }

  // ─── Provider visibility ─────────────────────────────────────

  /**
   * The carrier ids a client may see/deal with, or `null` for the whole
   * marketplace. ALL (or no group) → null; CARRIER → the single forced carrier;
   * GROUP → the carriers in the group's visible carrier group.
   */
  async visibleCarrierIds(clientId: string | null | undefined): Promise<string[] | null> {
    if (!clientId) return null;
    const g = await this.prisma.policyGroup.findFirst({ where: { clientIds: { has: clientId } } });
    if (!g || g.visibilityScope === 'ALL') return null;
    if (g.visibilityScope === 'CARRIER') return g.forcedCarrierId ? [g.forcedCarrierId] : [];
    if (g.visibleCarrierGroupId) {
      const cg = await this.prisma.carrierGroup.findUnique({ where: { id: g.visibleCarrierGroupId } });
      return cg?.carrierIds ?? [];
    }
    return [];
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
}

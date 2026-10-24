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
};

type GroupRow = {
  id: string; name: string; description: string | null;
  allowMarket: boolean; allowDirect: boolean; forcedCarrierId: string | null;
  allowMarketPricing: boolean; allowFixedPricing: boolean; allowPrepaid: boolean; allowCOD: boolean;
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

  private async ensure(id: string) {
    const g = await this.prisma.policyGroup.findUnique({ where: { id } });
    if (!g) throw new NotFoundException({ code: 'GROUP_NOT_FOUND', message: 'المجموعة غير موجودة' });
    return g;
  }
}

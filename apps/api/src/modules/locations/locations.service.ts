import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma } from '../../generated/prisma';
import {
  CreateCityDto, CreateCountryDto, CreateRegionDto,
  UpdateCityDto, UpdateCountryDto, UpdateRegionDto,
} from './dto/location.dto';

@Injectable()
export class LocationsService {
  constructor(private prisma: PrismaService) {}

  // ─── Public tree ────────────────────────────────────────────
  /**
   * The active geography the apps build cascading country → region → city
   * pickers from: active countries only, each with its active regions, each
   * with its active cities, all ordered by (sortOrder, nameAr).
   */
  async publicTree() {
    const countries = await this.prisma.country.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: 'asc' }, { nameAr: 'asc' }],
      include: {
        regions: {
          where: { active: true },
          orderBy: [{ sortOrder: 'asc' }, { nameAr: 'asc' }],
          include: {
            cities: {
              where: { active: true },
              orderBy: [{ sortOrder: 'asc' }, { nameAr: 'asc' }],
            },
          },
        },
      },
    });
    return countries.map((c) => ({
      id: c.id,
      code: c.code,
      nameAr: c.nameAr,
      nameEn: c.nameEn,
      dialCode: c.dialCode,
      regions: c.regions.map((r) => ({
        id: r.id,
        nameAr: r.nameAr,
        nameEn: r.nameEn,
        cities: r.cities.map((ct) => ({ id: ct.id, nameAr: ct.nameAr, nameEn: ct.nameEn })),
      })),
    }));
  }

  // ─── Admin: full tree (incl. inactive, with counts) ─────────
  adminTree() {
    return this.prisma.country.findMany({
      orderBy: [{ sortOrder: 'asc' }, { nameAr: 'asc' }],
      include: {
        regions: {
          orderBy: [{ sortOrder: 'asc' }, { nameAr: 'asc' }],
          include: {
            cities: { orderBy: [{ sortOrder: 'asc' }, { nameAr: 'asc' }] },
          },
        },
      },
    });
  }

  // ─── Countries ──────────────────────────────────────────────
  async createCountry(dto: CreateCountryDto) {
    const code = dto.code.toUpperCase();
    try {
      return await this.prisma.country.create({
        data: {
          code,
          nameAr: dto.nameAr,
          nameEn: dto.nameEn,
          dialCode: dto.dialCode ?? null,
          active: dto.active ?? true,
          sortOrder: dto.sortOrder ?? 0,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(`الدولة بالرمز ${code} موجودة بالفعل`);
      }
      throw e;
    }
  }

  async updateCountry(id: string, dto: UpdateCountryDto) {
    await this.mustFindCountry(id);
    const data: Prisma.CountryUpdateInput = {};
    if (dto.code !== undefined) data.code = dto.code.toUpperCase();
    if (dto.nameAr !== undefined) data.nameAr = dto.nameAr;
    if (dto.nameEn !== undefined) data.nameEn = dto.nameEn;
    if (dto.dialCode !== undefined) data.dialCode = dto.dialCode || null;
    if (dto.active !== undefined) data.active = dto.active;
    if (dto.sortOrder !== undefined) data.sortOrder = dto.sortOrder;
    try {
      return await this.prisma.country.update({ where: { id }, data });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('رمز الدولة مستخدم بالفعل');
      }
      throw e;
    }
  }

  /** Delete a country and (cascade) all its regions/cities. */
  async deleteCountry(id: string) {
    await this.mustFindCountry(id);
    await this.prisma.country.delete({ where: { id } });
    return { ok: true };
  }

  // ─── Regions ────────────────────────────────────────────────
  async createRegion(dto: CreateRegionDto) {
    await this.mustFindCountry(dto.countryId);
    return this.prisma.region.create({
      data: {
        countryId: dto.countryId,
        nameAr: dto.nameAr,
        nameEn: dto.nameEn,
        active: dto.active ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async updateRegion(id: string, dto: UpdateRegionDto) {
    const region = await this.prisma.region.findUnique({ where: { id } });
    if (!region) throw new NotFoundException('المنطقة غير موجودة');
    return this.prisma.region.update({
      where: { id },
      data: {
        ...(dto.nameAr !== undefined && { nameAr: dto.nameAr }),
        ...(dto.nameEn !== undefined && { nameEn: dto.nameEn }),
        ...(dto.active !== undefined && { active: dto.active }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
    });
  }

  async deleteRegion(id: string) {
    const region = await this.prisma.region.findUnique({ where: { id } });
    if (!region) throw new NotFoundException('المنطقة غير موجودة');
    await this.prisma.region.delete({ where: { id } });
    return { ok: true };
  }

  // ─── Cities ─────────────────────────────────────────────────
  async createCity(dto: CreateCityDto) {
    const region = await this.prisma.region.findUnique({ where: { id: dto.regionId } });
    if (!region) throw new BadRequestException('المنطقة غير موجودة');
    return this.prisma.city.create({
      data: {
        regionId: dto.regionId,
        nameAr: dto.nameAr,
        nameEn: dto.nameEn,
        active: dto.active ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async updateCity(id: string, dto: UpdateCityDto) {
    const city = await this.prisma.city.findUnique({ where: { id } });
    if (!city) throw new NotFoundException('المدينة غير موجودة');
    return this.prisma.city.update({
      where: { id },
      data: {
        ...(dto.nameAr !== undefined && { nameAr: dto.nameAr }),
        ...(dto.nameEn !== undefined && { nameEn: dto.nameEn }),
        ...(dto.active !== undefined && { active: dto.active }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
    });
  }

  async deleteCity(id: string) {
    const city = await this.prisma.city.findUnique({ where: { id } });
    if (!city) throw new NotFoundException('المدينة غير موجودة');
    await this.prisma.city.delete({ where: { id } });
    return { ok: true };
  }

  private async mustFindCountry(id: string) {
    const country = await this.prisma.country.findUnique({ where: { id } });
    if (!country) throw new NotFoundException('الدولة غير موجودة');
    return country;
  }
}

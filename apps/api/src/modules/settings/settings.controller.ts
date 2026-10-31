import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(private prisma: PrismaService) {}

  @Public()
  @Get('catalogs')
  async catalogs() {
    const rows = await this.prisma.setting.findMany({
      where: { key: { in: ['catalog.cities', 'catalog.cargo_types', 'catalog.truck_types'] } },
    });
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
      cities:     map['catalog.cities']      ? JSON.parse(map['catalog.cities'])      : null,
      cargoTypes: map['catalog.cargo_types'] ? JSON.parse(map['catalog.cargo_types']) : null,
      truckTypes: map['catalog.truck_types'] ? JSON.parse(map['catalog.truck_types']) : null,
    };
  }

  /** Public endpoint — returns platform branding for all portals to display. */
  @Public()
  @Get('platform')
  async platform() {
    const rows = await this.prisma.setting.findMany({
      where: { key: { in: ['platform.logoUrl', 'platform.logoUrlDark', 'platform.nameAr', 'platform.nameEn', 'platform.defaultLocale'] } },
    });
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    const logoUrl = map['platform.logoUrl'] ?? '';
    return {
      logoUrl,
      // Dark-mode logo variant; falls back to the light logo when unset so
      // portals can always render something on a dark surface.
      logoUrlDark: map['platform.logoUrlDark'] || logoUrl,
      nameAr:  map['platform.nameAr']  ?? 'نقلة لوجيستك',
      nameEn:  map['platform.nameEn']  ?? 'Naqla Logistics',
      // Default UI language every dashboard adopts when the visitor hasn't
      // explicitly chosen one. Arabic is the platform's primary locale.
      defaultLocale: map['platform.defaultLocale'] ?? 'ar',
    };
  }
}

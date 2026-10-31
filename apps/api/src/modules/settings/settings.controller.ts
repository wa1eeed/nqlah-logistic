import { Controller, Get, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(private prisma: PrismaService) {}

  /**
   * Best-effort country of the caller, from the CDN/proxy geo headers
   * (Cloudflare / Vercel / App Engine). Used to pre-select the phone country
   * code at registration. Falls back to SA when unknown.
   */
  @Public()
  @Get('geo')
  geo(@Req() req: { headers: Record<string, string | string[] | undefined> }) {
    const h = req.headers;
    const raw = (h['cf-ipcountry'] ?? h['x-vercel-ip-country'] ?? h['x-appengine-country']) as
      | string
      | undefined;
    const country = (raw ?? '').toString().toUpperCase();
    const valid = /^[A-Z]{2}$/.test(country) && country !== 'XX';
    return { country: valid ? country : 'SA' };
  }

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
      where: { key: { in: ['platform.logoUrl', 'platform.logoUrlDark', 'platform.nameAr', 'platform.nameEn'] } },
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
    };
  }
}

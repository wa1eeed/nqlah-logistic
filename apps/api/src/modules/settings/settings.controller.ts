import {
  Body, Controller, ForbiddenException, Get, Headers, Put, Req, UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Audit } from '../../common/audit/audit.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AppSettingsService } from './app-settings.service';
import { CurrenciesService } from './currencies.service';
import { UpdateAppSettingsDto, UpdateVersionsDto } from './dto/app-settings.dto';
import { UpdateCurrenciesDto } from './dto/currencies.dto';

@ApiTags('settings')
@Controller('settings')
export class SettingsController {
  constructor(
    private prisma: PrismaService,
    private appSettings: AppSettingsService,
    private currencies: CurrenciesService,
  ) {}

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

  // ─── Currencies ─────────────────────────────────────────────────────
  // Admin-managed list of enabled currencies + the default one, consumed by
  // the web dashboards and the mobile app to format every money value.

  /** Public — dashboards & the app read the enabled currencies + default. */
  @Public()
  @Get('currencies')
  getCurrencies() {
    return this.currencies.getConfig();
  }

  /** Admin-only — replace the enabled list and set the default currency. */
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Put('currencies')
  @Audit({ action: 'admin.currencies.update', resourceType: 'Setting' })
  updateCurrencies(@Body() dto: UpdateCurrenciesDto) {
    return this.currencies.updateConfig(dto);
  }

  // ─── Mobile app settings ────────────────────────────────────────────
  // Splash / onboarding config + store version overview, consumed by the
  // iOS & Android apps. Managed from the admin Settings → "إعدادات التطبيق".

  /** Public — the mobile app fetches its splash, onboarding and update config. */
  @Public()
  @Get('app')
  getAppSettings() {
    return this.appSettings.getConfig();
  }

  /** Admin-only — edit the full app config (any subset of sections). */
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @Put('app')
  @Audit({ action: 'admin.appSettings.update', resourceType: 'Setting' })
  updateAppSettings(@Body() dto: UpdateAppSettingsDto) {
    return this.appSettings.updateConfig(dto);
  }

  /**
   * Deploy-pipeline hook — update the store build numbers on a new release so
   * the "current version" overview auto-updates. Authenticated with the
   * `x-deploy-token` header (shared secret from APP_VERSION_DEPLOY_TOKEN), so
   * CI can call it without a user login. See the PR / docs for wiring.
   */
  @Public()
  @Put('app/versions')
  updateAppVersions(
    @Body() dto: UpdateVersionsDto,
    @Headers('x-deploy-token') token?: string,
  ) {
    const secret = process.env.APP_VERSION_DEPLOY_TOKEN;
    if (!secret || token !== secret) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'رمز النشر غير صالح' });
    }
    return this.appSettings.updateVersions(dto);
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type {
  UpdateAppSettingsDto, UpdateVersionsDto,
} from './dto/app-settings.dto';

/** Assembled config shape returned by GET /settings/app. */
export interface AppSettingsConfig {
  splash: {
    backgroundColor: string;
    useLogo: boolean;
    logoVariant: 'light' | 'dark';
    taglineAr: string;
    taglineEn: string;
  };
  onboarding: {
    enabled: boolean;
    showOnce: boolean;
    slides: Array<{
      id: string;
      imageUrl: string;
      titleAr: string;
      titleEn: string;
      bodyAr: string;
      bodyEn: string;
    }>;
  };
  versions: {
    iosLive: string;
    iosTestFlight: string;
    androidLive: string;
    androidTestFlight: string;
  };
  update: {
    minSupportedVersion: string;
    forceUpdate: boolean;
    messageAr: string;
    messageEn: string;
  };
}

// ─── Setting keys (all under category "app") ──────────────────────────
const K_SPLASH = 'app.splash';
const K_ONBOARDING = 'app.onboarding';
const K_UPDATE = 'app.update';
const K_VER_IOS_LIVE = 'app.version.iosLive';
const K_VER_IOS_TF = 'app.version.iosTestFlight';
const K_VER_AND_LIVE = 'app.version.androidLive';
const K_VER_AND_TF = 'app.version.androidTestFlight';

const VERSION_KEYS = [K_VER_IOS_LIVE, K_VER_IOS_TF, K_VER_AND_LIVE, K_VER_AND_TF];
const ALL_KEYS = [K_SPLASH, K_ONBOARDING, K_UPDATE, ...VERSION_KEYS];

const DEFAULTS: AppSettingsConfig = {
  splash: {
    backgroundColor: '#0A2A28',
    useLogo: true,
    logoVariant: 'light',
    taglineAr: '',
    taglineEn: '',
  },
  onboarding: { enabled: false, showOnce: true, slides: [] },
  versions: { iosLive: '', iosTestFlight: '', androidLive: '', androidTestFlight: '' },
  update: { minSupportedVersion: '', forceUpdate: false, messageAr: '', messageEn: '' },
};

/** Parse a JSON Setting value, falling back to the default on malformed data. */
function parseJson<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return { ...fallback, ...(JSON.parse(raw) as object) } as T;
  } catch {
    return fallback;
  }
}

@Injectable()
export class AppSettingsService {
  constructor(private prisma: PrismaService) {}

  /** Read every app.* key and assemble the config the mobile app consumes. */
  async getConfig(): Promise<AppSettingsConfig> {
    const rows = await this.prisma.setting.findMany({ where: { key: { in: ALL_KEYS } } });
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

    const slides = parseJson<AppSettingsConfig['onboarding']>(
      map[K_ONBOARDING], DEFAULTS.onboarding,
    );

    return {
      splash: parseJson(map[K_SPLASH], DEFAULTS.splash),
      // parseJson merges top-level keys; re-normalise slides to an array.
      onboarding: {
        ...DEFAULTS.onboarding,
        ...slides,
        slides: Array.isArray(slides.slides) ? slides.slides : [],
      },
      versions: {
        iosLive: map[K_VER_IOS_LIVE] ?? DEFAULTS.versions.iosLive,
        iosTestFlight: map[K_VER_IOS_TF] ?? DEFAULTS.versions.iosTestFlight,
        androidLive: map[K_VER_AND_LIVE] ?? DEFAULTS.versions.androidLive,
        androidTestFlight: map[K_VER_AND_TF] ?? DEFAULTS.versions.androidTestFlight,
      },
      update: parseJson(map[K_UPDATE], DEFAULTS.update),
    };
  }

  /** Upsert one Setting row (category "app"). */
  private async put(key: string, value: string) {
    await this.prisma.setting.upsert({
      where: { key },
      create: { key, value, category: 'app' },
      update: { value },
    });
  }

  /**
   * Admin edit. Only the sections present in the payload are written; each is
   * merged onto the stored value so a partial save never clears siblings.
   */
  async updateConfig(dto: UpdateAppSettingsDto): Promise<AppSettingsConfig> {
    const current = await this.getConfig();

    if (dto.splash) {
      await this.put(K_SPLASH, JSON.stringify({ ...current.splash, ...dto.splash }));
    }
    if (dto.onboarding) {
      const merged = {
        ...current.onboarding,
        ...dto.onboarding,
        slides: dto.onboarding.slides
          ? dto.onboarding.slides.map((s) => ({
              id: s.id,
              imageUrl: s.imageUrl ?? '',
              titleAr: s.titleAr ?? '',
              titleEn: s.titleEn ?? '',
              bodyAr: s.bodyAr ?? '',
              bodyEn: s.bodyEn ?? '',
            }))
          : current.onboarding.slides,
      };
      await this.put(K_ONBOARDING, JSON.stringify(merged));
    }
    if (dto.update) {
      await this.put(K_UPDATE, JSON.stringify({ ...current.update, ...dto.update }));
    }
    if (dto.versions) await this.writeVersions(dto.versions);

    return this.getConfig();
  }

  /**
   * Deploy-pipeline version update. Writes only the build numbers (and
   * optionally minSupportedVersion) provided. Returns the fresh config so the
   * caller can log the new state.
   */
  async updateVersions(dto: UpdateVersionsDto): Promise<AppSettingsConfig> {
    await this.writeVersions(dto);
    if (dto.minSupportedVersion !== undefined) {
      const current = await this.getConfig();
      await this.put(K_UPDATE, JSON.stringify({
        ...current.update, minSupportedVersion: dto.minSupportedVersion,
      }));
    }
    return this.getConfig();
  }

  private async writeVersions(v: Partial<AppSettingsConfig['versions']>) {
    const writes: Promise<void>[] = [];
    if (v.iosLive !== undefined) writes.push(this.put(K_VER_IOS_LIVE, v.iosLive));
    if (v.iosTestFlight !== undefined) writes.push(this.put(K_VER_IOS_TF, v.iosTestFlight));
    if (v.androidLive !== undefined) writes.push(this.put(K_VER_AND_LIVE, v.androidLive));
    if (v.androidTestFlight !== undefined) writes.push(this.put(K_VER_AND_TF, v.androidTestFlight));
    await Promise.all(writes);
  }
}

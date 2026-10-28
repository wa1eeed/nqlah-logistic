import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { decryptSecret, encryptSecret, isEncrypted, maskSecret } from '../../common/security/secret-box';
import { INTEGRATIONS, fieldsFor, specFor } from './integrations.registry';

type ConfigMap = Record<string, string>;

export interface UpdateIntegrationDto {
  provider?: string;
  enabled?: boolean;
  config?: Record<string, string>;
}

/**
 * Integration Hub control plane. Resolves the active provider + config for each
 * integration domain (connectors depend on this), and powers the admin console
 * (list / get / update). Secret config values are encrypted at rest.
 */
@Injectable()
export class IntegrationsService {
  constructor(private prisma: PrismaService) {}

  /** The active provider + resolved config for a domain. Precedence:
   *  DB (when the integration is enabled) → env → registry default. Secrets are
   *  decrypted here. Used by the connector factories. */
  async resolveActive(domain: string): Promise<{ provider: string; enabled: boolean; config: ConfigMap }> {
    const spec = specFor(domain);
    if (!spec) return { provider: '', enabled: false, config: {} };
    const row = await this.prisma.integration.findUnique({ where: { domain } }).catch(() => null);
    const enabled = row?.enabled ?? true;
    const provider = (
      (enabled && row?.provider) ||
      process.env[spec.providerEnvKey] ||
      spec.defaultProvider
    ).toLowerCase();
    const dbConfig = (row?.config as ConfigMap | null) ?? {};
    const config: ConfigMap = {};
    for (const f of fieldsFor(domain, provider)) {
      let v = dbConfig[f.key];
      if (v != null && v !== '' && f.secret && isEncrypted(v)) v = decryptSecret(v);
      if (v == null || v === '') v = f.envKey ? process.env[f.envKey] ?? '' : '';
      config[f.key] = v;
    }
    return { provider, enabled, config };
  }

  /** Full admin view of every integration (catalog + current state, masked). */
  async list() {
    const rows = await this.prisma.integration.findMany();
    const byDomain = new Map(rows.map((r) => [r.domain, r]));
    return INTEGRATIONS.map((spec) => this.view(spec.domain, byDomain.get(spec.domain)));
  }

  async get(domain: string) {
    const spec = specFor(domain);
    if (!spec) throw new NotFoundException({ code: 'INTEGRATION_NOT_FOUND', message: 'التكامل غير موجود' });
    const row = await this.prisma.integration.findUnique({ where: { domain } });
    return this.view(domain, row);
  }

  async update(domain: string, dto: UpdateIntegrationDto) {
    const spec = specFor(domain);
    if (!spec) throw new NotFoundException({ code: 'INTEGRATION_NOT_FOUND', message: 'التكامل غير موجود' });
    if (dto.provider && !spec.providers.some((p) => p.id === dto.provider)) {
      throw new BadRequestException({ code: 'BAD_PROVIDER', message: 'مزوّد غير معروف لهذا التكامل' });
    }
    if (
      process.env.NODE_ENV === 'production' &&
      dto.provider &&
      spec.prodForbiddenProviders?.includes(dto.provider)
    ) {
      throw new BadRequestException({ code: 'PROVIDER_NOT_ALLOWED_IN_PROD', message: 'هذا المزوّد مخصص للتطوير فقط' });
    }
    const existing = await this.prisma.integration.findUnique({ where: { domain } });
    const provider = dto.provider ?? existing?.provider ?? process.env[spec.providerEnvKey] ?? spec.defaultProvider;
    const config: ConfigMap = { ...((existing?.config as ConfigMap | null) ?? {}) };
    if (dto.config) {
      const fields = fieldsFor(domain, provider);
      for (const [k, raw] of Object.entries(dto.config)) {
        const field = fields.find((f) => f.key === k);
        if (!field) continue;
        if (raw == null || raw === '') {
          delete config[k]; // clearing a value reverts to env/default
          continue;
        }
        config[k] = field.secret ? encryptSecret(String(raw)) : String(raw);
      }
    }
    await this.prisma.integration.upsert({
      where: { domain },
      create: {
        domain,
        provider: dto.provider ?? null,
        enabled: dto.enabled ?? true,
        config,
      },
      update: {
        ...(dto.provider !== undefined ? { provider: dto.provider } : {}),
        ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
        config,
      },
    });
    return this.get(domain);
  }

  /** Persist a health-check result (called by the health service). */
  async recordStatus(domain: string, status: string, note?: string) {
    await this.prisma.integration.upsert({
      where: { domain },
      create: { domain, status, statusNote: note ?? null, lastTestedAt: new Date() },
      update: { status, statusNote: note ?? null, lastTestedAt: new Date() },
    });
  }

  /** Build the masked admin view for one domain. */
  private view(domain: string, row: {
    provider?: string | null; enabled?: boolean; config?: unknown;
    status?: string; statusNote?: string | null; lastTestedAt?: Date | null;
  } | null | undefined) {
    const spec = specFor(domain)!;
    const activeProvider = (
      row?.provider || process.env[spec.providerEnvKey] || spec.defaultProvider
    ).toLowerCase();
    const dbConfig = (row?.config as ConfigMap | null) ?? {};
    const config = fieldsFor(domain, activeProvider).map((f) => {
      const dbV = dbConfig[f.key];
      const envV = f.envKey ? process.env[f.envKey] : undefined;
      const hasDb = dbV != null && dbV !== '';
      const hasEnv = envV != null && envV !== '';
      let display = '';
      if (hasDb) {
        const plain = f.secret && isEncrypted(dbV) ? decryptSecret(dbV) : dbV;
        display = f.secret ? maskSecret(plain) : plain;
      } else if (hasEnv) {
        display = f.secret ? 'مضبوط عبر البيئة' : (envV as string);
      }
      return {
        key: f.key, labelAr: f.labelAr, labelEn: f.labelEn, secret: f.secret,
        required: f.required ?? false, placeholder: f.placeholder ?? null,
        source: hasDb ? 'db' : hasEnv ? 'env' : 'none',
        hasValue: hasDb || hasEnv, display,
      };
    });
    return {
      domain: spec.domain,
      labelAr: spec.labelAr, labelEn: spec.labelEn, descAr: spec.descAr,
      icon: spec.icon, category: spec.category,
      activeProvider,
      activeImplemented: spec.providers.find((p) => p.id === activeProvider)?.implemented ?? false,
      enabled: row?.enabled ?? true,
      providers: spec.providers.map((p) => ({ id: p.id, labelAr: p.labelAr, labelEn: p.labelEn, implemented: p.implemented })),
      config,
      status: row?.status ?? 'unknown',
      statusNote: row?.statusNote ?? null,
      lastTestedAt: row?.lastTestedAt ?? null,
    };
  }
}

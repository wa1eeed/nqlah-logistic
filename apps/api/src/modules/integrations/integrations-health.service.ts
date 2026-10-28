import { Inject, Injectable, Logger } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { specFor } from './integrations.registry';
import { STORAGE_CONNECTOR, type StorageConnector } from '../../integrations/storage/storage.connector';
import { FcmNotificationConnector } from '../../integrations/notifications/fcm-notification.connector';

export interface HealthResult {
  domain: string;
  status: 'ok' | 'degraded' | 'down' | 'unknown';
  note: string;
}

/**
 * Health / readiness checks for the Integration Hub. Dev stubs (console / mock)
 * always pass; real providers are checked for complete config, and storage is
 * additionally pinged live. Result is persisted on the Integration row.
 */
@Injectable()
export class IntegrationsHealthService {
  private readonly logger = new Logger('Integrations');

  constructor(
    private integrations: IntegrationsService,
    @Inject(STORAGE_CONNECTOR) private storage: StorageConnector,
  ) {}

  async test(domain: string): Promise<HealthResult> {
    const result = await this.run(domain);
    await this.integrations.recordStatus(domain, result.status, result.note);
    return result;
  }

  private async run(domain: string): Promise<HealthResult> {
    const spec = specFor(domain);
    if (!spec) return { domain, status: 'unknown', note: 'غير معروف' };
    const { provider, enabled, config } = await this.integrations.resolveActive(domain);
    if (!enabled) return { domain, status: 'down', note: 'التكامل معطّل' };

    const dev = ['console', 'mock'].includes(provider);
    const providerSpec = spec.providers.find((p) => p.id === provider);

    // A real provider that isn't implemented yet falls back to the dev stub.
    if (!dev && providerSpec && !providerSpec.implemented) {
      return { domain, status: 'degraded', note: `مزوّد "${provider}" غير مُفعّل بعد — يُستخدم البديل التطويري` };
    }

    // Live ping for storage (always active).
    if (domain === 'storage') {
      try {
        const key = `healthchecks/ping-${Date.now()}.txt`;
        const buf = Buffer.from('ok');
        await this.storage.put(key, buf, buf.length, 'text/plain');
        await this.storage.presignedGet(key, 60);
        return { domain, status: 'ok', note: `اختبار مباشر ناجح عبر ${provider}` };
      } catch (e) {
        return { domain, status: 'down', note: `فشل الاتصال بالتخزين: ${(e as Error).message}` };
      }
    }

    if (dev) return { domain, status: 'ok', note: 'وضع التطوير (محاكاة/سجل) يعمل' };

    // Real provider: verify required config is present.
    const missing = (providerSpec?.fields ?? [])
      .filter((f) => f.required && !config[f.key])
      .map((f) => f.labelAr);
    if (missing.length) {
      return { domain, status: 'down', note: `إعدادات ناقصة: ${missing.join('، ')}` };
    }

    // Live check for FCM: mint an access token from the service account to
    // prove the credentials are valid (does not send a notification).
    if (domain === 'push' && provider === 'fcm') {
      try {
        const sa = JSON.parse(config.FCM_SERVICE_ACCOUNT);
        await new FcmNotificationConnector(config.FCM_PROJECT_ID, sa).verify();
        return { domain, status: 'ok', note: 'تم التحقق من حساب خدمة FCM (توكن صالح)' };
      } catch (e) {
        return { domain, status: 'down', note: `فشل التحقق من FCM: ${(e as Error).message}` };
      }
    }

    return { domain, status: 'ok', note: `مُهيّأ عبر ${provider}` };
  }
}

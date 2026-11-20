import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { randomInt } from 'crypto';
import { normalizeSaudiPhone } from '@naqla/shared-utils';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { SMS_CONNECTOR, type SmsConnector } from '../../integrations/sms/sms.connector';
import { IntegrationsService } from '../../modules/integrations/integrations.service';
import { AuthenticaOtpConnector } from '../../integrations/otp/authentica-otp.connector';

type OtpMode =
  | { kind: 'authentica-live'; client: AuthenticaOtpConnector }
  | { kind: 'authentica-test'; testOtp: string }
  | { kind: 'local' };

/**
 * OTP service. The **provider** is resolved from the Integration Hub (`otp`
 * domain):
 *
 * - `local` (dev): a 6-digit code generated here, stored in Redis (10 min) and
 *   delivered via the SMS connector.
 * - `authentica` **live**: Authentica generates, sends and verifies the code
 *   (we never see it). Production always runs live.
 * - `authentica` **test** (staging — Authentica has no sandbox): simulated at
 *   our layer with a fixed, admin-editable code (`AUTHENTICA_TEST_OTP`); no API
 *   call, no SMS, no cost. Never used in production.
 *
 * Send throttling (3 / phone / hour) is provider-agnostic and always applied.
 * Email is never sent an OTP.
 */
@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly TTL_SECONDS = 10 * 60;
  private readonly SEND_LIMIT_PER_HOUR = 3;

  constructor(
    private redis: RedisService,
    @Inject(SMS_CONNECTOR) private sms: SmsConnector,
    private integrations: IntegrationsService,
    private prisma: PrismaService,
  ) {}

  private codeKey(phone: string) { return `otp:phone:${phone}`; }
  private sendCounterKey(phone: string) { return `otp:send-count:${phone}`; }

  /**
   * App Store / Play Store review bypass (admin-configured, stored under
   * `app.reviewOtp`; see AppSettingsService). When enabled and the caller is the
   * one designated reviewer phone, a fixed code is accepted — even in live /
   * production mode — so store reviewers can sign in while real users still get
   * a real OTP. Returns null unless this exact phone is the review number.
   */
  private async reviewMatch(phone: string): Promise<{ code: string } | null> {
    try {
      const row = await this.prisma.setting.findUnique({ where: { key: 'app.reviewOtp' } });
      if (!row?.value) return null;
      const cfg = JSON.parse(row.value) as { enabled?: boolean; phone?: string; code?: string };
      if (cfg.enabled !== true) return null;
      const num = (cfg.phone || '').trim();
      const code = (cfg.code || '').trim();
      if (!num || !code) return null;
      // `phone` is already normalized by the caller; normalize the stored
      // number the same way so the match is format-agnostic (05… vs +9665…).
      if (normalizeSaudiPhone(num) !== normalizeSaudiPhone(phone)) return null;
      return { code };
    } catch {
      return null; // never let a malformed setting break real OTP
    }
  }

  /** Resolve the active OTP mode from the hub. Production forces Authentica
   *  live; staging defaults to the simulated test mode. */
  private async resolveMode(): Promise<OtpMode> {
    const { provider, config } = await this.integrations.resolveActive('otp');
    if (provider === 'authentica') {
      const apiKey = (config.AUTHENTICA_API_KEY || '').trim();
      const isProd = process.env.NODE_ENV === 'production';
      const wantLive = isProd || (config.AUTHENTICA_MODE || '').toLowerCase() === 'live';
      if (wantLive && apiKey) {
        return {
          kind: 'authentica-live',
          client: new AuthenticaOtpConnector(apiKey, {
            channel: config.AUTHENTICA_CHANNEL,
            templateId: config.AUTHENTICA_TEMPLATE_ID,
            fallbackEmail: config.AUTHENTICA_FALLBACK_EMAIL,
          }),
        };
      }
      if (wantLive && !apiKey) {
        this.logger.warn('Authentica live requested but API key missing — using test mode.');
      }
      return { kind: 'authentica-test', testOtp: (config.AUTHENTICA_TEST_OTP || '123456').trim() };
    }
    return { kind: 'local' };
  }

  async send(phone: string): Promise<{ sent: true; expiresIn: number }> {
    // Store-review bypass: the one reviewer number "receives" the fixed code
    // with no SMS/API call and no throttle, so review testing never gets
    // blocked. Checked before everything else.
    if (await this.reviewMatch(phone)) {
      this.logger.warn(`🧪 [Store review] OTP send bypass for reviewer phone ${phone}`);
      return { sent: true, expiresIn: this.TTL_SECONDS };
    }

    // Throttle sends per phone (anti-abuse) — applied to every provider.
    const sends = await this.redis.incrWithTTL(this.sendCounterKey(phone), 3600);
    if (sends > this.SEND_LIMIT_PER_HOUR) {
      throw new BadRequestException({
        code: 'OTP_RATE_LIMIT',
        message: 'تم إرسال الكثير من رموز التحقق. حاول بعد ساعة.',
      });
    }

    const mode = await this.resolveMode();

    if (mode.kind === 'authentica-live') {
      try {
        await mode.client.send(phone);
      } catch (e) {
        this.logger.error(`Authentica send failed: ${(e as Error).message}`);
        throw new BadRequestException({
          code: 'OTP_SEND_FAILED',
          message: 'تعذّر إرسال رمز التحقق. حاول لاحقاً.',
        });
      }
      return { sent: true, expiresIn: this.TTL_SECONDS };
    }

    if (mode.kind === 'authentica-test') {
      // Simulated: fixed admin-configurable code, no API call / SMS / cost.
      this.logger.warn(`🔐 [Authentica TEST] OTP for ${phone} = ${mode.testOtp}`);
      return { sent: true, expiresIn: this.TTL_SECONDS };
    }

    // local: generate + store + deliver via the SMS connector.
    const code = String(randomInt(100000, 1000000));
    await this.redis.setWithTTL(this.codeKey(phone), code, this.TTL_SECONDS);
    await this.sms.send({
      to: phone,
      body: `رمز التحقق الخاص بك في نقلة: ${code}\nصالح لمدة 10 دقائق.`,
    });
    return { sent: true, expiresIn: this.TTL_SECONDS };
  }

  async verify(phone: string, code: string): Promise<boolean> {
    // Store-review bypass: the reviewer number accepts its fixed code even while
    // live OTP is active for everyone else.
    const review = await this.reviewMatch(phone);
    if (review) {
      const ok = code.trim() === review.code;
      this.logger.warn(`🧪 [Store review] OTP verify for ${phone} → ${ok ? 'accepted' : 'rejected'}`);
      return ok;
    }

    const mode = await this.resolveMode();

    if (mode.kind === 'authentica-live') {
      try {
        return await mode.client.verify(phone, code);
      } catch (e) {
        this.logger.error(`Authentica verify failed: ${(e as Error).message}`);
        return false;
      }
    }

    if (mode.kind === 'authentica-test') {
      return code.trim() === mode.testOtp;
    }

    // local: single-use code from Redis.
    if (!/^\d{6}$/.test(code)) return false;
    const stored = await this.redis.get(this.codeKey(phone));
    if (!stored || stored !== code) return false;
    await this.redis.del(this.codeKey(phone)); // single-use
    return true;
  }
}

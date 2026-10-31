import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { randomInt } from 'crypto';
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
  ) {}

  private codeKey(phone: string) { return `otp:phone:${phone}`; }
  private sendCounterKey(phone: string) { return `otp:send-count:${phone}`; }

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

import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { randomInt } from 'crypto';
import { RedisService } from '../redis/redis.service';
import { SMS_CONNECTOR, type SmsConnector } from '../../integrations/sms/sms.connector';

/**
 * SMS-only OTP service.
 *
 * - Code is 6 digits, valid for 10 minutes.
 * - Email is NEVER sent an OTP — email verification (if any) happens via a
 *   separate magic-link flow.
 * - Throttled: max 3 sends per phone per hour.
 */
@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly TTL_SECONDS = 10 * 60;
  private readonly SEND_LIMIT_PER_HOUR = 3;

  constructor(
    private redis: RedisService,
    @Inject(SMS_CONNECTOR) private sms: SmsConnector,
  ) {}

  private codeKey(phone: string) { return `otp:phone:${phone}`; }
  private sendCounterKey(phone: string) { return `otp:send-count:${phone}`; }

  async send(phone: string): Promise<{ sent: true; expiresIn: number }> {
    // Throttle sends per phone (anti-abuse)
    const sends = await this.redis.incrWithTTL(this.sendCounterKey(phone), 3600);
    if (sends > this.SEND_LIMIT_PER_HOUR) {
      throw new BadRequestException({
        code: 'OTP_RATE_LIMIT',
        message: 'تم إرسال الكثير من رموز التحقق. حاول بعد ساعة.',
      });
    }

    const code = String(randomInt(100000, 1000000));
    await this.redis.setWithTTL(this.codeKey(phone), code, this.TTL_SECONDS);

    // Delivery goes through the SMS connector (integrations gateway) — console
    // in dev, a Saudi SMS gateway in prod — so no vendor logic lives here.
    await this.sms.send({
      to: phone,
      body: `رمز التحقق الخاص بك في نقلة: ${code}\nصالح لمدة 10 دقائق.`,
    });
    return { sent: true, expiresIn: this.TTL_SECONDS };
  }

  async verify(phone: string, code: string): Promise<boolean> {
    if (!/^\d{6}$/.test(code)) return false;
    const stored = await this.redis.get(this.codeKey(phone));
    if (!stored) return false;
    if (stored !== code) return false;
    // Single-use — delete on success
    await this.redis.del(this.codeKey(phone));
    return true;
  }
}

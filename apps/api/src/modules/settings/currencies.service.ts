import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { UpdateCurrenciesDto } from './dto/currencies.dto';

/** One enabled currency. */
export interface Currency {
  code: string;
  symbol: string;
  nameAr: string;
  nameEn: string;
  decimals: number;
}

/** Shape returned by GET /settings/currencies. */
export interface CurrenciesConfig {
  currencies: Currency[];
  defaultCurrencyCode: string;
}

// ─── Setting keys (category "currencies") ─────────────────────────────
const K_LIST = 'currencies.list';
const K_DEFAULT = 'currencies.default';

// The official new Saudi Riyal sign, Unicode codepoint U+20C1. Kept as an
// escape so the exact glyph survives any editor/encoding round-trip.
const SAR_SYMBOL = '⃁';

/**
 * Seeded defaults, returned whenever the admin hasn't customised the list yet:
 * the Saudi Riyal (official U+20C1 sign) as the default, plus the US Dollar.
 */
const DEFAULTS: CurrenciesConfig = {
  currencies: [
    { code: 'SAR', symbol: SAR_SYMBOL, nameAr: 'ريال سعودي', nameEn: 'Saudi Riyal', decimals: 2 },
    { code: 'USD', symbol: '$', nameAr: 'دولار أمريكي', nameEn: 'US Dollar', decimals: 2 },
  ],
  defaultCurrencyCode: 'SAR',
};

@Injectable()
export class CurrenciesService {
  constructor(private prisma: PrismaService) {}

  /** Read the stored list + default, falling back to the seeded defaults. */
  async getConfig(): Promise<CurrenciesConfig> {
    const rows = await this.prisma.setting.findMany({
      where: { key: { in: [K_LIST, K_DEFAULT] } },
    });
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

    let currencies = DEFAULTS.currencies;
    const rawList = map[K_LIST];
    if (rawList) {
      try {
        const parsed = JSON.parse(rawList) as Currency[];
        if (Array.isArray(parsed) && parsed.length > 0) currencies = parsed;
      } catch {
        // Malformed JSON in DB — keep the seeded defaults.
      }
    }

    // The default must point at a currency that's actually in the list.
    let defaultCurrencyCode = map[K_DEFAULT] ?? DEFAULTS.defaultCurrencyCode;
    if (!currencies.some((c) => c.code === defaultCurrencyCode)) {
      defaultCurrencyCode = currencies[0]?.code ?? DEFAULTS.defaultCurrencyCode;
    }

    return { currencies, defaultCurrencyCode };
  }

  /** Upsert one Setting row (category "currencies"). */
  private async put(key: string, value: string) {
    await this.prisma.setting.upsert({
      where: { key },
      create: { key, value, category: 'currencies' },
      update: { value },
    });
  }

  /**
   * Admin edit — replace the enabled list and set the default. Validates that
   * codes are unique and the default is one of the listed currencies.
   */
  async updateConfig(dto: UpdateCurrenciesDto): Promise<CurrenciesConfig> {
    const codes = dto.currencies.map((c) => c.code);
    if (new Set(codes).size !== codes.length) {
      throw new BadRequestException({ code: 'BAD_REQUEST', message: 'لا يمكن تكرار رمز العملة' });
    }
    if (!codes.includes(dto.defaultCurrencyCode)) {
      throw new BadRequestException({
        code: 'BAD_REQUEST', message: 'العملة الافتراضية يجب أن تكون ضمن العملات المفعّلة',
      });
    }

    const normalised: Currency[] = dto.currencies.map((c) => ({
      code: c.code,
      symbol: c.symbol,
      nameAr: c.nameAr,
      nameEn: c.nameEn,
      decimals: c.decimals,
    }));

    await Promise.all([
      this.put(K_LIST, JSON.stringify(normalised)),
      this.put(K_DEFAULT, dto.defaultCurrencyCode),
    ]);

    return this.getConfig();
  }
}

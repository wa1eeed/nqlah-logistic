import { Prisma } from '../../generated/prisma';

/**
 * Money is stored and computed as exact `Decimal` (Postgres NUMERIC(12,2)).
 * These helpers keep arithmetic exact and 2-dp rounded on the server. At the
 * API boundary `normalizeDecimals` converts every Decimal to a plain `number`
 * so response shapes — and the entire frontend — are unchanged (SAR amounts
 * are far within the IEEE-754 safe-integer range once scaled to halalas).
 */
const Decimal = Prisma.Decimal;
export type Money = Prisma.Decimal;
export type MoneyInput = Prisma.Decimal.Value;

export const ZERO: Money = new Decimal(0);

/** Build a Decimal from a number/string/Decimal (null/undefined → 0). */
export const money = (v: MoneyInput | null | undefined): Money =>
  v === null || v === undefined ? new Decimal(0) : new Decimal(v);

/** Round to 2 decimal places (half-up — Decimal's default rounding). */
export const round2 = (v: Money): Money => v.toDecimalPlaces(2);

/** Decimal → number for arithmetic/serialization (null/undefined → 0). */
export const toNum = (v: MoneyInput | null | undefined): number =>
  v === null || v === undefined ? 0 : new Decimal(v).toNumber();

/**
 * Recursively replace every `Prisma.Decimal` in a response payload with a
 * plain number. Leaves Dates, Buffers and primitives untouched; walks arrays
 * and plain objects in place.
 */
export function normalizeDecimals<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (Decimal.isDecimal(value)) return (value as unknown as Money).toNumber() as unknown as T;
  if (Array.isArray(value)) return value.map((v) => normalizeDecimals(v)) as unknown as T;
  if (value instanceof Date || Buffer.isBuffer(value)) return value;
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    for (const k of Object.keys(obj)) obj[k] = normalizeDecimals(obj[k]);
    return value;
  }
  return value;
}

import type { Prisma } from '../generated/prisma';

/**
 * Compact public reference scheme for every auto-generated, human-facing ID.
 *
 *   <PREFIX><YY><LETTERS><NNN>          e.g. ORD26A001 , SUB26A001 , DRV26A001
 *
 *   PREFIX   — leading letters that identify the TYPE (ORD order, SUB
 *              subscription, DRV driver, …). See {@link PublicIdPrefix}.
 *   YY       — last two digits of the real calendar year at creation time.
 *              It advances ONLY when the actual year changes — never early,
 *              however large the within-year volume grows.
 *   LETTERS  — a bijective base-26 block (A…Z, AA…AZ, BA…, AAA…) that widens
 *              as needed so counting is effectively infinite WITHIN a year.
 *   NNN      — a 3-digit running number 001…999; when it would pass 999 the
 *              LETTERS block advances and NNN resets to 001.
 *
 * Uniqueness is GUARANTEED by an atomic per-(type, year) counter in
 * `PublicIdCounter` (a single `INSERT … ON CONFLICT … RETURNING` — never a
 * read-then-write), so concurrent requests can never mint the same value. The
 * displayed code is a pure function of that counter value, so the format is
 * deterministic and collision-free. Columns that store these values should
 * also carry a `@unique` constraint as a defence-in-depth backstop.
 */

/** Per-type leading letters. The prefix is also the counter key. */
export const PublicIdPrefix = {
  ORDER: 'ORD',
  INVOICE: 'INV',
  SUBSCRIPTION: 'SUB',
  BID: 'BID',
  DRIVER: 'DRV',
  TRUCK: 'TRK',
  COMPANY: 'CMP',
  PAYMENT: 'PAY',
  CREDIT_NOTE: 'CN',
  DEBIT_NOTE: 'DN',
  DISPUTE: 'DSP',
  TICKET: 'TKT',
} as const;

export type PublicIdPrefix = (typeof PublicIdPrefix)[keyof typeof PublicIdPrefix];

/** How many sequential numbers each LETTERS block holds (001…999). */
const BLOCK_SIZE = 999;

/**
 * Bijective base-26 encoding of a 0-based block index into letters:
 *   0 → A, 25 → Z, 26 → AA, 27 → AB, …, 701 → ZZ, 702 → AAA, …
 * (Same system as spreadsheet column names.) This is what lets the series
 * extend past Z instead of ever rolling the year forward.
 */
export function blockLetters(block0: number): string {
  let n = block0 + 1; // to 1-based
  let s = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/**
 * Format a (prefix, year, counter) triple into its public reference.
 * `counter` is the 1-based atomic sequence value for that (prefix, year).
 * Pure + deterministic; exported for unit tests.
 */
export function formatPublicId(prefix: string, year: number, counter: number): string {
  const idx0 = counter - 1;
  const nnn = (idx0 % BLOCK_SIZE) + 1; // 1…999
  const block = Math.floor(idx0 / BLOCK_SIZE); // 0-based letter block
  const yy = String(year % 100).padStart(2, '0');
  return `${prefix}${yy}${blockLetters(block)}${String(nnn).padStart(3, '0')}`;
}

/**
 * Atomically reserve the next value for (prefix, year) and return the formatted
 * public reference. Uses an upsert so it is safe under concurrency and never
 * yields a duplicate. Pass a transaction client to tie the counter to the same
 * transaction as the row being created (so a rolled-back create does not burn a
 * number); pass the PrismaService for a standalone reservation (a gap on a
 * failed create is harmless for order/driver/company-style references).
 *
 * The year defaults to the real calendar year, so the series only advances into
 * the next year when that year actually arrives.
 */
export async function nextPublicId(
  db: Prisma.TransactionClient,
  prefix: PublicIdPrefix,
  year: number = new Date().getFullYear(),
): Promise<string> {
  // Raw upsert bypasses Prisma's `@updatedAt`, so set it explicitly on both
  // branches. The atomic INSERT … ON CONFLICT … RETURNING is what guarantees no
  // two callers ever receive the same value.
  const rows = await db.$queryRaw<{ value: bigint }[]>`
    INSERT INTO "PublicIdCounter" ("type", "year", "value", "updatedAt")
    VALUES (${prefix}, ${year}, 1, NOW())
    ON CONFLICT ("type", "year")
      DO UPDATE SET "value" = "PublicIdCounter"."value" + 1, "updatedAt" = NOW()
    RETURNING "value"
  `;
  return formatPublicId(prefix, year, Number(rows[0].value));
}

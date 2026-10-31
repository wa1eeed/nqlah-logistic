import type { Prisma } from '../generated/prisma';
import { nextPublicId, PublicIdPrefix } from './public-id';

/**
 * Human-friendly public reference codes. These now use the shared compact
 * public-ID scheme (`<PREFIX><YY><LETTERS><NNN>`, see ./public-id.ts) so every
 * auto-generated reference shares one atomic, collision-free, per-year series.
 */

/** A short public company reference, e.g. "CMP26A001". */
export const companyCode = (db: Prisma.TransactionClient): Promise<string> =>
  nextPublicId(db, PublicIdPrefix.COMPANY);

/** A short public driver reference, e.g. "DRV26A001". */
export const driverCode = (db: Prisma.TransactionClient): Promise<string> =>
  nextPublicId(db, PublicIdPrefix.DRIVER);

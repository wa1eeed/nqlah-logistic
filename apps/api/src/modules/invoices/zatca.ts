import type { Prisma } from '../../generated/prisma';

/**
 * ZATCA (Fatoora) Phase-1 QR payload: base64 of the TLV (Tag-Length-Value)
 * encoding of the five mandatory fields. The client renders this string as a
 * QR code on the tax invoice.
 *
 *   1 → seller name
 *   2 → seller VAT registration number
 *   3 → invoice timestamp (ISO-8601)
 *   4 → invoice total (with VAT)
 *   5 → VAT total
 */
export function zatcaQrBase64(fields: {
  sellerName: string;
  vatNumber: string;
  timestamp: Date;
  total: number;
  vatTotal: number;
}): string {
  const tlv = (tag: number, value: string): Buffer => {
    const v = Buffer.from(value, 'utf8');
    // Phase-1 values are short (names/numbers/amounts), so a single length byte
    // is sufficient; clamp defensively.
    return Buffer.concat([Buffer.from([tag, Math.min(v.length, 255)]), v]);
  };
  return Buffer.concat([
    tlv(1, fields.sellerName || '—'),
    tlv(2, fields.vatNumber || ''),
    tlv(3, fields.timestamp.toISOString()),
    tlv(4, fields.total.toFixed(2)),
    tlv(5, fields.vatTotal.toFixed(2)),
  ]).toString('base64');
}

/**
 * Next sequential invoice number `INV-<year>-<6 digits>`, drawn from a Postgres
 * sequence so numbers are monotonic and unique (ZATCA requires a sequential
 * series) even under concurrent issuance.
 */
export async function nextInvoiceNumber(
  tx: Prisma.TransactionClient,
): Promise<string> {
  const rows = await tx.$queryRaw<
    { nextval: bigint }[]
  >`SELECT nextval('invoice_number_seq') AS nextval`;
  const n = Number(rows[0].nextval);
  const year = new Date().getFullYear();
  return `INV-${year}-${String(n).padStart(6, '0')}`;
}

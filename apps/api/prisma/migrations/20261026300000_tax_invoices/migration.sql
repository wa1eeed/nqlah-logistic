-- Phase 2b: VAT-compliant tax invoices.
-- Two invoices per order (carrier SERVICE invoice + platform COMMISSION
-- invoice[s]); immutable ZATCA party snapshots; nullable parties so the
-- platform (no Company row) can be a party on commission invoices.

-- Invoice kind.
CREATE TYPE "InvoiceKind" AS ENUM ('SERVICE', 'COMMISSION');
ALTER TABLE "Invoice" ADD COLUMN "kind" "InvoiceKind" NOT NULL DEFAULT 'SERVICE';

-- Allow two invoices per order.
DROP INDEX IF EXISTS "Invoice_orderId_key";

-- Parties become optional (platform is a party with no Company row).
ALTER TABLE "Invoice" ALTER COLUMN "issuerId" DROP NOT NULL;
ALTER TABLE "Invoice" ALTER COLUMN "receiverId" DROP NOT NULL;

-- Immutable ZATCA party snapshots.
ALTER TABLE "Invoice"
  ADD COLUMN "sellerName" TEXT,
  ADD COLUMN "sellerVatNumber" TEXT,
  ADD COLUMN "sellerCrNumber" TEXT,
  ADD COLUMN "buyerName" TEXT,
  ADD COLUMN "buyerVatNumber" TEXT,
  ADD COLUMN "buyerCrNumber" TEXT;

-- Lookup indexes.
CREATE INDEX "Invoice_orderId_idx" ON "Invoice"("orderId");
CREATE INDEX "Invoice_issuerId_idx" ON "Invoice"("issuerId");
CREATE INDEX "Invoice_receiverId_idx" ON "Invoice"("receiverId");

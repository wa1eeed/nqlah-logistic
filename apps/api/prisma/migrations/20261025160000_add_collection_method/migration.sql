-- Collection (payment) method per order + COD settlement fields.
-- Additive; defaults reproduce today's escrow behavior.

ALTER TABLE "Order"   ADD COLUMN "collectionMethod" TEXT NOT NULL DEFAULT 'ESCROW';

ALTER TABLE "Payment" ADD COLUMN "collectionMethod" TEXT NOT NULL DEFAULT 'ESCROW';
ALTER TABLE "Payment" ADD COLUMN "dueOnDelivery" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "Payment" ADD COLUMN "collectedAt" TIMESTAMP(3);

-- Phase 2: each consolidated-order leg can be served by its own carrier, with its
-- own lifecycle status, financial split and settlement.
ALTER TABLE "OrderLeg"
  ADD COLUMN "carrierId" TEXT,
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "commissionAmount" DECIMAL(12,2),
  ADD COLUMN "carrierAmount" DECIMAL(12,2),
  ADD COLUMN "settledAt" TIMESTAMP(3);

CREATE INDEX "OrderLeg_carrierId_idx" ON "OrderLeg"("carrierId");

ALTER TABLE "OrderLeg" ADD CONSTRAINT "OrderLeg_carrierId_fkey"
  FOREIGN KEY ("carrierId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

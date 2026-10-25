-- Sub-tenancy: a CLIENT company may be owned by a carrier. Additive + nullable;
-- existing platform clients keep ownerCarrierId = NULL (no change).
ALTER TABLE "Company" ADD COLUMN "ownerCarrierId" TEXT;

ALTER TABLE "Company" ADD CONSTRAINT "Company_ownerCarrierId_fkey"
  FOREIGN KEY ("ownerCarrierId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Company_ownerCarrierId_idx" ON "Company"("ownerCarrierId");

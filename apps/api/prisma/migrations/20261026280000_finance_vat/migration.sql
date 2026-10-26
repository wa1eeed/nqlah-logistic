-- Phase 2: VAT registration + the VAT breakdown on orders/legs (service VAT,
-- commission VAT, client total due).
ALTER TABLE "Company" ADD COLUMN "vatRegistered" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Order"
  ADD COLUMN "serviceVatAmount" DECIMAL(12,2),
  ADD COLUMN "commissionVatAmount" DECIMAL(12,2),
  ADD COLUMN "clientTotalDue" DECIMAL(12,2);

ALTER TABLE "OrderLeg"
  ADD COLUMN "serviceVatAmount" DECIMAL(12,2),
  ADD COLUMN "commissionVatAmount" DECIMAL(12,2);

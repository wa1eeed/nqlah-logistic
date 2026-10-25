-- Per-group module defaults (set by the admin): sourcing, pricing and collection.
-- `enforceCollectionMethod` locks the collection method so the client cannot override it.
ALTER TABLE "PolicyGroup"
  ADD COLUMN "defaultAssignment" TEXT,
  ADD COLUMN "defaultPricing" TEXT,
  ADD COLUMN "defaultCollectionMethod" TEXT,
  ADD COLUMN "enforceCollectionMethod" BOOLEAN NOT NULL DEFAULT false;

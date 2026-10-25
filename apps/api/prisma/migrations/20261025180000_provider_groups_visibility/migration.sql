-- Provider (carrier) groups + client→provider visibility scope.
-- Additive; defaults ("ALL") reproduce today's open marketplace.

ALTER TABLE "PolicyGroup" ADD COLUMN "visibilityScope" TEXT NOT NULL DEFAULT 'ALL';
ALTER TABLE "PolicyGroup" ADD COLUMN "visibleCarrierGroupId" TEXT;

-- CreateTable
CREATE TABLE "CarrierGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "carrierIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarrierGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PolicyGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "allowMarket" BOOLEAN NOT NULL DEFAULT true,
    "allowDirect" BOOLEAN NOT NULL DEFAULT true,
    "forcedCarrierId" TEXT,
    "allowMarketPricing" BOOLEAN NOT NULL DEFAULT true,
    "allowFixedPricing" BOOLEAN NOT NULL DEFAULT true,
    "allowPrepaid" BOOLEAN NOT NULL DEFAULT true,
    "allowCOD" BOOLEAN NOT NULL DEFAULT true,
    "clientIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PolicyGroup_pkey" PRIMARY KEY ("id")
);

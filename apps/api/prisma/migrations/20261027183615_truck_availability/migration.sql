-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_issuerId_fkey";

-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_receiverId_fkey";

-- DropIndex
DROP INDEX "Company_ownerCarrierId_idx";

-- AlterTable
ALTER TABLE "OrderTruck" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "TruckAvailability" (
    "id" TEXT NOT NULL,
    "truckId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "originCity" TEXT NOT NULL,
    "originRegion" TEXT NOT NULL,
    "destCity" TEXT,
    "destRegion" TEXT,
    "availableFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "availableTo" TIMESTAMP(3),
    "pricePerTrip" DECIMAL(12,2),
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TruckAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TruckAvailability_truckId_key" ON "TruckAvailability"("truckId");

-- CreateIndex
CREATE INDEX "TruckAvailability_active_originCity_idx" ON "TruckAvailability"("active", "originCity");

-- CreateIndex
CREATE INDEX "TruckAvailability_companyId_idx" ON "TruckAvailability"("companyId");

-- AddForeignKey
ALTER TABLE "TruckAvailability" ADD CONSTRAINT "TruckAvailability_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TruckAvailability" ADD CONSTRAINT "TruckAvailability_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_issuerId_fkey" FOREIGN KEY ("issuerId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

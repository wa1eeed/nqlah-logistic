-- CreateEnum
CREATE TYPE "MaintenanceType" AS ENUM ('OIL_CHANGE', 'BRAKES', 'TIRES', 'INSPECTION', 'INSURANCE', 'REPAIR', 'OTHER');

-- AlterTable
ALTER TABLE "Truck" ADD COLUMN     "inspectionExpiry" TIMESTAMP(3),
ADD COLUMN     "insuranceExpiry" TIMESTAMP(3),
ADD COLUMN     "lastServiceKm" INTEGER,
ADD COLUMN     "odometerKm" INTEGER,
ADD COLUMN     "oilIntervalKm" INTEGER DEFAULT 15000,
ADD COLUMN     "tiresChangedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "MaintenanceRecord" (
    "id" TEXT NOT NULL,
    "truckId" TEXT NOT NULL,
    "type" "MaintenanceType" NOT NULL,
    "title" TEXT NOT NULL,
    "cost" DOUBLE PRECISION,
    "odometerKm" INTEGER,
    "workshop" TEXT,
    "notes" TEXT,
    "nextDueDate" TIMESTAMP(3),
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaintenanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MaintenanceRecord_truckId_idx" ON "MaintenanceRecord"("truckId");

-- AddForeignKey
ALTER TABLE "MaintenanceRecord" ADD CONSTRAINT "MaintenanceRecord_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck"("id") ON DELETE CASCADE ON UPDATE CASCADE;

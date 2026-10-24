-- AlterTable: consolidated order fields
ALTER TABLE "Order" ADD COLUMN "orderType" TEXT NOT NULL DEFAULT 'SINGLE';
ALTER TABLE "Order" ADD COLUMN "truckCount" INTEGER;

-- AlterTable: OrderTruck becomes a leg (status, driver, sequence)
ALTER TABLE "OrderTruck" ADD COLUMN "driverId" TEXT;
ALTER TABLE "OrderTruck" ADD COLUMN "sequence" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "OrderTruck" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ASSIGNED';
ALTER TABLE "OrderTruck" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX "OrderTruck_orderId_sequence_key" ON "OrderTruck"("orderId", "sequence");

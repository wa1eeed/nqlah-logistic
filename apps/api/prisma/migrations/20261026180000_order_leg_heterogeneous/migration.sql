-- Per-leg spec for heterogeneous consolidated orders: each leg may have its own
-- truck type, destination and price (origin/client/invoice stay shared).
CREATE TABLE "OrderLeg" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "reference" TEXT,
    "requiredTruckType" "TruckType" NOT NULL,
    "destinationCity" TEXT NOT NULL,
    "destinationRegion" TEXT NOT NULL,
    "destinationAddress" TEXT NOT NULL,
    "destinationLat" DOUBLE PRECISION,
    "destinationLng" DOUBLE PRECISION,
    "price" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderLeg_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrderLeg_orderId_sequence_key" ON "OrderLeg"("orderId", "sequence");
CREATE INDEX "OrderLeg_orderId_idx" ON "OrderLeg"("orderId");

ALTER TABLE "OrderLeg" ADD CONSTRAINT "OrderLeg_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

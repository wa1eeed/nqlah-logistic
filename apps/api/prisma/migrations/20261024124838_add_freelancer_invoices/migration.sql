-- CreateEnum
CREATE TYPE "FreelancerInvoiceStatus" AS ENUM ('DUE', 'PAID');

-- CreateTable
CREATE TABLE "FreelancerInvoice" (
    "id" TEXT NOT NULL,
    "carrierId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "truckId" TEXT NOT NULL,
    "driverId" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "orderRevenue" DOUBLE PRECISION,
    "status" "FreelancerInvoiceStatus" NOT NULL DEFAULT 'DUE',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FreelancerInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FreelancerInvoice_carrierId_status_idx" ON "FreelancerInvoice"("carrierId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "FreelancerInvoice_carrierId_orderId_truckId_key" ON "FreelancerInvoice"("carrierId", "orderId", "truckId");

-- AddForeignKey
ALTER TABLE "FreelancerInvoice" ADD CONSTRAINT "FreelancerInvoice_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

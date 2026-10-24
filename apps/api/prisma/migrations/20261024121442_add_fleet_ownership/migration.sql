-- CreateEnum
CREATE TYPE "FleetOwnership" AS ENUM ('OWNED', 'FREELANCER');

-- AlterTable
ALTER TABLE "DriverProfile" ADD COLUMN     "ownership" "FleetOwnership" NOT NULL DEFAULT 'OWNED';

-- AlterTable
ALTER TABLE "Truck" ADD COLUMN     "ownership" "FleetOwnership" NOT NULL DEFAULT 'OWNED';

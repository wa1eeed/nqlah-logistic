-- CreateEnum
CREATE TYPE "TruckStatus" AS ENUM ('AVAILABLE', 'ON_TRIP', 'MAINTENANCE', 'OFF_DUTY');

-- AlterTable
ALTER TABLE "Truck" ADD COLUMN     "status" "TruckStatus" NOT NULL DEFAULT 'AVAILABLE';

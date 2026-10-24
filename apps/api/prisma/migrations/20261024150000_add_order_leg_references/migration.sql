-- AlterTable
ALTER TABLE "Order" ADD COLUMN "legReferences" TEXT[] DEFAULT ARRAY[]::TEXT[];

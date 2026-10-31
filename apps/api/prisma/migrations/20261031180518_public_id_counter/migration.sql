-- CreateTable: atomic per-(type, year) counter for the compact public-ID scheme
CREATE TABLE "PublicIdCounter" (
    "type" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "value" BIGINT NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicIdCounter_pkey" PRIMARY KEY ("type", "year")
);

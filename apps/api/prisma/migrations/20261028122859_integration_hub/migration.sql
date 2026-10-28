-- CreateTable
CREATE TABLE "Integration" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "provider" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "status" TEXT NOT NULL DEFAULT 'unknown',
    "statusNote" TEXT,
    "lastTestedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Integration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Integration_domain_key" ON "Integration"("domain");

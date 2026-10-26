-- Subscription plans: dynamic pricing (base + priced modules), a module catalog,
-- and the per-company subscription lifecycle. Payment is modelled but not charged.

-- ── Plan: pricing fields ──
ALTER TABLE "Plan"
  ADD COLUMN "isFree" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "basePrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN "billingCycle" TEXT NOT NULL DEFAULT 'MONTHLY',
  ADD COLUMN "yearlyDiscountPct" DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN "includedTruckLimit" INTEGER,
  ADD COLUMN "trialDays" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- ── PlanModule: priced capability catalog ──
CREATE TABLE "PlanModule" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "nameEn" TEXT,
  "description" TEXT,
  "audience" TEXT NOT NULL DEFAULT 'CARRIER',
  "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlanModule_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PlanModule_key_key" ON "PlanModule"("key");
CREATE INDEX "PlanModule_audience_active_idx" ON "PlanModule"("audience", "active");

-- ── PlanModuleLink: which modules a plan includes ──
CREATE TABLE "PlanModuleLink" (
  "planId" TEXT NOT NULL,
  "moduleId" TEXT NOT NULL,
  CONSTRAINT "PlanModuleLink_pkey" PRIMARY KEY ("planId", "moduleId")
);
CREATE INDEX "PlanModuleLink_moduleId_idx" ON "PlanModuleLink"("moduleId");
ALTER TABLE "PlanModuleLink" ADD CONSTRAINT "PlanModuleLink_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlanModuleLink" ADD CONSTRAINT "PlanModuleLink_moduleId_fkey"
  FOREIGN KEY ("moduleId") REFERENCES "PlanModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Subscription: per-company recurring membership ──
CREATE TABLE "Subscription" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "billingCycle" TEXT NOT NULL DEFAULT 'MONTHLY',
  "priceSnapshot" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "currentPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "currentPeriodEnd" TIMESTAMP(3),
  "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
  "trialEndsAt" TIMESTAMP(3),
  "canceledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Subscription_companyId_key" ON "Subscription"("companyId");
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");
CREATE INDEX "Subscription_planId_idx" ON "Subscription"("planId");
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Existing plans were created before pricing existed → keep them free.
UPDATE "Plan" SET "isFree" = true WHERE "basePrice" = 0;

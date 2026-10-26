-- Workflow & Policy Engine — phase 1: a capability layer on the policy profile
-- (feature flags/limits + commission config) and a Plan (membership) that wraps it.

-- Capability layer + commission config on PolicyGroup (Policy Profile)
ALTER TABLE "PolicyGroup"
  ADD COLUMN "features" JSONB,
  ADD COLUMN "commissionRate" DECIMAL(5,4),
  ADD COLUMN "commissionAppliesTo" TEXT,
  ADD COLUMN "priceVatInclusive" BOOLEAN NOT NULL DEFAULT false;

-- Plan (membership) → references a profile
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "description" TEXT,
    "tier" TEXT,
    "audience" TEXT NOT NULL DEFAULT 'BOTH',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "policyGroupId" TEXT NOT NULL,
    "commissionRateOverride" DECIMAL(5,4),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Plan_audience_active_idx" ON "Plan"("audience", "active");
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_policyGroupId_fkey"
    FOREIGN KEY ("policyGroupId") REFERENCES "PolicyGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Company → Plan
ALTER TABLE "Company" ADD COLUMN "planId" TEXT;
ALTER TABLE "Company" ADD CONSTRAINT "Company_planId_fkey"
    FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Company entity type: a registered business (COMPANY) or a sole operator
-- (INDIVIDUAL). Additive; existing rows default to COMPANY (no behavior change).
CREATE TYPE "CompanyEntityType" AS ENUM ('COMPANY', 'INDIVIDUAL');
ALTER TABLE "Company" ADD COLUMN "entityType" "CompanyEntityType" NOT NULL DEFAULT 'COMPANY';

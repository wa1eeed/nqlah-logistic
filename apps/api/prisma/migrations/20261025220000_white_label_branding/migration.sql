-- White-label branding on carrier companies. Additive; defaults keep every
-- company on the Naqla brand (whiteLabelEnabled = false).
ALTER TABLE "Company" ADD COLUMN "whiteLabelEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Company" ADD COLUMN "brandName" TEXT;
ALTER TABLE "Company" ADD COLUMN "brandLogo" TEXT;
ALTER TABLE "Company" ADD COLUMN "brandColor" TEXT;

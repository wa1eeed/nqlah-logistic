-- Add nationality (ISO alpha-2) + identity-document type to DriverProfile.
ALTER TABLE "DriverProfile" ADD COLUMN "nationality" TEXT;
ALTER TABLE "DriverProfile" ADD COLUMN "idType" TEXT;

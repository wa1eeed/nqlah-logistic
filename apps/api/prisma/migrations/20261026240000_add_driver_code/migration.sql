-- Short public driver reference. Add the column, backfill existing rows with a
-- deterministic short code derived from the id, then enforce uniqueness.
ALTER TABLE "DriverProfile" ADD COLUMN "code" TEXT;

UPDATE "DriverProfile"
SET "code" = 'DR-' || upper(substr(md5("id"), 1, 6))
WHERE "code" IS NULL;

CREATE UNIQUE INDEX "DriverProfile_code_key" ON "DriverProfile"("code");

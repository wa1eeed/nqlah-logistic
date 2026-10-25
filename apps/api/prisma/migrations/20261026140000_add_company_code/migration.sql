-- Short public company reference. Add the column, backfill existing rows with a
-- deterministic short code derived from the id, then enforce uniqueness.
ALTER TABLE "Company" ADD COLUMN "code" TEXT;

UPDATE "Company"
SET "code" = 'NQ-' || upper(substr(md5("id"), 1, 6))
WHERE "code" IS NULL;

CREATE UNIQUE INDEX "Company_code_key" ON "Company"("code");

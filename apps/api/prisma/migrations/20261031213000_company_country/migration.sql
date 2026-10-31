-- Company base country (ISO-3166 alpha-2), set from the registration
-- country -> region -> city cascade. Nullable: existing companies keep NULL.
ALTER TABLE "Company" ADD COLUMN "country" TEXT;

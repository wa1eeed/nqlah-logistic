-- Carrier COD collection preference + bank details (shown to clients as COD
-- payment instructions), and the client's bank-transfer proof on the payment.
ALTER TABLE "Company" ADD COLUMN "codPayoutMethod" TEXT NOT NULL DEFAULT 'CASH';
ALTER TABLE "Company" ADD COLUMN "iban" TEXT;
ALTER TABLE "Company" ADD COLUMN "bankName" TEXT;
ALTER TABLE "Company" ADD COLUMN "bankAccountName" TEXT;
ALTER TABLE "Payment" ADD COLUMN "codProofUrl" TEXT;

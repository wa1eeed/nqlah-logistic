-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "zatcaQr" TEXT;

-- Sequential ZATCA invoice numbers (monotonic, unique).
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1001;

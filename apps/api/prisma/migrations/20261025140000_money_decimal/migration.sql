-- Money as exact Decimal. Monetary columns move from double precision (Float)
-- to NUMERIC/DECIMAL(12,2); commissionRate (a 0..1 rate) to DECIMAL(5,4).
-- Non-money numerics (weights, volumes, dimensions, lat/lng, ratings, speed)
-- stay double precision. Postgres casts existing values implicitly.

-- Company
ALTER TABLE "Company" ALTER COLUMN "commissionRate" SET DATA TYPE DECIMAL(5,4);
ALTER TABLE "Company" ALTER COLUMN "creditLimit"    SET DATA TYPE DECIMAL(12,2);
ALTER TABLE "Company" ALTER COLUMN "walletBalance"  SET DATA TYPE DECIMAL(12,2);

-- Order
ALTER TABLE "Order" ALTER COLUMN "clientBudget"     SET DATA TYPE DECIMAL(12,2);
ALTER TABLE "Order" ALTER COLUMN "agreedPrice"      SET DATA TYPE DECIMAL(12,2);
ALTER TABLE "Order" ALTER COLUMN "commissionAmount" SET DATA TYPE DECIMAL(12,2);
ALTER TABLE "Order" ALTER COLUMN "carrierAmount"    SET DATA TYPE DECIMAL(12,2);

-- Bid
ALTER TABLE "Bid" ALTER COLUMN "amount" SET DATA TYPE DECIMAL(12,2);

-- Payment
ALTER TABLE "Payment" ALTER COLUMN "totalAmount"      SET DATA TYPE DECIMAL(12,2);
ALTER TABLE "Payment" ALTER COLUMN "commissionAmount" SET DATA TYPE DECIMAL(12,2);
ALTER TABLE "Payment" ALTER COLUMN "carrierAmount"    SET DATA TYPE DECIMAL(12,2);

-- Transaction (wallet ledger)
ALTER TABLE "Transaction" ALTER COLUMN "amount"  SET DATA TYPE DECIMAL(12,2);
ALTER TABLE "Transaction" ALTER COLUMN "balance" SET DATA TYPE DECIMAL(12,2);

-- Invoice
ALTER TABLE "Invoice" ALTER COLUMN "amount"      SET DATA TYPE DECIMAL(12,2);
ALTER TABLE "Invoice" ALTER COLUMN "vatAmount"   SET DATA TYPE DECIMAL(12,2);
ALTER TABLE "Invoice" ALTER COLUMN "totalAmount" SET DATA TYPE DECIMAL(12,2);

-- FreelancerInvoice
ALTER TABLE "FreelancerInvoice" ALTER COLUMN "amount"       SET DATA TYPE DECIMAL(12,2);
ALTER TABLE "FreelancerInvoice" ALTER COLUMN "orderRevenue" SET DATA TYPE DECIMAL(12,2);

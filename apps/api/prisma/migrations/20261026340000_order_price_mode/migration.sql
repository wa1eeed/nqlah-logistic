-- Decouple pricing from assignment: an explicit price mode on the order.
-- BIDDING (مناقصة) = carriers propose a price; FIXED = the client sets it and
-- carriers accept. Existing orders keep the historical bidding behaviour.
ALTER TABLE "Order" ADD COLUMN "priceMode" TEXT NOT NULL DEFAULT 'BIDDING';

-- Backfill: orders that already carry an agreed price but no accepted carrier
-- while still open were fixed-price in spirit; leave historical rows as BIDDING
-- (safe default) — the column only drives NEW orders' flow.

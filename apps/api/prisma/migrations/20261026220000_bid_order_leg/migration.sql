-- Phase 2b: a bid may target a specific leg (per-leg marketplace). A carrier may
-- bid on several legs of one order, so the old (orderId, carrierId) unique is
-- replaced by two PARTIAL unique indexes: order-level bids (orderLegId IS NULL)
-- stay one per (order, carrier); leg-level bids are one per (leg, carrier).
ALTER TABLE "Bid" ADD COLUMN "orderLegId" TEXT;

ALTER TABLE "Bid" ADD CONSTRAINT "Bid_orderLegId_fkey"
  FOREIGN KEY ("orderLegId") REFERENCES "OrderLeg"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DROP INDEX IF EXISTS "Bid_orderId_carrierId_key";

CREATE UNIQUE INDEX "Bid_order_carrier_unique"
  ON "Bid"("orderId", "carrierId") WHERE "orderLegId" IS NULL;
CREATE UNIQUE INDEX "Bid_leg_carrier_unique"
  ON "Bid"("orderLegId", "carrierId") WHERE "orderLegId" IS NOT NULL;

CREATE INDEX "Bid_orderId_carrierId_idx" ON "Bid"("orderId", "carrierId");
CREATE INDEX "Bid_orderLegId_status_idx" ON "Bid"("orderLegId", "status");
